-- Re-point the dispatch-scheduled-posts cron job at the self-hosted Supabase
-- API (https://team-api.aibd.ai) instead of the old Supabase Cloud project.
--
-- Supersedes the job created in 20260516010000_facebook_publishing_cron.sql
-- (that file is left untouched).
--
-- Operator setup BEFORE (or right after) applying this migration:
--   The X-Dispatcher-Secret header is read from Vault at run time. Create the
--   Vault secret once, using the value from Bitwarden item
--   "team – DISPATCHER_SECRET" (folder "Company Infrastructure"):
--
--     select vault.create_secret('<value>', 'dispatcher_secret');
--
--   The same value must be set as the DISPATCHER_SECRET env var of the
--   edge functions container. Never commit the value itself.
--   Until the secret exists the header is NULL and the function returns 403
--   (harmless).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule the previous version (idempotent).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-scheduled-posts') THEN
    PERFORM cron.unschedule('dispatch-scheduled-posts');
  END IF;
END $$;

-- Every minute, POST to the dispatcher on the self-hosted API.
SELECT cron.schedule(
  'dispatch-scheduled-posts',
  '* * * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://team-api.aibd.ai/functions/v1/dispatch-scheduled-posts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Dispatcher-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'dispatcher_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $cron$
);
