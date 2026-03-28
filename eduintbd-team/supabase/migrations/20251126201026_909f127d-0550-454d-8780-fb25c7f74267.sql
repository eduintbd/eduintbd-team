-- Add new fields to tasks table for recurring tasks and access control
ALTER TABLE tasks 
ADD COLUMN is_recurring BOOLEAN DEFAULT false,
ADD COLUMN recurrence_pattern VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'yearly'
ADD COLUMN visibility_level VARCHAR(50) DEFAULT 'private'; -- 'private', 'team', 'department', 'public'

-- Create task_assignments table for multiple assignees
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(task_id, employee_id)
);

-- Enable RLS on task_assignments
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_assignments
CREATE POLICY "Employees can view their task assignments"
ON task_assignments FOR SELECT
USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

CREATE POLICY "HR managers and admins can view all task assignments"
ON task_assignments FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')
);

CREATE POLICY "HR managers and admins can manage task assignments"
ON task_assignments FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')
);

-- Add index for better query performance
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_employee_id ON task_assignments(employee_id);