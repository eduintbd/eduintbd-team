-- Multi-company support for social media management

-- Companies/clients table
CREATE TABLE IF NOT EXISTS social_media_companies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  logo_url text,
  website text,
  industry text,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE social_media_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sm_companies" ON social_media_companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage sm_companies" ON social_media_companies FOR ALL TO authenticated USING (true);

-- Add company_id to channels
ALTER TABLE social_media_channels ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES social_media_companies(id) ON DELETE CASCADE;

-- Add company_id to scheduled posts
ALTER TABLE social_media_scheduled_posts ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES social_media_companies(id) ON DELETE CASCADE;

-- Add company_id to analytics
ALTER TABLE social_media_analytics ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES social_media_companies(id) ON DELETE CASCADE;

-- Index
CREATE INDEX IF NOT EXISTS idx_sm_channels_company ON social_media_channels(company_id);
CREATE INDEX IF NOT EXISTS idx_sm_scheduled_company ON social_media_scheduled_posts(company_id);

-- Seed default companies
INSERT INTO social_media_companies (name, website, industry, description) VALUES
  ('EDUINT Limited', 'https://eduintbd.com', 'Technology & Financial Services', 'Dhaka-based technology and financial services group'),
  ('U Fintech Limited', 'https://uinsure.ai', 'InsurTech', 'AI-powered digital insurance platform'),
  ('Abaci Investments', 'https://abaci.investments', 'Investment Education', 'AI-powered investment education platform')
ON CONFLICT DO NOTHING;
