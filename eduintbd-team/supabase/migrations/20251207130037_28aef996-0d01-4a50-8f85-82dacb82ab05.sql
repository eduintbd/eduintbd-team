-- Allow employees to insert task assignments for tasks they created
CREATE POLICY "Employees can assign tasks they created"
ON public.task_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN employees e ON e.user_id = auth.uid()
    WHERE t.id = task_id AND t.assigned_by = e.id
  )
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'manager')
);