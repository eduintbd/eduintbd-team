# CLAUDE.md — eduintbd-team (team.aibd.ai)

Guidance for Claude Code (and humans) working in this repo. Keep it short and practical.

## What this app is

The internal EduInt team portal at **https://team.aibd.ai**: HR (employees, attendance,
conveyance, KPIs), accounting (chart of accounts, journals, expenses with bKash payments),
procurement, file management (Google Drive), email (Gmail / Purelymail), social media
scheduling (Facebook publishing), and more. Originally generated with Lovable.

## Stack

- Vite + React + TypeScript, shadcn/ui + Tailwind CSS. Package manager: **npm** (use `package-lock.json`; ignore `bun.lockb`).
- Backend: **self-hosted Supabase** (Postgres, Auth, Storage, Edge Functions) at https://team-api.aibd.ai.
- Hosting: **Coolify** on our VPS (static build, `dist/` served with SPA fallback).
- Supabase client: `src/integrations/supabase/client.ts` (reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`).
- Edge functions (Deno): `supabase/functions/<name>/index.ts`, shared code in `supabase/functions/_shared/`.
- SQL migrations: `supabase/migrations/`.

## Run locally

```sh
cp .env.example .env      # then fill in the anon key (Bitwarden, see below)
npm ci
npm run dev               # https://localhost:8080 (self-signed cert — accept the browser warning)
npm run build             # production build into dist/ — run this before pushing
```

Local dev talks to the **production** Supabase API unless you point `.env` elsewhere — be careful with data.

## Deploy

- **Production:** push or merge to `main` → Coolify auto-builds (`npm ci && npm run build`) and deploys https://team.aibd.ai.
- **Preview:** open a pull request → Coolify builds a preview at a `*.preview.aibd.ai` URL (posted on the PR). Test there before merging.
- Frontend build variables (`VITE_*`) are set in Coolify; they override any `.env` file.
- Edge functions and migrations are **not** deployed by pushing — see below.
- `vercel.json` is a leftover from the old Vercel hosting and is not used by Coolify.

## Supabase

- **API URL:** https://team-api.aibd.ai (old cloud project `pkzpesnwfsgfhtyswtit.supabase.co` is retired — do not use it).
- **Studio (DB admin UI):** open https://team-api.aibd.ai in a browser; log in with basic auth from Bitwarden item **"Supabase team – Studio login"**.
- **Applying migrations:** there is no `supabase db push` to the cloud anymore. To apply a new migration:
  1. Add a new file `supabase/migrations/YYYYMMDDHHMMSS_description.sql` (never edit old migrations).
  2. Run its SQL either in **Studio → SQL Editor**, or with `psql` over an SSH tunnel to the VPS database.
  3. Commit the file so the repo matches the database.
- **Edge functions (22):** deployed by copying each function folder into the server's functions volume:
  `/data/coolify/services/z8hurfykvvcvr6wt6o5s63ft/volumes/functions/<name>/`
  (plus `_shared/` and `verify-jwt.json`). Use `scripts/deploy-functions.sh team` from the
  **eduintbd/infrastructure** repo — it does the copy and restarts the functions container.
- **JWT verification per function** lives in `supabase/functions/verify-jwt.json` (read by the
  self-hosted main router). `supabase/config.toml` holds the same info for the Supabase CLI —
  if you add a function or change `verify_jwt`, update **both**. Functions not listed default to `true`.
- Edge-function secrets are env vars on the Supabase edge-functions service in Coolify (not in this repo).

## Environment variables

Never commit secret values. All values live in Bitwarden folder **"Company Infrastructure"**;
item names follow the pattern `team – <VAR NAME>` unless noted.

**Frontend (Coolify build vars / local `.env`):**

| Name | Purpose | Bitwarden item |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase API URL (`https://team-api.aibd.ai`) | not secret |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon (public) key | `team – ANON_KEY` |

**Edge functions (set on the Supabase functions service in Coolify):**

| Name | Purpose (used by) | Bitwarden item |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Provided automatically by the self-hosted stack | `team – SERVICE_ROLE_KEY` etc. |
| `RESEND_API_KEY` | Transactional email (send-welcome-email, send-approval-email, send-application-confirmation) | `team – RESEND_API_KEY` |
| `GOOGLE_CLIENT_ID` | Google API OAuth client (gmail-proxy, calendar-proxy, google-drive-proxy) | `team – GOOGLE_CLIENT_ID` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (same functions) | `team – GOOGLE_CLIENT_SECRET` |
| `GOOGLE_REFRESH_TOKEN` | Long-lived Google token for the shared account (same functions) | `team – GOOGLE_REFRESH_TOKEN` |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Root Drive folder for file management (google-drive-proxy) | `team – GOOGLE_DRIVE_ROOT_FOLDER_ID` |
| `FACEBOOK_APP_ID` | Facebook app for page publishing (facebook-oauth-start/-callback) | `team – FACEBOOK_APP_ID` |
| `FACEBOOK_APP_SECRET` | Facebook app secret (facebook-oauth-callback) | `team – FACEBOOK_APP_SECRET` |
| `FACEBOOK_OAUTH_STATE_SECRET` | Signs the OAuth `state` param (`_shared/fb-state.ts`) | `team – FACEBOOK_OAUTH_STATE_SECRET` |
| `DISPATCHER_SECRET` | Shared secret the cron job sends as `X-Dispatcher-Secret` (dispatch-scheduled-posts). Same value must be in Vault as `dispatcher_secret` | `team – DISPATCHER_SECRET` |
| `BKASH_CHECKOUT_URL_BASE_URL` | bKash Checkout API base URL (bkash-execute-payment, bkash-callback) | `team – BKASH_CHECKOUT_URL_BASE_URL` |
| `BKASH_CHECKOUT_URL_APP_KEY` | bKash app key | `team – BKASH_CHECKOUT_URL_APP_KEY` |
| `BKASH_CHECKOUT_URL_APP_SECRET` | bKash app secret | `team – BKASH_CHECKOUT_URL_APP_SECRET` |
| `BKASH_CHECKOUT_URL_USER_NAME` | bKash merchant username | `team – BKASH_CHECKOUT_URL_USER_NAME` |
| `BKASH_CHECKOUT_URL_PASSWORD` | bKash merchant password | `team – BKASH_CHECKOUT_URL_PASSWORD` |
| `BKASH_CALLBACK_URL` | Where bKash sends the payer back; set to `https://team-api.aibd.ai/functions/v1/bkash-callback` | `team – BKASH_CALLBACK_URL` |
| `PURELYMAIL_EMAIL` | Mailbox login for IMAP fetch (fetch-purelymail) | `team – PURELYMAIL_EMAIL` |
| `PURELYMAIL_PASSWORD` | Mailbox password | `team – PURELYMAIL_PASSWORD` |
| `PURELYMAIL_IMAP_HOST` | IMAP server host | `team – PURELYMAIL_IMAP_HOST` |
| `SMART_BIZ_CARDS_API_KEY` | API key callers must send to smart-biz-cards-api | `team – SMART_BIZ_CARDS_API_KEY` |

## Scheduled jobs

- **`dispatch-scheduled-posts`** (pg_cron, every minute): POSTs to
  `https://team-api.aibd.ai/functions/v1/dispatch-scheduled-posts` with header `X-Dispatcher-Secret`
  read from Vault secret `dispatcher_secret`. Defined in
  `supabase/migrations/20260929000000_vps_dispatch_cron.sql` (supersedes `20260516010000_...`).
  One-time setup: `select vault.create_secret('<value>', 'dispatcher_secret');` with the value from
  Bitwarden "team – DISPATCHER_SECRET".
- Check it: `select * from cron.job;` and `select * from cron.job_run_details order by start_time desc limit 20;`
  and `select * from net._http_response order by created desc limit 20;`.

## Gotchas

- **Lovable also pushes to `main`.** Pull before you start (`git pull`), and expect commits you didn't make. Every push to `main` deploys to production.
- **Only the root app is deployed.** The `backend/`, `web/`, `mobile/`, `shared/` folders and the nested `eduintbd-team/` copy are unrelated/abandoned and not built or deployed — don't edit them by mistake.
- **OAuth redirect URLs must match the new domains:**
  - Supabase Auth (email links, password reset) redirects to `${window.location.origin}/auth` — `https://team.aibd.ai` (and preview URLs, if needed) must be in the Auth "Site URL / Redirect URLs" settings of the self-hosted stack.
  - Facebook: the redirect URI is built from `SUPABASE_URL` as `<SUPABASE_URL>/functions/v1/facebook-oauth-callback`. On self-hosted Supabase `SUPABASE_URL` inside functions may be an internal address (e.g. `http://kong:8000`); it must resolve to `https://team-api.aibd.ai/...`, and that exact URL must be whitelisted in the Facebook app's "Valid OAuth Redirect URIs".
  - bKash: set `BKASH_CALLBACK_URL` explicitly (same internal-URL problem otherwise).
  - Google: uses a stored refresh token, so no redirect URL is involved at runtime; the client secret JSON is not kept in the repo.
- **Never commit** `.env`, `client_secret_*.json`, or any key. `.env.example` shows the variable names.
- **Migrations are manual now** — a migration file in the repo does nothing until someone runs it in Studio/psql.
- `npm run dev` uses HTTPS with a self-signed certificate (`@vitejs/plugin-basic-ssl`).
