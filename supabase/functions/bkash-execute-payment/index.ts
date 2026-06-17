// bkash-execute-payment
// ---------------------------------------------------------------------------
// Step 1 of the bKash Tokenized Checkout flow: CREATE a payment for an APPROVED
// (or previously failed) expense request, and hand the browser a `bkashURL`.
//
//   admin clicks "Pay via bKash"
//     -> this fn: verify admin -> atomically claim row -> bKash token + create
//     -> store paymentID, status = 'awaiting_payer' -> return { bkashURL }
//   client opens bkashURL in a popup; payer confirms on bKash's hosted page;
//   bKash redirects the popup to `bkash-callback`, which runs EXECUTE (step 2).
//
// Security:
//   - bKash secrets come from Deno.env (Supabase secrets), never the client.
//   - Caller's admin role is re-verified here.
//   - The row is claimed with a conditional UPDATE (compare-and-set), so a
//     double-click / race can never create two bKash payments.
//
// NOTE: Tokenized Checkout COLLECTS money (payer confirms on bKash). It is not a
// headless vendor payout; that needs bKash Disbursement/B2C. See project notes.
// ---------------------------------------------------------------------------

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });

interface ClaimedRow {
  id: string;
  request_number: string;
  amount: number;
  merchant_id: string;
  purpose: string;
}

serve(async (httpReq) => {
  if (httpReq.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (httpReq.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // --- Authenticate caller ------------------------------------------------
  const authHeader = httpReq.headers.get("Authorization") ?? "";
  const userJwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!userJwt) return json({ error: "missing_authorization" }, 401);

  const supaUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const userClient = createClient(supaUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(userJwt);
  if (userErr || !userData.user) return json({ error: "invalid_user" }, 401);

  const admin = createClient(supaUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Restrict to the single designated approver account -----------------
  const APPROVER_EMAIL = "syed@eduintbd.com";
  if ((userData.user.email ?? "").toLowerCase() !== APPROVER_EMAIL) {
    return json({ error: "forbidden", message: "Only the designated approver can execute payments." }, 403);
  }

  let body: { request_id?: string };
  try { body = await httpReq.json(); } catch { return json({ error: "invalid_json" }, 400); }
  if (!body.request_id) return json({ error: "request_id required" }, 400);

  // --- bKash config -------------------------------------------------------
  const base = Deno.env.get("BKASH_CHECKOUT_URL_BASE_URL");
  const appKey = Deno.env.get("BKASH_CHECKOUT_URL_APP_KEY");
  const appSecret = Deno.env.get("BKASH_CHECKOUT_URL_APP_SECRET");
  const username = Deno.env.get("BKASH_CHECKOUT_URL_USER_NAME");
  const password = Deno.env.get("BKASH_CHECKOUT_URL_PASSWORD");
  // Where bKash returns the payer's browser after they confirm. Defaults to the
  // public callback function on this project.
  const callbackURL = Deno.env.get("BKASH_CALLBACK_URL") ?? `${supaUrl}/functions/v1/bkash-callback`;

  if (!base || !appKey || !appSecret || !username || !password) {
    return json({
      error: "bkash_not_configured",
      message: "Set BKASH_CHECKOUT_URL_* secrets for the bkash-execute-payment function.",
    }, 503);
  }

  // --- Atomic claim: approved | payment_failed -> payment_processing ------
  const { data: claimed, error: claimErr } = await admin
    .from("expense_payment_requests")
    .update({ status: "payment_processing", payment_attempted_at: new Date().toISOString() })
    .eq("id", body.request_id)
    .in("status", ["approved", "payment_failed"])
    .select("id, request_number, amount, merchant_id, purpose")
    .maybeSingle();

  if (claimErr) return json({ error: "claim_failed", details: claimErr.message }, 500);
  if (!claimed) {
    const { data: current } = await admin
      .from("expense_payment_requests").select("status").eq("id", body.request_id).maybeSingle();
    return json({
      error: "not_executable",
      message: `Request is not payable (current: ${current?.status ?? "not found"}). It must be 'approved' or 'payment_failed'.`,
    }, 409);
  }
  const row = claimed as ClaimedRow;

  try {
    // 1) Grant token
    const tokenRes = await fetch(`${base}/token/grant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", username, password },
      body: JSON.stringify({ app_key: appKey, app_secret: appSecret }),
    });
    const tokenBody = await tokenRes.json().catch(() => ({}));
    const idToken: string | undefined = tokenBody?.id_token;
    if (!tokenRes.ok || !idToken) throw new Error(`token_grant_failed: ${tokenBody?.statusMessage ?? tokenRes.status}`);

    // 2) Create payment
    const createRes = await fetch(`${base}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: idToken, "X-APP-Key": appKey },
      body: JSON.stringify({
        mode: "0011",
        payerReference: row.merchant_id,
        callbackURL,
        amount: Number(row.amount).toFixed(2),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: row.request_number,
      }),
    });
    const createBody = await createRes.json().catch(() => ({}));
    if (!createRes.ok || createBody?.statusCode !== "0000" || !createBody?.paymentID || !createBody?.bkashURL) {
      throw new Error(`create_failed: ${createBody?.statusMessage ?? createBody?.errorMessage ?? createRes.status}`);
    }

    // 3) Store paymentID and move to awaiting_payer
    await admin
      .from("expense_payment_requests")
      .update({ status: "awaiting_payer", bkash_payment_id: createBody.paymentID, payment_error: null })
      .eq("id", row.id)
      .eq("status", "payment_processing");

    return json({ ok: true, request_id: row.id, payment_id: createBody.paymentID, bkashURL: createBody.bkashURL });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await admin
      .from("expense_payment_requests")
      .update({ status: "payment_failed", payment_error: message })
      .eq("id", row.id)
      .eq("status", "payment_processing");
    return json({ error: "create_failed", message }, 502);
  }
});
