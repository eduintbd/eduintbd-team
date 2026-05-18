// facebook-oauth-start
// Returns the FB authorize URL with a signed state token for one specific channel.
// Requires JWT — the caller (an authenticated employee) is bound to the state.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { signState } from "../_shared/fb-state.ts";

const FB_API_VERSION = "v22.0";

const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
].join(",");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const appId = Deno.env.get("FACEBOOK_APP_ID");
  if (!appId) return json({ error: "FACEBOOK_APP_ID not configured" }, 500);

  // verify_jwt=true means the platform already validated the JWT; we extract the user.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "missing_authorization" }, 401);

  const supa = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: userData, error: userErr } = await supa.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: "invalid_user" }, 401);

  let body: { channel_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!body.channel_id) return json({ error: "channel_id required" }, 400);

  // Verify the channel exists and is a facebook channel. RLS lets any authenticated user read.
  const { data: channel, error: chErr } = await supa
    .from("social_media_channels")
    .select("id, platform, channel_name")
    .eq("id", body.channel_id)
    .single();

  if (chErr || !channel) return json({ error: "channel_not_found" }, 404);
  if (channel.platform !== "facebook") return json({ error: "channel_not_facebook" }, 400);

  const state = await signState({
    channel_id: channel.id,
    user_id: userData.user.id,
    ttlSeconds: 600,
  });

  const supaUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const redirectUri = `${supaUrl}/functions/v1/facebook-oauth-callback`;

  const url = new URL(`https://www.facebook.com/${FB_API_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("auth_type", "rerequest");

  return json({ url: url.toString() });
});
