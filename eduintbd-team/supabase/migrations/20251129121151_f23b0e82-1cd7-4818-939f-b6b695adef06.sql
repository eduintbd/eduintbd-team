-- Update the can_view_task function to include HR managers
CREATE OR REPLACE FUNCTION public.can_view_task(_task_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Admins and HR managers can see all tasks
    SELECT 1 WHERE public.has_role(_user_id, 'admin'::app_role) 
      OR public.has_role(_user_id, 'hr_manager'::app_role)
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