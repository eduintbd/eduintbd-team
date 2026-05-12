import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function getGoogleAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "";

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) throw new Error(`Failed to get token: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

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

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const { action, ...params } = await req.json();
    const accessToken = await getGoogleAccessToken();

    let result: any;

    switch (action) {
      case "list_threads": {
        const q = params.query || "";
        const maxResults = params.maxResults || 20;
        const pageToken = params.pageToken || "";
        let url = `${GMAIL_API}/threads?maxResults=${maxResults}`;
        if (q) url += `&q=${encodeURIComponent(q)}`;
        if (pageToken) url += `&pageToken=${pageToken}`;

        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = await res.json();

        // Fetch snippet for each thread
        const threads = [];
        for (const t of (data.threads || []).slice(0, maxResults)) {
          const threadRes = await fetch(
            `${GMAIL_API}/threads/${t.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=To`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const threadData = await threadRes.json();
          const firstMsg = threadData.messages?.[0];
          const headers = firstMsg?.payload?.headers || [];
          const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

          threads.push({
            id: t.id,
            snippet: t.snippet || threadData.snippet || "",
            subject: getHeader("Subject"),
            from: getHeader("From"),
            to: getHeader("To"),
            date: getHeader("Date"),
            messagesCount: threadData.messages?.length || 0,
            labelIds: firstMsg?.labelIds || [],
            isUnread: (firstMsg?.labelIds || []).includes("UNREAD"),
          });
        }

        result = { threads, nextPageToken: data.nextPageToken, resultSizeEstimate: data.resultSizeEstimate };
        break;
      }

      case "get_thread": {
        const res = await fetch(
          `${GMAIL_API}/threads/${params.threadId}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const thread = await res.json();

        const messages = (thread.messages || []).map((msg: any) => {
          const headers = msg.payload?.headers || [];
          const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

          // Extract body
          let body = "";
          const parts = msg.payload?.parts || [];
          if (parts.length > 0) {
            const htmlPart = parts.find((p: any) => p.mimeType === "text/html");
            const textPart = parts.find((p: any) => p.mimeType === "text/plain");
            const part = htmlPart || textPart;
            if (part?.body?.data) {
              body = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
            }
          } else if (msg.payload?.body?.data) {
            body = atob(msg.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
          }

          return {
            id: msg.id,
            subject: getHeader("Subject"),
            from: getHeader("From"),
            to: getHeader("To"),
            date: getHeader("Date"),
            body,
            labelIds: msg.labelIds || [],
            isUnread: (msg.labelIds || []).includes("UNREAD"),
          };
        });

        // Mark as read
        if (messages.some((m: any) => m.isUnread)) {
          await fetch(`${GMAIL_API}/threads/${params.threadId}/modify`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
          });
        }

        result = { id: thread.id, messages };
        break;
      }

      case "send_email": {
        const email = [
          `To: ${params.to}`,
          `Subject: ${params.subject}`,
          `Content-Type: text/html; charset=utf-8`,
          params.cc ? `Cc: ${params.cc}` : "",
          params.inReplyTo ? `In-Reply-To: ${params.inReplyTo}` : "",
          params.references ? `References: ${params.references}` : "",
          "",
          params.body,
        ].filter(Boolean).join("\r\n");

        const encoded = btoa(unescape(encodeURIComponent(email)))
          .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

        let url = `${GMAIL_API}/messages/send`;
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ raw: encoded, threadId: params.threadId }),
        });
        result = await res.json();
        break;
      }

      case "create_draft": {
        const email = [
          `To: ${params.to || ""}`,
          `Subject: ${params.subject || ""}`,
          `Content-Type: text/html; charset=utf-8`,
          "",
          params.body || "",
        ].join("\r\n");

        const encoded = btoa(unescape(encodeURIComponent(email)))
          .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

        const res = await fetch(`${GMAIL_API}/drafts`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ message: { raw: encoded, threadId: params.threadId } }),
        });
        result = await res.json();
        break;
      }

      case "list_labels": {
        const res = await fetch(`${GMAIL_API}/labels`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        result = await res.json();
        break;
      }

      case "trash_thread": {
        await fetch(`${GMAIL_API}/threads/${params.threadId}/trash`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        result = { success: true };
        break;
      }

      case "archive_thread": {
        await fetch(`${GMAIL_API}/threads/${params.threadId}/modify`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ removeLabelIds: ["INBOX"] }),
        });
        result = { success: true };
        break;
      }

      case "get_profile": {
        const res = await fetch(`${GMAIL_API}/profile`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        result = await res.json();
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
