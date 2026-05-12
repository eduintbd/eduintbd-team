-- Social Media Module: aggregation feed + channel management

-- =============================================
-- 1. Aggregation: scraped posts from external sources
-- =============================================
CREATE TABLE IF NOT EXISTS social_media_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN ('twitter', 'facebook', 'reddit', 'youtube', 'linkedin', 'news')),
  external_id text,
  author_name text NOT NULL,
  author_handle text,
  author_avatar_url text,
  author_verified boolean DEFAULT false,
  content text NOT NULL,
  media_url text,
  post_url text,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  symbols text[] DEFAULT '{}',
  sentiment text CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
  relevance_score numeric(3,2) DEFAULT 0.50,
  category text DEFAULT 'general' CHECK (category IN ('market', 'stock', 'ipo', 'regulation', 'analysis', 'opinion', 'breaking', 'general')),
  tags text[] DEFAULT '{}',
  language text DEFAULT 'en' CHECK (language IN ('en', 'bn')),
  posted_at timestamptz NOT NULL,
  scraped_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(platform, external_id)
);

CREATE INDEX IF NOT EXISTS idx_smp_posted_at ON social_media_posts(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_smp_platform ON social_media_posts(platform);
CREATE INDEX IF NOT EXISTS idx_smp_relevance ON social_media_posts(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_smp_category ON social_media_posts(category);
CREATE INDEX IF NOT EXISTS idx_smp_symbols ON social_media_posts USING gin(symbols);

ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read social_media_posts" ON social_media_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated insert social_media_posts" ON social_media_posts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update social_media_posts" ON social_media_posts FOR UPDATE TO authenticated USING (true);

-- =============================================
-- 2. Channel Management: company social accounts
-- =============================================
CREATE TABLE IF NOT EXISTS social_media_channels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN ('facebook', 'youtube', 'whatsapp', 'linkedin', 'tiktok', 'instagram')),
  channel_name text NOT NULL,
  channel_handle text,
  channel_url text,
  avatar_url text,
  description text,
  followers_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  credentials jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE social_media_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read channels" ON social_media_channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage channels" ON social_media_channels FOR ALL TO authenticated USING (true);

-- =============================================
-- 3. Scheduled Posts: content to publish
-- =============================================
CREATE TABLE IF NOT EXISTS social_media_scheduled_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  content text NOT NULL,
  media_urls text[] DEFAULT '{}',
  platforms text[] NOT NULL DEFAULT '{}',
  channel_ids uuid[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'scheduled', 'published', 'failed', 'rejected')),
  scheduled_at timestamptz,
  published_at timestamptz,
  hashtags text[] DEFAULT '{}',
  campaign text,
  notes text,

  -- Approval workflow
  created_by uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  review_notes text,
  reviewed_at timestamptz,

  -- Platform-specific content overrides
  platform_content jsonb DEFAULT '{}',
  -- e.g. {"facebook": {"content": "...", "link": "..."}, "instagram": {"content": "...", "image_url": "..."}}

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ssp_status ON social_media_scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_ssp_scheduled ON social_media_scheduled_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_ssp_created_by ON social_media_scheduled_posts(created_by);

ALTER TABLE social_media_scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read scheduled posts" ON social_media_scheduled_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage scheduled posts" ON social_media_scheduled_posts FOR ALL TO authenticated USING (true);

-- =============================================
-- 4. Post Templates
-- =============================================
CREATE TABLE IF NOT EXISTS social_media_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  content text NOT NULL,
  platforms text[] DEFAULT '{}',
  hashtags text[] DEFAULT '{}',
  category text DEFAULT 'general',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE social_media_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read templates" ON social_media_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage templates" ON social_media_templates FOR ALL TO authenticated USING (true);

-- =============================================
-- 5. Analytics snapshots
-- =============================================
CREATE TABLE IF NOT EXISTS social_media_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id uuid REFERENCES social_media_channels(id) ON DELETE CASCADE,
  date date NOT NULL,
  followers integer DEFAULT 0,
  impressions integer DEFAULT 0,
  engagement integer DEFAULT 0,
  clicks integer DEFAULT 0,
  posts_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, date)
);

ALTER TABLE social_media_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read analytics" ON social_media_analytics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage analytics" ON social_media_analytics FOR ALL TO authenticated USING (true);

-- =============================================
-- Seed: sample channels
-- =============================================
INSERT INTO social_media_channels (platform, channel_name, channel_handle, channel_url, description, followers_count) VALUES
  ('facebook', 'EDUINT BD', '@eduintbd', 'https://facebook.com/eduintbd', 'Official Facebook page', 0),
  ('youtube', 'EDUINT BD', '@eduintbd', 'https://youtube.com/@eduintbd', 'Official YouTube channel', 0),
  ('linkedin', 'EDUINT Limited', 'eduint-limited', 'https://linkedin.com/company/eduint-limited', 'Official LinkedIn page', 0),
  ('instagram', 'EDUINT BD', '@eduintbd', 'https://instagram.com/eduintbd', 'Official Instagram account', 0),
  ('tiktok', 'EDUINT BD', '@eduintbd', 'https://tiktok.com/@eduintbd', 'Official TikTok account', 0),
  ('whatsapp', 'EDUINT BD', '+880', '', 'WhatsApp Business channel', 0)
ON CONFLICT DO NOTHING;

