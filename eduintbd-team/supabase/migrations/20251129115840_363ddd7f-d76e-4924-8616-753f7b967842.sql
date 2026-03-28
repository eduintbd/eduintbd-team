-- Create function to check if user can view a task based on department
CREATE OR REPLACE FUNCTION public.can_view_task(_task_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Admins can see all tasks
    SELECT 1 WHERE public.has_role(_user_id, 'admin'::app_role)
  ) OR EXISTS (
    -- Department managers can see tasks in their department
    SELECT 1
    FROM tasks t
    JOIN employees e_current ON e_current.user_id = _user_id
    JOIN departments d ON d.manager_id = e_current.id
    LEFT JOIN employees e_assigned_to ON t.assigned_to = e_assigned_to.id
    LEFT JOIN employees e_assigned_by ON t.assigned_by = e_assigned_by.id
    WHERE t.id = _task_id
      AND (
        e_assigned_to.department_id = d.id
        OR e_assigned_by.department_id = d.id
      )
  ) OR EXISTS (
    -- Employees can see tasks assigned to them
    SELECT 1
    FROM tasks t
    JOIN employees e ON e.user_id = _user_id
    WHERE t.id = _task_id
      AND t.assigned_to = e.id
  )
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Employees can view tasks assigned to them" ON tasks;
DROP POLICY IF EXISTS "HR managers and admins can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Employees can update their assigned tasks" ON tasks;
DROP POLICY IF EXISTS "HR managers and admins can manage all tasks" ON tasks;

-- Create new view policy
CREATE POLICY "Users can view tasks based on department and assignment"
ON tasks
FOR SELECT
TO authenticated
USING (public.can_view_task(id, auth.uid()));

-- Update policy for updates - only assigned employees or department managers/admins
CREATE POLICY "Assigned employees and department managers can update tasks"
ON tasks
FOR UPDATE
TO authenticated
USING (
  public.can_view_task(id, auth.uid())
);

-- Create policy for insert - department managers and admins
CREATE POLICY "Department managers and admins can create tasks"
ON tasks
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM employees e
    JOIN departments d ON d.manager_id = e.id
    WHERE e.user_id = auth.uid()
  )
);

-- Create policy for delete - admins only
CREATE POLICY "Admins can delete tasks"
ON tasks
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));