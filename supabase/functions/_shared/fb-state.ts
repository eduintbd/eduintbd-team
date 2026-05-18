// Signed state token for the Facebook OAuth round-trip.
// HMAC-SHA256 over base64url(JSON(payload)) with FACEBOOK_OAUTH_STATE_SECRET.

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(bytes: Uint8Array | string): string {
  const s = typeof bytes === "string"
    ? btoa(bytes)
    : btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const std = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(std), (c) => c.charCodeAt(0));
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return new Uint8Array(sig);
}

export interface FbStatePayload {
  channel_id: string;
  user_id: string;
  exp: number;        // unix seconds
  nonce: string;
}

export async function signState(p: Omit<FbStatePayload, "nonce" | "exp"> & { ttlSeconds?: number }): Promise<string> {
  const payload: FbStatePayload = {
    channel_id: p.channel_id,
    user_id: p.user_id,
    exp: Math.floor(Date.now() / 1000) + (p.ttlSeconds ?? 600),
    nonce: b64url(crypto.getRandomValues(new Uint8Array(12))),
  };
  const secret = Deno.env.get("FACEBOOK_OAUTH_STATE_SECRET");
  if (!secret) throw new Error("FACEBOOK_OAUTH_STATE_SECRET not set");

  const body = b64url(JSON.stringify(payload));
  const sigBytes = await hmac(secret, body);
  return `${body}.${b64url(sigBytes)}`;
}

export async function verifyState(token: string): Promise<FbStatePayload | null> {
  const secret = Deno.env.get("FACEBOOK_OAUTH_STATE_SECRET");
  if (!secret) throw new Error("FACEBOOK_OAUTH_STATE_SECRET not set");

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = await hmac(secret, body);
  const got = b64urlDecode(sig);
  if (expected.length !== got.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ got[i];
  if (diff !== 0) return null;

  let parsed: FbStatePayload;
  try {
    parsed = JSON.parse(dec.decode(b64urlDecode(body)));
  } catch {
    return null;
  }
  if (!parsed.channel_id || !parsed.user_id || !parsed.exp) return null;
  if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return parsed;
}
