-- Schedule the dispatch-scheduled-posts edge function via pg_cron + pg_net.
--
-- Operator setup BEFORE applying this migration:
--   1. Set the edge function secret in the Supabase dashboard:
--        DISPATCHER_SECRET = <random 32+ char string>
--   2. Store the SAME value in Supabase Vault so the cron job can include it
--      in the X-Dispatcher-Secret header:
--        SELECT vault.create_secret(
--          '<random 32+ char string>',
--          'dispatcher_secret',
--          'Used by pg_cron to authenticate to dispatch-scheduled-posts'
--        );
--
-- The cron job runs every minute. The dispatcher claims up to 20 due posts per
-- run; pick a smaller MAX_BATCH inside the edge function if you need to.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper schema for internal cron callers.
CREATE SCHEMA IF NOT EXISTS private;

-- Reads the dispatcher secret from Vault. Returns '' if not yet stored so the
-- cron call still succeeds (the edge function will return 403 until you set the
-- secret in Vault — that's harmless).
CREATE OR REPLACE FUNCTION private.dispatcher_secret() RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE s text;
BEGIN
  SELECT decrypted_secret INTO s
    FROM vault.decrypted_secrets
    WHERE name = 'dispatcher_secret'
    LIMIT 1;
  RETURN COALESCE(s, '');
END;
$$;

-- Restrict who can call the secret helper. service_role only.
REVOKE ALL ON FUNCTION private.dispatcher_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.dispatcher_secret() TO service_role;

-- Unschedule any previous version so re-running the migration is idempotent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-scheduled-posts') THEN
    PERFORM cron.unschedule('dispatch-scheduled-posts');
  END IF;
END $$;

-- Every minute, POST to the dispatcher. The URL is project-specific.
SELECT cron.schedule(
  'dispatch-scheduled-posts',
  '* * * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://pkzpesnwfsgfhtyswtit.supabase.co/functions/v1/dispatch-scheduled-posts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Dispatcher-Secret', private.dispatcher_secret()
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $cron$
);
