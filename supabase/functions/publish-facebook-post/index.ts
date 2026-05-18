// publish-facebook-post
// User-triggered ("Publish Now") endpoint. Authenticates the caller, then
// delegates to the shared publishing module which uses service role internally.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { publishPostToFacebookChannels } from "../_shared/publish-facebook.ts";

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

  const authHeader = req.headers.get("Authorization") ?? "";
  const userJwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!userJwt) return json({ error: "missing_authorization" }, 401);

  const supaUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const userClient = createClient(supaUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(userJwt);
  if (userErr || !userData.user) return json({ error: "invalid_user" }, 401);

  let body: { scheduled_post_id?: string; channel_ids?: string[] };
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  if (!body.scheduled_post_id) return json({ error: "scheduled_post_id required" }, 400);

  const admin = createClient(supaUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { results } = await publishPostToFacebookChannels(admin, body.scheduled_post_id, body.channel_ids);
    return json({
      scheduled_post_id: body.scheduled_post_id,
      results,
      summary: {
        total: results.length,
        success: results.filter((r) => r.status === "success").length,
        failed: results.filter((r) => r.status === "failed").length,
      },
    });
  } catch (e) {
    return json({ error: "publish_failed", details: e instanceof Error ? e.message : String(e) }, 500);
  }
});
