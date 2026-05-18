// facebook-oauth-callback
// Handles the redirect from Facebook with ?code and ?state.
// 1. Verify state signature
// 2. Exchange code -> short-lived user token -> long-lived user token
// 3. Fetch user's Pages and their long-lived page tokens
// 4. Pick the right page (single page OR matched by channel_handle)
// 5. Upsert into social_media_channel_secrets via service role
// 6. Render an HTML page that auto-closes the popup
//
// This endpoint is configured with verify_jwt=false because Facebook calls it
// without our JWT. State signature is the auth.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { verifyState } from "../_shared/fb-state.ts";

const FB_API_VERSION = "v22.0";
const FB = `https://graph.facebook.com/${FB_API_VERSION}`;

interface FbPage {
  id: string;
  name: string;
  username?: string;
  access_token: string;
  category?: string;
  tasks?: string[];
}

const popupHtml = (kind: "success" | "error", message: string) => `<!doctype html>
<html><head><meta charset="utf-8"><title>Facebook ${kind}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 2rem; text-align: center; background: ${kind === "success" ? "#f0fdf4" : "#fef2f2"}; color: #111; }
  .icon { font-size: 3rem; }
  pre { background: rgba(0,0,0,0.05); padding: .75rem; border-radius: .5rem; text-align: left; white-space: pre-wrap; word-break: break-word; }
</style></head>
<body>
  <div class="icon">${kind === "success" ? "&#10003;" : "&#10005;"}</div>
  <h2>${kind === "success" ? "Connected to Facebook" : "Facebook connection failed"}</h2>
  <pre>${message.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] ?? c))}</pre>
  <p>You can close this window.</p>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({ type: "fb-oauth-${kind}" }, "*");
      }
    } catch (e) {}
    setTimeout(() => { try { window.close(); } catch (e) {} }, ${kind === "success" ? 1200 : 5000});
  </script>
</body></html>`;

const errorHtml = (msg: string) =>
  new Response(popupHtml("error", msg), { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });

const successHtml = (msg: string) =>
  new Response(popupHtml("success", msg), { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const fbError = url.searchParams.get("error");
  const fbErrorDesc = url.searchParams.get("error_description");

  if (fbError) {
    return errorHtml(`Facebook returned: ${fbError} - ${fbErrorDesc ?? ""}`);
  }
  if (!code || !stateRaw) {
    return errorHtml("Missing code or state. Did you cancel the consent screen?");
  }

  const state = await verifyState(stateRaw);
  if (!state) {
    return errorHtml("Invalid or expired state. Restart the Connect flow.");
  }

  const appId = Deno.env.get("FACEBOOK_APP_ID");
  const appSecret = Deno.env.get("FACEBOOK_APP_SECRET");
  if (!appId || !appSecret) {
    return errorHtml("Server misconfigured: FACEBOOK_APP_ID or FACEBOOK_APP_SECRET missing.");
  }

  const supaUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const redirectUri = `${supaUrl}/functions/v1/facebook-oauth-callback`;

  // Step 1: exchange code for a short-lived user token.
  let shortLived: { access_token: string; token_type?: string; expires_in?: number };
  try {
    const r = await fetch(
      `${FB}/oauth/access_token?` +
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        }),
    );
    if (!r.ok) {
      return errorHtml(`code exchange failed (${r.status}): ${await r.text()}`);
    }
    shortLived = await r.json();
  } catch (e) {
    return errorHtml(`code exchange error: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Step 2: exchange short-lived for long-lived user token (~60 days).
  let longLived: { access_token: string; token_type?: string; expires_in?: number };
  try {
    const r = await fetch(
      `${FB}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortLived.access_token,
        }),
    );
    if (!r.ok) {
      return errorHtml(`long-lived exchange failed (${r.status}): ${await r.text()}`);
    }
    longLived = await r.json();
  } catch (e) {
    return errorHtml(`long-lived exchange error: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Step 3: list pages and their (long-lived) page tokens.
  let pages: FbPage[];
  try {
    const r = await fetch(
      `${FB}/me/accounts?fields=id,name,username,access_token,category,tasks&access_token=${encodeURIComponent(longLived.access_token)}`,
    );
    if (!r.ok) {
      return errorHtml(`/me/accounts failed (${r.status}): ${await r.text()}`);
    }
    const body = await r.json();
    pages = body.data ?? [];
  } catch (e) {
    return errorHtml(`/me/accounts error: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (pages.length === 0) {
    return errorHtml("This Facebook user manages no Pages. Add a Page or use an account that admins one.");
  }

  // Step 4: load channel (service role — bypass RLS column-grant) and pick a page.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: channel, error: chErr } = await admin
    .from("social_media_channels")
    .select("id, channel_name, channel_handle, channel_url")
    .eq("id", state.channel_id)
    .single();

  if (chErr || !channel) return errorHtml(`channel ${state.channel_id} not found`);

  const handle = (channel.channel_handle ?? "").replace(/^@/, "").trim().toLowerCase();
  const urlHandle = (() => {
    try {
      const u = new URL(channel.channel_url ?? "");
      const seg = u.pathname.split("/").filter(Boolean)[0];
      return (seg ?? "").toLowerCase();
    } catch { return ""; }
  })();
  const nameLower = (channel.channel_name ?? "").trim().toLowerCase();

  const matchScore = (p: FbPage) => {
    const pu = (p.username ?? "").toLowerCase();
    const pn = p.name.toLowerCase();
    let s = 0;
    if (handle && pu === handle) s += 100;
    if (urlHandle && pu === urlHandle) s += 90;
    if (handle && pn === handle) s += 50;
    if (nameLower && pn === nameLower) s += 40;
    if (urlHandle && pn.includes(urlHandle)) s += 5;
    return s;
  };

  let picked: FbPage | null = null;
  if (pages.length === 1) {
    picked = pages[0];
  } else {
    const ranked = pages
      .map((p) => ({ p, s: matchScore(p) }))
      .sort((a, b) => b.s - a.s);
    if (ranked[0].s > 0 && (ranked.length === 1 || ranked[0].s > ranked[1].s)) {
      picked = ranked[0].p;
    }
  }

  if (!picked) {
    const list = pages.map((p) => `  - ${p.name}${p.username ? ` (@${p.username})` : ""}`).join("\n");
    return errorHtml(
      `This account manages multiple Pages. Set the channel's handle to one of the page usernames (without @), then click Connect again:\n\n${list}`,
    );
  }

  // Page tokens from /me/accounts when the user has a long-lived user token are themselves long-lived
  // (effectively non-expiring as long as the user token stays valid). expires_at is null for those.
  const expiresAt: string | null = null;

  const { error: upsertErr } = await admin
    .from("social_media_channel_secrets")
    .upsert(
      {
        channel_id: state.channel_id,
        provider: "facebook",
        external_account_id: picked.id,
        external_account_name: picked.name,
        connected_by: state.user_id,
        connected_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
        last_verify_error: null,
        expires_at: expiresAt,
        scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"],
        page_access_token: picked.access_token,
        user_access_token: longLived.access_token,
      },
      { onConflict: "channel_id" },
    );

  if (upsertErr) {
    return errorHtml(`Failed to save credentials: ${upsertErr.message}`);
  }

  return successHtml(`Connected to "${picked.name}"${picked.username ? ` (@${picked.username})` : ""}.`);
});
