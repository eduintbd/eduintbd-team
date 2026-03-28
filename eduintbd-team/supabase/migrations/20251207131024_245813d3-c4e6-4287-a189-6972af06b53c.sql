-- Fix the can_view_task function to allow task creators to see their tasks immediately after creation
CREATE OR REPLACE FUNCTION public.can_view_task(_task_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    -- Admins can see all tasks
    SELECT 1 WHERE public.has_role(_user_id, 'admin'::app_role)
  ) OR EXISTS (
    -- Managers (from user_roles) can see all tasks in their department
    SELECT 1
    FROM tasks t
    JOIN employees e_current ON e_current.user_id = _user_id
    JOIN department_managers dm ON dm.employee_id = e_current.id
    LEFT JOIN employees e_assigned_to ON t.assigned_to = e_assigned_to.id
    LEFT JOIN employees e_assigned_by ON t.assigned_by = e_assigned_by.id
    WHERE t.id = _task_id
      AND (
        e_assigned_to.department_id = dm.department_id
        OR e_assigned_by.department_id = dm.department_id
        OR dm.employee_id = e_current.id  -- Department managers can see tasks they're involved in
      )
  ) OR EXISTS (
    -- Employees can see tasks assigned to them, created by them, OR where they are the assigned_by
    SELECT 1
    FROM tasks t
    JOIN employees e ON e.user_id = _user_id
    WHERE t.id = _task_id
      AND (
        t.assigned_to = e.id 
        OR t.assigned_by = e.id
      )
  ) OR EXISTS (
    -- Users with manager role can view all tasks (even if not in department_managers)
    SELECT 1 
    FROM tasks t
    JOIN employees e ON e.user_id = _user_id
    WHERE t.id = _task_id
      AND public.has_role(_user_id, 'manager'::app_role)
  )
$function$;