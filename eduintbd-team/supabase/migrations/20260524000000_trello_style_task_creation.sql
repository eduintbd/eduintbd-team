-- Allow any employee to create tasks (Trello-style: all employees can create tasks)

-- Drop the old policy that required approved+active status
DROP POLICY IF EXISTS "Approved active employees can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "All employees can create tasks" ON public.tasks;

-- Any employee with a linked account can create tasks
CREATE POLICY "Employees can create tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
);

-- Allow employees to view tasks they created (assigned_by = their employee id).
-- This is also required so the task_assignments INSERT policy can verify
-- the creator when a non-admin employee assigns the task to others.
CREATE POLICY "Employees can view tasks they created"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  assigned_by IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Allow employees to update/edit tasks they created (mirrors Trello card ownership)
CREATE POLICY "Employees can update tasks they created"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  assigned_by IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);
