-- Drop existing task creation policy
DROP POLICY IF EXISTS "Managers and admins can create tasks" ON public.tasks;

-- Create new policy allowing all employees to create tasks
-- Assignment validation will be handled in application code
CREATE POLICY "All employees can create tasks" 
ON public.tasks 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees WHERE user_id = auth.uid()
  )
);