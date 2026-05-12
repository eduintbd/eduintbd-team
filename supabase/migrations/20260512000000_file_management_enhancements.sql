-- File Management Enhancements: audit log, recently viewed, document templates, approval workflow, module attachments

-- Audit log for file activities
CREATE TABLE IF NOT EXISTS file_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES file_items(id) ON DELETE SET NULL,
  folder_id UUID REFERENCES file_folders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'view', 'download', 'upload', 'delete', 'restore', 'share', 'move', 'tag', 'create_doc'
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Recently viewed files
CREATE TABLE IF NOT EXISTS file_recent_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES file_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  viewed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(file_id, user_id)
);

-- Document templates
CREATE TABLE IF NOT EXISTS file_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('doc', 'sheet', 'slide', 'form')),
  google_drive_file_id TEXT, -- source template file in Drive
  category TEXT DEFAULT 'General',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Document approval workflow
CREATE TABLE IF NOT EXISTS file_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES file_items(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  action_type TEXT NOT NULL DEFAULT 'share', -- 'share', 'publish', 'delete'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Module file attachments (links files to POs, employees, HR ops, etc.)
CREATE TABLE IF NOT EXISTS file_module_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES file_items(id) ON DELETE CASCADE,
  module_type TEXT NOT NULL, -- 'purchase_order', 'employee', 'hr_operation', 'department', 'task'
  module_record_id TEXT NOT NULL, -- the UUID/ID of the linked record
  attached_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(file_id, module_type, module_record_id)
);

-- File sharing records
CREATE TABLE IF NOT EXISTS file_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES file_items(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  share_type TEXT NOT NULL DEFAULT 'link' CHECK (share_type IN ('link', 'user', 'department')),
  share_target TEXT, -- email, department_id, or null for link shares
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'comment', 'edit')),
  google_drive_permission_id TEXT,
  link_url TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_file_audit_log_file ON file_audit_log(file_id);
CREATE INDEX IF NOT EXISTS idx_file_audit_log_user ON file_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_file_audit_log_created ON file_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_recent_views_user ON file_recent_views(user_id);
CREATE INDEX IF NOT EXISTS idx_file_recent_views_viewed ON file_recent_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_approvals_status ON file_approvals(status);
CREATE INDEX IF NOT EXISTS idx_file_module_attachments_module ON file_module_attachments(module_type, module_record_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_file ON file_shares(file_id);

-- Enable RLS
ALTER TABLE file_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_recent_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_module_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read audit log" ON file_audit_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit log" ON file_audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can manage their recent views" ON file_recent_views
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read templates" ON file_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage templates" ON file_templates
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read approvals" ON file_approvals
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage approvals" ON file_approvals
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read module attachments" ON file_module_attachments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage module attachments" ON file_module_attachments
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read shares" ON file_shares
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage shares" ON file_shares
  FOR ALL TO authenticated USING (true);

-- Seed document templates
INSERT INTO file_templates (name, description, template_type, category) VALUES
  ('Employment Contract', 'Standard employment contract template', 'doc', 'HR'),
  ('NDA Agreement', 'Non-disclosure agreement template', 'doc', 'Legal'),
  ('Company Policy', 'General company policy document', 'doc', 'Policy'),
  ('Expense Report', 'Monthly expense report spreadsheet', 'sheet', 'Finance'),
  ('Budget Planner', 'Annual budget planning spreadsheet', 'sheet', 'Finance'),
  ('Project Proposal', 'Project proposal presentation', 'slide', 'General'),
  ('Meeting Minutes', 'Meeting minutes document template', 'doc', 'General'),
  ('Invoice Template', 'Standard invoice template', 'sheet', 'Procurement'),
  ('Leave Application', 'Employee leave application form', 'doc', 'HR'),
  ('Performance Review', 'Employee performance review template', 'doc', 'HR')
ON CONFLICT DO NOTHING;
