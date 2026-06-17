// bkash-test-connection
// ---------------------------------------------------------------------------
// SANDBOX DIAGNOSTIC ONLY — verifies that your bKash Tokenized Checkout
// credentials work end to end:
//   1) Grant Token   -> proves app_key/app_secret/username/password are valid
//   2) Create Payment -> returns a real `bkashURL` a payer would be redirected to
//
// This is the meaningful test for *Checkout* (money-IN) credentials. It does
// NOT move money: create-payment only creates a payment intent; an actual
// charge requires a payer to complete it on bKash's hosted page.
//
// ⚠️ verify_jwt is false so you can curl it locally with one command. It only
// touches the bKash SANDBOX. DELETE this function (and its config.toml entry)
// before going to production.
// ---------------------------------------------------------------------------

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const base = Deno.env.get("BKASH_CHECKOUT_URL_BASE_URL");
  const appKey = Deno.env.get("BKASH_CHECKOUT_URL_APP_KEY");
  const appSecret = Deno.env.get("BKASH_CHECKOUT_URL_APP_SECRET");
  const username = Deno.env.get("BKASH_CHECKOUT_URL_USER_NAME");
  const password = Deno.env.get("BKASH_CHECKOUT_URL_PASSWORD");

  const missing = Object.entries({ base, appKey, appSecret, username, password })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    return json({ ok: false, step: "config", missing,
      hint: "Set BKASH_CHECKOUT_URL_* in supabase/functions/.env and pass --env-file when serving." }, 400);
  }

  // Optional override of the test amount via the request body.
  let amount = "10";
  try {
    const body = await req.json();
    if (body?.amount) amount = String(body.amount);
  } catch { /* no body is fine */ }

  // 1) Grant Token
  const tokenRes = await fetch(`${base}/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: username!,
      password: password!,
    },
    body: JSON.stringify({ app_key: appKey, app_secret: appSecret }),
  });
  const tokenBody = await tokenRes.json().catch(() => ({}));
  const idToken: string | undefined = tokenBody?.id_token;
  if (!tokenRes.ok || !idToken) {
    return json({ ok: false, step: "token_grant", http_status: tokenRes.status, response: tokenBody }, 502);
  }

  // 2) Create Payment (tokenized checkout)
  const createRes = await fetch(`${base}/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: idToken,
      "X-APP-Key": appKey!,
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: username,
      callbackURL: "https://example.com/bkash/callback",
      amount,
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: "TEST-" + amount,
    }),
  });
  const createBody = await createRes.json().catch(() => ({}));

  return json({
    ok: createRes.ok && !!createBody?.paymentID,
    token_grant: { http_status: tokenRes.status, token_type: tokenBody?.token_type, expires_in: tokenBody?.expires_in },
    create_payment: {
      http_status: createRes.status,
      paymentID: createBody?.paymentID,
      bkashURL: createBody?.bkashURL,   // open this in a browser to complete a sandbox payment
      transactionStatus: createBody?.transactionStatus,
      raw: createBody,
    },
  }, createRes.ok ? 200 : 502);
});
