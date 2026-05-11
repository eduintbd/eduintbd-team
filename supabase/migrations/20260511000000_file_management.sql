-- File Management Module: tables for Google Drive integration

-- Folder hierarchy (mirrors Google Drive folder structure)
CREATE TABLE IF NOT EXISTS file_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
  google_drive_folder_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

-- File metadata cache
CREATE TABLE IF NOT EXISTS file_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  folder_id UUID REFERENCES file_folders(id) ON DELETE SET NULL,
  google_drive_file_id TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  description TEXT,
  current_version INT DEFAULT 1,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Version history
CREATE TABLE IF NOT EXISTS file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES file_items(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  google_drive_file_id TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  change_notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tag definitions
CREATE TABLE IF NOT EXISTS file_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Many-to-many: files <-> tags
CREATE TABLE IF NOT EXISTS file_item_tags (
  file_id UUID NOT NULL REFERENCES file_items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES file_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (file_id, tag_id)
);

-- Internal access control
CREATE TABLE IF NOT EXISTS file_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES file_items(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  permission_level TEXT NOT NULL CHECK (permission_level IN ('view', 'edit', 'manage')),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (file_id IS NOT NULL OR folder_id IS NOT NULL)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_file_folders_parent ON file_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_file_items_folder ON file_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_file_items_drive_id ON file_items(google_drive_file_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_file ON file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_user ON file_permissions(user_id);

-- Enable RLS
ALTER TABLE file_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read non-deleted items
CREATE POLICY "Authenticated users can read folders" ON file_folders
  FOR SELECT TO authenticated USING (is_deleted = false);

CREATE POLICY "Authenticated users can read files" ON file_items
  FOR SELECT TO authenticated USING (is_deleted = false);

CREATE POLICY "Authenticated users can read versions" ON file_versions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read tags" ON file_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read file tags" ON file_item_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read permissions" ON file_permissions
  FOR SELECT TO authenticated USING (true);

-- Insert/update/delete for authenticated users (edge function uses service role, but direct access also allowed)
CREATE POLICY "Authenticated users can insert folders" ON file_folders
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update folders" ON file_folders
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert files" ON file_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update files" ON file_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert versions" ON file_versions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can manage tags" ON file_tags
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage file tags" ON file_item_tags
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage permissions" ON file_permissions
  FOR ALL TO authenticated USING (true);

-- Seed common tags
INSERT INTO file_tags (name, color) VALUES
  ('HR', '#ef4444'),
  ('Finance', '#f59e0b'),
  ('Procurement', '#3b82f6'),
  ('Policy', '#8b5cf6'),
  ('Contract', '#10b981'),
  ('Template', '#6366f1'),
  ('Report', '#ec4899'),
  ('General', '#6b7280')
ON CONFLICT (name) DO NOTHING;
