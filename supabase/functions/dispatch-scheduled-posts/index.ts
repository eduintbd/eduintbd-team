// dispatch-scheduled-posts
// Cron worker. Called every minute by pg_cron (via pg_net) or by a Supabase
// scheduled function. Picks up rows from social_media_scheduled_posts where:
//   status = 'scheduled'
//   AND scheduled_at <= now()
//   AND dispatch_lock_at IS NULL
// Claims each row by setting dispatch_lock_at = now() (a race-safe partial-index
// claim), then runs the Facebook publisher for it.
//
// Auth: requires the caller to present the dispatcher shared-secret in
// `X-Dispatcher-Secret` (rotate via DISPATCHER_SECRET env var). The function is
// configured with verify_jwt = false because pg_cron has no JWT.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { publishPostToFacebookChannels } from "../_shared/publish-facebook.ts";

const MAX_BATCH = 20;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  const expected = Deno.env.get("DISPATCHER_SECRET");
  const got = req.headers.get("X-Dispatcher-Secret") ?? "";
  if (!expected) return json({ error: "DISPATCHER_SECRET not configured" }, 500);
  // Constant-time compare
  let diff = expected.length ^ got.length;
  for (let i = 0; i < Math.max(expected.length, got.length); i++) {
    diff |= (expected.charCodeAt(i) ?? 0) ^ (got.charCodeAt(i) ?? 0);
  }
  if (diff !== 0) return json({ error: "forbidden" }, 403);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Claim rows in one UPDATE..RETURNING. The WHERE includes the lock-null guard
  // so two concurrent dispatchers can't both claim the same row.
  // (PostgREST exposes UPDATE..SELECT via .update().select().)
  const { data: claimed, error: claimErr } = await admin
    .from("social_media_scheduled_posts")
    .update({ dispatch_lock_at: new Date().toISOString() })
    .eq("status", "scheduled")
    .is("dispatch_lock_at", null)
    .lte("scheduled_at", new Date().toISOString())
    .select("id")
    .limit(MAX_BATCH);

  if (claimErr) return json({ error: "claim_failed", details: claimErr.message }, 500);

  const ids = (claimed ?? []).map((r) => r.id);

  const dispatched: { id: string; success: number; failed: number; error?: string }[] = [];
  for (const id of ids) {
    try {
      const { results } = await publishPostToFacebookChannels(admin, id);
      dispatched.push({
        id,
        success: results.filter((r) => r.status === "success").length,
        failed: results.filter((r) => r.status === "failed").length,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Release the lock and mark the error so the next cron tick can retry.
      await admin
        .from("social_media_scheduled_posts")
        .update({ dispatch_lock_at: null, last_dispatch_error: msg })
        .eq("id", id);
      dispatched.push({ id, success: 0, failed: 0, error: msg });
    }
  }

  return json({
    claimed: ids.length,
    dispatched,
    summary: {
      success: dispatched.reduce((a, b) => a + b.success, 0),
      failed: dispatched.reduce((a, b) => a + b.failed, 0),
      errored: dispatched.filter((d) => d.error).length,
    },
  });
});
