// bkash-callback
// ---------------------------------------------------------------------------
// Step 2 of the bKash Tokenized Checkout flow. bKash redirects the payer's
// browser here after they confirm (or cancel) on the hosted page, with
// ?paymentID=...&status=success|failure|cancel.
//
//   success -> atomically claim awaiting_payer -> payment_processing
//           -> bKash token + EXECUTE -> mark 'paid' (store trxID)
//   else    -> mark 'payment_failed'
//
// Returns a small HTML page that postMessages the opener window (the app) and
// closes the popup — same pattern as facebook-oauth-callback.
//
// verify_jwt = false: bKash (via the browser) calls this with no app JWT. It is
// safe because it only acts on a row already pinned to a specific bKash
// paymentID, and uses the service role internally.
// ---------------------------------------------------------------------------

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const html = (kind: "success" | "error", msg: string, status = 200) =>
  new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>bKash Payment</title></head>
<body style="font-family:system-ui;padding:2rem;text-align:center">
  <h2>${kind === "success" ? "Payment complete" : "Payment not completed"}</h2>
  <p>${msg}</p>
  <p>You can close this window.</p>
  <script>
    try { if (window.opener) window.opener.postMessage({ type: "bkash-pay-${kind}", message: ${JSON.stringify(msg)} }, "*"); } catch (e) {}
    setTimeout(function(){ try { window.close(); } catch (e) {} }, ${kind === "success" ? 1500 : 6000});
  </script>
</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

serve(async (req) => {
  const url = new URL(req.url);
  const paymentID = url.searchParams.get("paymentID");
  const payStatus = (url.searchParams.get("status") ?? "").toLowerCase();
  if (!paymentID) return html("error", "Missing paymentID.", 400);

  const supaUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const admin = createClient(supaUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Locate the request this bKash payment belongs to.
  const { data: reqRow } = await admin
    .from("expense_payment_requests")
    .select("id, request_number, status")
    .eq("bkash_payment_id", paymentID)
    .maybeSingle();
  if (!reqRow) return html("error", "Payment not recognized.", 404);

  // Already settled (e.g. duplicate callback) — report the existing outcome.
  if (reqRow.status === "paid") return html("success", `Request ${reqRow.request_number} is paid.`);

  // Payer cancelled or failed at the gateway.
  if (payStatus && payStatus !== "success") {
    await admin
      .from("expense_payment_requests")
      .update({ status: "payment_failed", payment_error: `Payment ${payStatus} by payer` })
      .eq("id", reqRow.id)
      .eq("status", "awaiting_payer");
    return html("error", `Payment was ${payStatus}.`);
  }

  // Atomically claim awaiting_payer -> payment_processing so a duplicate
  // callback can't execute twice.
  const { data: claimed } = await admin
    .from("expense_payment_requests")
    .update({ status: "payment_processing" })
    .eq("id", reqRow.id)
    .eq("status", "awaiting_payer")
    .select("id")
    .maybeSingle();
  if (!claimed) return html("error", "This payment is already being processed.");

  const base = Deno.env.get("BKASH_CHECKOUT_URL_BASE_URL");
  const appKey = Deno.env.get("BKASH_CHECKOUT_URL_APP_KEY");
  const appSecret = Deno.env.get("BKASH_CHECKOUT_URL_APP_SECRET");
  const username = Deno.env.get("BKASH_CHECKOUT_URL_USER_NAME");
  const password = Deno.env.get("BKASH_CHECKOUT_URL_PASSWORD");

  try {
    if (!base || !appKey || !appSecret || !username || !password) throw new Error("bkash_not_configured");

    // 1) Grant token
    const tokenRes = await fetch(`${base}/token/grant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", username, password },
      body: JSON.stringify({ app_key: appKey, app_secret: appSecret }),
    });
    const tokenBody = await tokenRes.json().catch(() => ({}));
    const idToken: string | undefined = tokenBody?.id_token;
    if (!tokenRes.ok || !idToken) throw new Error(`token_grant_failed: ${tokenBody?.statusMessage ?? tokenRes.status}`);

    // 2) Execute payment
    const execRes = await fetch(`${base}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: idToken, "X-APP-Key": appKey },
      body: JSON.stringify({ paymentID }),
    });
    const execBody = await execRes.json().catch(() => ({}));
    const ok = execRes.ok && execBody?.statusCode === "0000" &&
      (execBody?.transactionStatus === "Completed" || !!execBody?.trxID);
    if (!ok) throw new Error(`execute_failed: ${execBody?.statusMessage ?? execBody?.errorMessage ?? execRes.status}`);

    await admin
      .from("expense_payment_requests")
      .update({ status: "paid", paid_at: new Date().toISOString(), bkash_trx_id: execBody.trxID ?? null, payment_error: null })
      .eq("id", reqRow.id)
      .eq("status", "payment_processing");

    return html("success", `Request ${reqRow.request_number} paid. TRX ${execBody.trxID ?? ""}.`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await admin
      .from("expense_payment_requests")
      .update({ status: "payment_failed", payment_error: message })
      .eq("id", reqRow.id)
      .eq("status", "payment_processing");
    return html("error", "We could not finalize the payment. An admin can retry it.");
  }
});
