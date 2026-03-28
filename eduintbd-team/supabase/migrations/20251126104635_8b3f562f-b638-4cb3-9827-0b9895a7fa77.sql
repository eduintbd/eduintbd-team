-- Create table for pending profile updates
CREATE TABLE employee_profile_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  pending_data JSONB NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE employee_profile_updates ENABLE ROW LEVEL SECURITY;

-- Employees can view their own pending updates
CREATE POLICY "Employees can view their own pending updates"
ON employee_profile_updates
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- Employees can create their own update requests
CREATE POLICY "Employees can create their own update requests"
ON employee_profile_updates
FOR INSERT
WITH CHECK (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- HR managers and admins can view all pending updates
CREATE POLICY "HR managers and admins can view all pending updates"
ON employee_profile_updates
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'hr_manager'::app_role)
);

-- HR managers and admins can update (approve/reject) pending updates
CREATE POLICY "HR managers and admins can manage pending updates"
ON employee_profile_updates
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'hr_manager'::app_role)
);

-- Create index for faster queries
CREATE INDEX idx_employee_profile_updates_employee_id ON employee_profile_updates(employee_id);
CREATE INDEX idx_employee_profile_updates_status ON employee_profile_updates(status);