-- Seed: sample templates
INSERT INTO social_media_templates (name, description, content, platforms, hashtags, category) VALUES
  ('Product Launch', 'Announce a new product or service', 'We are excited to announce [PRODUCT NAME]! [DESCRIPTION]. Learn more at [LINK]. #Launch #Innovation', '{"facebook","linkedin","instagram"}', '{"launch","innovation","new"}', 'announcement'),
  ('Weekly Market Update', 'Weekly DSE market summary', 'Weekly Market Recap: DSEX [UP/DOWN] [%]. Top gainers: [STOCKS]. Turnover: BDT [AMOUNT]Cr. #DSE #WeeklyUpdate #BangladeshStocks', '{"facebook","linkedin","twitter"}', '{"DSE","market","weekly"}', 'market'),
  ('Event Promotion', 'Promote upcoming events', 'Join us for [EVENT NAME] on [DATE]! [DESCRIPTION]. Register: [LINK] #Event', '{"facebook","linkedin","instagram"}', '{"event","join"}', 'event'),
  ('Team Spotlight', 'Highlight team members', 'Meet [NAME], our [ROLE]! [BIO/QUOTE]. We are proud to have them on our team. #TeamSpotlight #OurPeople', '{"linkedin","facebook","instagram"}', '{"team","people","culture"}', 'culture'),
  ('MOU/Partnership', 'Partnership announcement', '[COMPANY A] signs MOU with [COMPANY B] for [PURPOSE]. [DETAILS]. #Partnership #MOU', '{"linkedin","facebook","twitter"}', '{"partnership","MOU","collaboration"}', 'announcement')
ON CONFLICT DO NOTHING;

-- Seed: sample aggregation posts (from your SQL file)
INSERT INTO social_media_posts (platform, author_name, author_handle, author_verified, content, post_url, likes_count, comments_count, shares_count, symbols, sentiment, relevance_score, category, tags, language, posted_at) VALUES
('twitter', 'DSE Market Watch', '@dse_watch', true, 'DSEX crosses 5,800 mark! Banking stocks leading the rally. BRACBANK +4.2%, DUTCHBANGLA +3.8%, EBL +2.9%. Turnover hits BDT 1,200Cr — highest in 3 months. Bull run continues! #DSE #BangladeshStocks', 'https://twitter.com/dse_watch/status/123', 245, 42, 89, '{BRACBANK,DUTCHBANGLA,EBL}', 'positive', 0.95, 'market', '{rally,banking,turnover}', 'en', now() - interval '1 hour'),
('twitter', 'BD Stock Analyst', '@bd_stock_pro', true, 'GP declares 12% interim cash dividend for FY2025-26. Record date April 5. At current price, annualized yield ~5.2%. Strong free cash flow supports continued payouts. HOLD rating maintained. #GP #Dividend', 'https://twitter.com/bd_stock_pro/status/124', 189, 31, 56, '{GP}', 'positive', 0.92, 'stock', '{dividend,GP,telecom}', 'en', now() - interval '2 hours'),
('reddit', 'u/dse_investor_bd', 'dse_investor_bd', false, 'Foreign investors sold BDT 245Cr this week - 3rd consecutive week of net selling. Pharma and textile sectors hit hardest. Is this the start of a larger correction or just profit-taking?', 'https://reddit.com/r/BangladeshStocks/comments/abc123', 67, 43, 12, '{}', 'negative', 0.85, 'analysis', '{foreign,selling,correction}', 'en', now() - interval '4 hours'),
('twitter', 'BSEC Updates BD', '@bsec_updates', true, 'BREAKING: BSEC approves new margin loan guidelines for retail investors. Higher margin ratios now available for qualified investors with 2+ years trading history. #BSEC #Regulation', 'https://twitter.com/bsec_updates/status/125', 312, 56, 98, '{}', 'neutral', 0.90, 'regulation', '{BSEC,margin,regulation}', 'en', now() - interval '5 hours'),
('youtube', 'Stock Market BD', 'StockMarketBD', true, 'TOP 5 Stocks to Watch This Week | DSEX Analysis | Technical analysis of BEXIMCO, GP, BRACBANK, SQURPHARNA, and BATBC.', 'https://youtube.com/watch?v=xyz789', 1200, 234, 89, '{BXPHARMA,GP,BRACBANK,SQURPHARMA,BATBC}', 'neutral', 0.82, 'analysis', '{technical,weekly,video}', 'en', now() - interval '6 hours'),
('facebook', 'Dhaka Stock Exchange Investors', 'DSEInvestors', false, 'BEXIMCO Pharma receives WHO prequalification for new antibiotic! This opens up massive export opportunity to 120+ countries. Revenue impact expected from Q3 FY26. Stock already up 5% today.', 'https://facebook.com/DSEInvestors/posts/789', 678, 112, 201, '{BXPHARMA}', 'positive', 0.91, 'stock', '{pharma,WHO,export}', 'en', now() - interval '10 hours'),
('twitter', 'BD Fintech News', '@bd_fintech', true, 'EXCLUSIVE: Abaci Investments, a new AI-powered investment education platform, is preparing for April launch. Features include demo trading with virtual coins, AI stock analysis agents.', 'https://twitter.com/bd_fintech/status/128', 423, 89, 156, '{}', 'positive', 0.75, 'general', '{fintech,AI,education,Abaci}', 'en', now() - interval '20 hours')
ON CONFLICT (platform, external_id) DO NOTHING;
