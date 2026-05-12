import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const IMAP_HOST = "imap.purelymail.com";
const IMAP_PORT = 993;
const SMTP_HOST = "smtp.purelymail.com";
const SMTP_PORT = 465;

// Simple IMAP client for Deno TLS
class SimpleImapClient {
  private conn: Deno.TlsConn | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private buffer = "";
  private tagCounter = 0;

  async connect(): Promise<void> {
    this.conn = await Deno.connectTls({ hostname: IMAP_HOST, port: IMAP_PORT });
    this.reader = this.conn.readable.getReader();
    await this.readLine(); // greeting
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

  private async sendCommand(command: string): Promise<{ status: string; data: string[] }> {
    const tag = `A${++this.tagCounter}`;
    const fullCommand = `${tag} ${command}\r\n`;
    const writer = this.conn!.writable.getWriter();
    await writer.write(new TextEncoder().encode(fullCommand));
    writer.releaseLock();

    const data: string[] = [];
    let status = "";
    while (true) {
      const line = await this.readLine();
      if (line.startsWith(tag)) {
        status = line.substring(tag.length + 1).split(" ")[0];
        break;
      } else if (line.startsWith("*")) {
        data.push(line);
      }
    }
    return { status, data };
  }

  async login(user: string, pass: string): Promise<boolean> {
    const res = await this.sendCommand(`LOGIN "${user}" "${pass}"`);
    return res.status === "OK";
  }

  async select(mailbox: string): Promise<{ exists: number }> {
    const res = await this.sendCommand(`SELECT "${mailbox}"`);
    let exists = 0;
    for (const line of res.data) {
      const match = line.match(/\* (\d+) EXISTS/);
      if (match) exists = parseInt(match[1]);
    }
    return { exists };
  }

  async search(criteria: string): Promise<number[]> {
    const res = await this.sendCommand(`SEARCH ${criteria}`);
    const searchLine = res.data.find(line => line.includes("SEARCH"));
    if (!searchLine) return [];
    const parts = searchLine.split(" ").slice(2);
    return parts.map(n => parseInt(n, 10)).filter(n => !isNaN(n));
  }

  async fetchHeaders(uid: number): Promise<{ subject: string; from: string; date: string; to: string }> {
    const res = await this.sendCommand(`FETCH ${uid} (ENVELOPE)`);
    const joined = res.data.join("\n");

    let subject = "(No Subject)";
    const subjectMatch = joined.match(/ENVELOPE \("[^"]*" "([^"]*)"/);
    if (subjectMatch) subject = subjectMatch[1];

    let from = "unknown";
    let fromName = "";
    const fromMatch = joined.match(/\(\("([^"]*)" NIL "([^"]*)" "([^"]*)"\)\)/);
    if (fromMatch) {
      fromName = fromMatch[1] || fromMatch[2];
      from = `${fromMatch[2]}@${fromMatch[3]}`;
    }

    let date = new Date().toISOString();
    const dateMatch = joined.match(/ENVELOPE \("([^"]*)"/);
    if (dateMatch) {
      try { date = new Date(dateMatch[1]).toISOString(); } catch { /* keep default */ }
    }

    return { subject, from: fromName ? `${fromName} <${from}>` : from, date, to: "" };
  }

  async fetchBody(uid: number): Promise<string> {
    const res = await this.sendCommand(`FETCH ${uid} (BODY[TEXT])`);
    const joined = res.data.join("\n");
    const bodyStart = joined.indexOf("}");
    if (bodyStart === -1) return "";
    return joined.substring(bodyStart + 1).trim().slice(0, 10000);
  }

  async store(uid: number, flags: string): Promise<void> {
    await this.sendCommand(`STORE ${uid} +FLAGS (${flags})`);
  }

  async logout(): Promise<void> {
    try {
      await this.sendCommand("LOGOUT");
      this.conn?.close();
    } catch { /* ignore */ }
  }
}

// Simple SMTP send via TLS
async function sendViaSMTP(email: string, password: string, to: string, subject: string, body: string, cc?: string): Promise<void> {
  const conn = await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT });
  const reader = conn.readable.getReader();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    let buf = "";
    while (!buf.includes("\r\n")) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value);
    }
    return buf.trim();
  }

  async function send(cmd: string): Promise<string> {
    const writer = conn.writable.getWriter();
    await writer.write(new TextEncoder().encode(cmd + "\r\n"));
    writer.releaseLock();
    return await readResponse();
  }

  await readResponse(); // greeting
  await send(`EHLO backoffice`);

  // AUTH LOGIN
  await send("AUTH LOGIN");
  await send(btoa(email));
  await send(btoa(password));

  await send(`MAIL FROM:<${email}>`);
  await send(`RCPT TO:<${to}>`);
  if (cc) await send(`RCPT TO:<${cc}>`);
  await send("DATA");

  const message = [
    `From: ${email}`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : "",
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
    `Date: ${new Date().toUTCString()}`,
    "",
    body,
    ".",
  ].filter(Boolean).join("\r\n");

  const writer = conn.writable.getWriter();
  await writer.write(new TextEncoder().encode(message + "\r\n"));
  writer.releaseLock();
  await readResponse();

  await send("QUIT");
  conn.close();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify user
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    // Get user's Purelymail credentials
    const { data: emp } = await supabaseClient
      .from("employees")
      .select("company_email, purelymail_password")
      .eq("user_id", user.id)
      .single();

    if (!emp?.company_email || !emp?.purelymail_password) {
      return new Response(JSON.stringify({ error: "Purelymail credentials not configured. Ask admin to set your email password in User Management." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const imapEmail = emp.company_email;
    const imapPassword = emp.purelymail_password;

    const { action, ...params } = await req.json();
    let result: any;

    switch (action) {
      case "list_threads": {
        const client = new SimpleImapClient();
        await client.connect();
        const loginOk = await client.login(imapEmail, imapPassword);
        if (!loginOk) throw new Error("IMAP login failed — check your email password in User Management");

        const mailbox = params.mailbox || "INBOX";
        const { exists } = await client.select(mailbox);

        // Get recent messages
        const limit = params.limit || 20;
        const startUid = Math.max(1, exists - limit + 1);
        const ids = [];
        for (let i = exists; i >= startUid && ids.length < limit; i--) {
          ids.push(i);
        }

        const threads = [];
        for (const uid of ids) {
          try {
            const headers = await client.fetchHeaders(uid);
            threads.push({
              id: String(uid),
              snippet: "",
              subject: headers.subject,
              from: headers.from,
              to: headers.to,
              date: headers.date,
              messagesCount: 1,
              isUnread: false, // simplified
            });
          } catch { /* skip failed messages */ }
        }

        await client.logout();
        result = { threads, totalMessages: exists };
        break;
      }

      case "get_thread": {
        const client = new SimpleImapClient();
        await client.connect();
        await client.login(imapEmail, imapPassword);
        await client.select(params.mailbox || "INBOX");

        const uid = parseInt(params.threadId);
        const headers = await client.fetchHeaders(uid);
        const body = await client.fetchBody(uid);

        await client.logout();
        result = {
          id: params.threadId,
          messages: [{
            id: params.threadId,
            subject: headers.subject,
            from: headers.from,
            to: headers.to,
            date: headers.date,
            body,
            isUnread: false,
          }],
        };
        break;
      }

      case "send_email": {
        await sendViaSMTP(
          imapEmail,
          imapPassword,
          params.to,
          params.subject,
          params.body,
          params.cc
        );
        result = { success: true };
        break;
      }

      case "get_profile": {
        const client = new SimpleImapClient();
        await client.connect();
        const loginOk = await client.login(imapEmail, imapPassword);
        if (!loginOk) throw new Error("IMAP login failed");

        const { exists } = await client.select("INBOX");
        await client.logout();

        result = {
          emailAddress: imapEmail,
          messagesTotal: exists,
          threadsTotal: exists,
        };
        break;
      }

      case "trash_thread": {
        const client = new SimpleImapClient();
        await client.connect();
        await client.login(imapEmail, imapPassword);
        await client.select("INBOX");
        await client.store(parseInt(params.threadId), "\\Deleted");
        await client.logout();
        result = { success: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }
});
