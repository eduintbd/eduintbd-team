-- HR Enhancement: Attendance overtime tracking + Conveyance bill submission

-- 1a. Enhance attendance_records with overtime tracking
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0;

-- 1b. Create conveyance_bills table
CREATE TABLE IF NOT EXISTS conveyance_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  distance_km NUMERIC(8,2),
  transport_mode TEXT NOT NULL DEFAULT 'bus' CHECK (transport_mode IN (
    'rickshaw', 'bus', 'cng', 'uber', 'taxi', 'own_vehicle', 'other'
  )),
  amount NUMERIC(10,2) NOT NULL,
  purpose TEXT,
  receipt_url TEXT,
  receipt_file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE conveyance_bills ENABLE ROW LEVEL SECURITY;

-- RLS: Employees can view their own conveyance bills
CREATE POLICY "Employees can view own conveyance bills"
ON conveyance_bills FOR SELECT TO authenticated
USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'hr_manager'))
);

-- RLS: Employees can insert their own conveyance bills
CREATE POLICY "Employees can submit conveyance bills"
ON conveyance_bills FOR INSERT TO authenticated
WITH CHECK (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

-- RLS: Managers/admins can update conveyance bills (approve/reject)
CREATE POLICY "Managers can manage conveyance bills"
ON conveyance_bills FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'hr_manager'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'hr_manager'))
);

-- RLS: Service role full access
CREATE POLICY "Service role full access on conveyance_bills"
ON conveyance_bills FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE TRIGGER update_conveyance_bills_updated_at
  BEFORE UPDATE ON conveyance_bills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for conveyance receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('conveyance-receipts', 'conveyance-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for conveyance receipts
CREATE POLICY "Authenticated users can upload conveyance receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'conveyance-receipts');

CREATE POLICY "Authenticated users can view conveyance receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'conveyance-receipts');
