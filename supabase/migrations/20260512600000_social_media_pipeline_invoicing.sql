-- Content pipeline: briefs → creation → review → schedule → publish → report
CREATE TABLE IF NOT EXISTS social_media_content_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES social_media_companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content_type text DEFAULT 'post' CHECK (content_type IN ('post', 'story', 'reel', 'video', 'article', 'ad', 'campaign')),
  platforms text[] DEFAULT '{}',
  status text DEFAULT 'brief' CHECK (status IN ('brief', 'creation', 'review', 'revision', 'approved', 'scheduled', 'published', 'reported')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date date,
  publish_date date,
  content_text text,
  media_urls text[] DEFAULT '{}',
  hashtags text[] DEFAULT '{}',
  assigned_to uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  review_notes text,
  scheduled_post_id uuid REFERENCES social_media_scheduled_posts(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_tasks_company ON social_media_content_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_sm_tasks_status ON social_media_content_tasks(status);
CREATE INDEX IF NOT EXISTS idx_sm_tasks_due ON social_media_content_tasks(due_date);

ALTER TABLE social_media_content_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sm_tasks" ON social_media_content_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage sm_tasks" ON social_media_content_tasks FOR ALL TO authenticated USING (true);

-- Monthly usage tracking per company
CREATE TABLE IF NOT EXISTS social_media_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES social_media_companies(id) ON DELETE CASCADE,
  month date NOT NULL,
  posts_used integer DEFAULT 0,
  posts_limit integer DEFAULT 30,
  channels_used integer DEFAULT 0,
  channels_limit integer DEFAULT 6,
  extra_posts integer DEFAULT 0,
  extra_charges numeric(10,2) DEFAULT 0,
  notes text,
  UNIQUE(company_id, month)
);

ALTER TABLE social_media_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sm_usage" ON social_media_usage FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage sm_usage" ON social_media_usage FOR ALL TO authenticated USING (true);

-- Invoices
CREATE TABLE IF NOT EXISTS social_media_invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL UNIQUE,
  company_id uuid REFERENCES social_media_companies(id) ON DELETE CASCADE,
  month date NOT NULL,
  package_fee numeric(10,2) DEFAULT 0,
  extra_charges numeric(10,2) DEFAULT 0,
  discount numeric(10,2) DEFAULT 0,
  tax numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date date,
  paid_date date,
  payment_method text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_invoices_company ON social_media_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_sm_invoices_status ON social_media_invoices(status);

ALTER TABLE social_media_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sm_invoices" ON social_media_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage sm_invoices" ON social_media_invoices FOR ALL TO authenticated USING (true);

-- Invoice line items
CREATE TABLE IF NOT EXISTS social_media_invoice_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid REFERENCES social_media_invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer DEFAULT 1,
  unit_price numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0
);

ALTER TABLE social_media_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sm_invoice_items" ON social_media_invoice_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage sm_invoice_items" ON social_media_invoice_items FOR ALL TO authenticated USING (true);
