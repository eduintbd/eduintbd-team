-- Facebook Page publishing: secrets storage, per-attempt logging, publish-result fields.
-- Design notes:
-- * Access tokens live in social_media_channel_secrets, NOT in social_media_channels.credentials.
-- * Column-level GRANTs deny tokens to the authenticated role even if RLS is misconfigured —
--   PostgREST will not return columns the calling role lacks SELECT on.
-- * service_role bypasses RLS and column GRANTs; edge functions use it to read tokens.

-- =============================================
-- 1. Channel secrets (page access tokens, etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS social_media_channel_secrets (
  channel_id uuid PRIMARY KEY REFERENCES social_media_channels(id) ON DELETE CASCADE,

  -- Non-secret connection metadata (readable by authenticated)
  provider text NOT NULL CHECK (provider IN ('facebook', 'youtube', 'linkedin', 'instagram', 'tiktok', 'whatsapp')),
  external_account_id text NOT NULL,         -- e.g. FB Page ID
  external_account_name text,                -- e.g. FB Page name
  connected_by uuid REFERENCES auth.users(id),
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz,
  last_verify_error text,
  expires_at timestamptz,                    -- token expiry, null for non-expiring page tokens
  scopes text[] DEFAULT '{}',

  -- Secret material (denied to authenticated via column GRANT)
  page_access_token text NOT NULL,
  user_access_token text,

  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smcs_provider ON social_media_channel_secrets(provider);
CREATE INDEX IF NOT EXISTS idx_smcs_external_account ON social_media_channel_secrets(external_account_id);

ALTER TABLE social_media_channel_secrets ENABLE ROW LEVEL SECURITY;

-- Allow authenticated to read connection STATUS (RLS gate; column GRANT below hides the token).
CREATE POLICY "Authenticated read channel connection status"
  ON social_media_channel_secrets FOR SELECT
  TO authenticated USING (true);

-- Only admins can disconnect a channel via the UI; edge functions use service_role and bypass RLS.
CREATE POLICY "Admins manage channel secrets"
  ON social_media_channel_secrets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Column-level lock on tokens. Even if RLS regresses, authenticated role cannot SELECT these.
REVOKE ALL ON social_media_channel_secrets FROM authenticated, anon;
GRANT SELECT (
  channel_id,
  provider,
  external_account_id,
  external_account_name,
  connected_by,
  connected_at,
  last_verified_at,
  last_verify_error,
  expires_at,
  scopes,
  updated_at
) ON social_media_channel_secrets TO authenticated;

-- DELETE permission is gated by RLS only (the admin policy above). No INSERT/UPDATE from clients.
GRANT DELETE ON social_media_channel_secrets TO authenticated;

-- service_role keeps full access.
GRANT ALL ON social_media_channel_secrets TO service_role;

-- =============================================
-- 2. Publish attempt log (per-channel attempts, full history)
-- =============================================
CREATE TABLE IF NOT EXISTS social_media_publish_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_post_id uuid NOT NULL REFERENCES social_media_scheduled_posts(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES social_media_channels(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  external_post_id text,                     -- e.g. "PAGEID_POSTID" from FB
  external_post_url text,
  request_payload jsonb,                     -- last sent payload (no token)
  response_body jsonb,                       -- truncated/redacted response
  error_message text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smpa_post ON social_media_publish_attempts(scheduled_post_id);
CREATE INDEX IF NOT EXISTS idx_smpa_channel ON social_media_publish_attempts(channel_id);
CREATE INDEX IF NOT EXISTS idx_smpa_attempted_at ON social_media_publish_attempts(attempted_at DESC);

ALTER TABLE social_media_publish_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read publish attempts"
  ON social_media_publish_attempts FOR SELECT
  TO authenticated USING (true);

-- Only service_role writes attempt rows (edge functions). No client INSERT/UPDATE.
GRANT SELECT ON social_media_publish_attempts TO authenticated;
GRANT ALL ON social_media_publish_attempts TO service_role;

-- =============================================
-- 3. Scheduled-post: per-channel result snapshot for UI
-- =============================================
ALTER TABLE social_media_scheduled_posts
  ADD COLUMN IF NOT EXISTS publish_results jsonb NOT NULL DEFAULT '{}'::jsonb;
-- Shape: {"<channel_id>": {"status": "success|failed", "external_post_id": "...", "external_post_url": "...", "error": "...", "at": "..."}}

ALTER TABLE social_media_scheduled_posts
  ADD COLUMN IF NOT EXISTS dispatch_lock_at timestamptz;
-- Set by the scheduler when a row is claimed for dispatch; prevents double-publishing under
-- concurrent runs of the cron worker. Reset to NULL on terminal status.

ALTER TABLE social_media_scheduled_posts
  ADD COLUMN IF NOT EXISTS last_dispatch_error text;

CREATE INDEX IF NOT EXISTS idx_ssp_dispatch_ready
  ON social_media_scheduled_posts(scheduled_at)
  WHERE status = 'scheduled' AND dispatch_lock_at IS NULL;

-- =============================================
-- 4. Storage bucket for outgoing media (idempotent)
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media-media', 'social-media-media', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload outgoing media. The edge function reads via service_role.
DROP POLICY IF EXISTS "Authenticated upload social media media" ON storage.objects;
CREATE POLICY "Authenticated upload social media media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'social-media-media');

DROP POLICY IF EXISTS "Authenticated read social media media" ON storage.objects;
CREATE POLICY "Authenticated read social media media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'social-media-media');

DROP POLICY IF EXISTS "Authenticated delete own social media media" ON storage.objects;
CREATE POLICY "Authenticated delete own social media media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'social-media-media' AND owner = auth.uid());

-- =============================================
-- 5. Bookkeeping trigger
-- =============================================
CREATE OR REPLACE FUNCTION touch_social_media_channel_secrets_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_smcs_updated_at ON social_media_channel_secrets;
CREATE TRIGGER trg_smcs_updated_at
  BEFORE UPDATE ON social_media_channel_secrets
  FOR EACH ROW EXECUTE FUNCTION touch_social_media_channel_secrets_updated_at();
