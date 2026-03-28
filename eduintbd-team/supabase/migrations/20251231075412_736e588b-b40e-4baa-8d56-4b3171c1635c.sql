-- Fix task_assignments RLS policies: convert restrictive policies to permissive
-- Restrictive policies are AND-ed together and were blocking non-admin employees from inserting assignments.

DROP POLICY IF EXISTS "Employees can assign tasks they created" ON public.task_assignments;
DROP POLICY IF EXISTS "Employees can view their task assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Managers and admins can manage task assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Managers and admins can view all task assignments" ON public.task_assignments;

-- Employees: can assign tasks they created
CREATE POLICY "Employees can assign tasks they created"
ON public.task_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.employees e ON e.user_id = auth.uid()
    WHERE t.id = task_assignments.task_id
      AND t.assigned_by = e.id
  )
);

-- Employees: can view their own assignments
CREATE POLICY "Employees can view their task assignments"
ON public.task_assignments
FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id
    FROM public.employees
    WHERE user_id = auth.uid()
  )
);

-- Managers/Admins: full access
CREATE POLICY "Managers and admins can manage task assignments"
ON public.task_assignments
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
);

-- Managers/Admins: view access (kept for clarity)
CREATE POLICY "Managers and admins can view all task assignments"
ON public.task_assignments
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
);
