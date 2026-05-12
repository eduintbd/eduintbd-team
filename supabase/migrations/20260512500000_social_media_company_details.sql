-- Enhanced company details for client management

ALTER TABLE social_media_companies ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE social_media_companies ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE social_media_companies ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE social_media_companies ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE social_media_companies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE social_media_companies ADD COLUMN IF NOT EXISTS contact_person text;
ALTER TABLE social_media_companies ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'standard' CHECK (client_type IN ('standard', 'premium', 'enterprise', 'startup', 'agency'));

-- Packages table
CREATE TABLE IF NOT EXISTS social_media_packages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric(10,2) DEFAULT 0,
  billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'one-time')),
  features text[] DEFAULT '{}',
  max_channels integer DEFAULT 6,
  max_posts_per_month integer DEFAULT 30,
  includes_analytics boolean DEFAULT true,
  includes_content_creation boolean DEFAULT false,
  includes_ad_management boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE social_media_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read packages" ON social_media_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage packages" ON social_media_packages FOR ALL TO authenticated USING (true);

-- Link companies to packages
ALTER TABLE social_media_companies ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES social_media_packages(id) ON DELETE SET NULL;
ALTER TABLE social_media_companies ADD COLUMN IF NOT EXISTS package_start_date date;
ALTER TABLE social_media_companies ADD COLUMN IF NOT EXISTS package_end_date date;
ALTER TABLE social_media_companies ADD COLUMN IF NOT EXISTS monthly_fee numeric(10,2) DEFAULT 0;
ALTER TABLE social_media_companies ADD COLUMN IF NOT EXISTS notes text;

-- Seed packages
INSERT INTO social_media_packages (name, description, price, billing_cycle, features, max_channels, max_posts_per_month, includes_analytics, includes_content_creation, includes_ad_management) VALUES
  ('Starter', 'Basic social media management', 5000, 'monthly', '{"3 social channels","15 posts/month","Basic analytics","Monthly report"}', 3, 15, true, false, false),
  ('Growth', 'Growing businesses package', 15000, 'monthly', '{"6 social channels","30 posts/month","Advanced analytics","Content creation","Weekly report","Hashtag strategy"}', 6, 30, true, true, false),
  ('Premium', 'Full-service social media', 30000, 'monthly', '{"All channels","60 posts/month","Advanced analytics","Content creation","Ad management","Daily monitoring","Crisis management","Monthly strategy call"}', 12, 60, true, true, true),
  ('Enterprise', 'Custom enterprise solution', 50000, 'monthly', '{"Unlimited channels","Unlimited posts","Custom analytics","Dedicated team","Ad management","24/7 monitoring","Strategy consulting","Brand guidelines"}', 99, 999, true, true, true)
ON CONFLICT DO NOTHING;
