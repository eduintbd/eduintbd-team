import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const imapEmail = Deno.env.get("PURELYMAIL_EMAIL")!;
const imapPassword = Deno.env.get("PURELYMAIL_PASSWORD")!;
const imapHost = Deno.env.get("PURELYMAIL_IMAP_HOST") || "imap.purelymail.com";

interface ImapResponse {
  tag: string;
  status: string;
  data: string[];
}

class SimpleImapClient {
  private conn: Deno.TlsConn | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private buffer = "";
  private tagCounter = 0;

  async connect(host: string, port: number): Promise<void> {
    this.conn = await Deno.connectTls({ hostname: host, port });
    this.reader = this.conn.readable.getReader();
    // Read greeting
    await this.readLine();
  }

  private async readLine(): Promise<string> {
    const decoder = new TextDecoder();
    while (!this.buffer.includes("\r\n")) {
      const { value, done } = await this.reader!.read();
      if (done) break;
      this.buffer += decoder.decode(value);
    }
    const lineEnd = this.buffer.indexOf("\r\n");
    const line = this.buffer.substring(0, lineEnd);
    this.buffer = this.buffer.substring(lineEnd + 2);
    return line;
  }

  private async sendCommand(command: string): Promise<ImapResponse> {
    const tag = `A${++this.tagCounter}`;
    const fullCommand = `${tag} ${command}\r\n`;
    const encoder = new TextEncoder();
    
    const writer = this.conn!.writable.getWriter();
    await writer.write(encoder.encode(fullCommand));
    writer.releaseLock();

    const data: string[] = [];
    let status = "";

    while (true) {
      const line = await this.readLine();
      if (line.startsWith(tag)) {
        const parts = line.substring(tag.length + 1).split(" ");
        status = parts[0];
        break;
      } else if (line.startsWith("*")) {
        data.push(line);
      }
    }

    return { tag, status, data };
  }

  async login(user: string, pass: string): Promise<boolean> {
    const response = await this.sendCommand(`LOGIN "${user}" "${pass}"`);
    return response.status === "OK";
  }

  async select(mailbox: string): Promise<ImapResponse> {
    return await this.sendCommand(`SELECT "${mailbox}"`);
  }

  async search(criteria: string): Promise<number[]> {
    const response = await this.sendCommand(`SEARCH ${criteria}`);
    const searchLine = response.data.find(line => line.includes("SEARCH"));
    if (!searchLine) return [];
    
    const parts = searchLine.split(" ").slice(2);
    return parts.map(n => parseInt(n, 10)).filter(n => !isNaN(n));
  }

  async fetch(uid: number, items: string): Promise<string[]> {
    const response = await this.sendCommand(`FETCH ${uid} ${items}`);
    return response.data;
  }

  async store(uid: number, flags: string): Promise<void> {
    await this.sendCommand(`STORE ${uid} +FLAGS (${flags})`);
  }

  async logout(): Promise<void> {
    await this.sendCommand("LOGOUT");
    this.conn?.close();
  }
}

function parseEnvelope(data: string[]): { subject: string; from: string; fromName: string; date: string } {
  const joinedData = data.join("\n");
  
  // Extract subject
  let subject = "(No Subject)";
  const subjectMatch = joinedData.match(/ENVELOPE \("[^"]*" "([^"]*)"/);
  if (subjectMatch) {
    subject = subjectMatch[1];
  }

  // Extract from
  let from = "unknown@external.com";
  let fromName = "Unknown";
  const fromMatch = joinedData.match(/\(\("([^"]*)" NIL "([^"]*)" "([^"]*)"\)\)/);
  if (fromMatch) {
    fromName = fromMatch[1] || fromMatch[2];
    from = `${fromMatch[2]}@${fromMatch[3]}`;
  }

  // Extract date
  let date = new Date().toISOString();
  const dateMatch = joinedData.match(/ENVELOPE \("([^"]*)"/);
  if (dateMatch) {
    try {
      date = new Date(dateMatch[1]).toISOString();
    } catch {
      date = new Date().toISOString();
    }
  }

  return { subject, from, fromName, date };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting PurelyMail IMAP fetch...");
    console.log(`Connecting to ${imapHost} as ${imapEmail}`);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const client = new SimpleImapClient();

    await client.connect(imapHost, 993);
    console.log("Connected to IMAP server");

    const loginOk = await client.login(imapEmail, imapPassword);
    if (!loginOk) {
      throw new Error("IMAP login failed");
    }
    console.log("Logged in successfully");

    await client.select("INBOX");
    console.log("Selected INBOX");

    const unseenIds = await client.search("UNSEEN");
    console.log(`Found ${unseenIds.length} unseen messages`);

    if (unseenIds.length === 0) {
      await client.logout();
      return new Response(
        JSON.stringify({ message: "No new messages", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get first employee to use as sender for external emails
    const { data: firstEmployee } = await supabase
      .from("employees")
      .select("id")
      .limit(1)
      .single();

    if (!firstEmployee) {
      await client.logout();
      throw new Error("No employee found to use as external message sender");
    }

    // Find the employee associated with the PurelyMail email
    const { data: recipientEmployee } = await supabase
      .from("employees")
      .select("id")
      .or(`email.eq.${imapEmail},company_email.eq.${imapEmail}`)
      .single();

    let importedCount = 0;
    const toProcess = unseenIds.slice(0, 20);

    for (const uid of toProcess) {
      try {
        const fetchData = await client.fetch(uid, "(ENVELOPE BODY.PEEK[TEXT])");
        const { subject, from, fromName, date } = parseEnvelope(fetchData);
        
        // Extract body text from fetch response
        let body = "";
        const bodyLine = fetchData.find(line => line.includes("BODY[TEXT]"));
        if (bodyLine) {
          const bodyStart = bodyLine.indexOf("}") + 1;
          body = bodyLine.substring(bodyStart).trim();
        }

        // Create internal message
        const { data: newMessage, error: msgError } = await supabase
          .from("internal_messages")
          .insert({
            sender_id: firstEmployee.id,
            subject: `[External] ${subject}`,
            body: `From: ${fromName} <${from}>\nDate: ${date}\n\n${body.substring(0, 10000)}`,
            is_read: false,
          })
          .select()
          .single();

        if (msgError) {
          console.error("Error inserting message:", msgError);
          continue;
        }

        // Add recipient if we found the employee
        if (recipientEmployee && newMessage) {
          await supabase
            .from("message_recipients")
            .insert({
              message_id: newMessage.id,
              recipient_id: recipientEmployee.id,
              recipient_type: "to",
              is_read: false,
            });
        }

        // Mark as seen
        await client.store(uid, "\\Seen");

        importedCount++;
        console.log(`Imported: ${subject}`);
      } catch (fetchErr) {
        console.error(`Error fetching message ${uid}:`, fetchErr);
      }
    }

    await client.logout();
    console.log(`Import complete. Imported ${importedCount} messages.`);

    return new Response(
      JSON.stringify({ 
        message: "Import complete", 
        count: importedCount,
        total_unseen: unseenIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in fetch-purelymail:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
