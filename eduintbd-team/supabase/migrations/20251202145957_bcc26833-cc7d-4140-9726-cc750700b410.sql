
-- Drop and recreate the task creation policy to include hr_manager role
DROP POLICY IF EXISTS "Department managers and admins can create tasks" ON public.tasks;

CREATE POLICY "Managers and admins can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'hr_manager'::app_role)
  OR (EXISTS ( 
    SELECT 1 
    FROM employees e 
    JOIN departments d ON d.manager_id = e.id 
    WHERE e.user_id = auth.uid()
  ))
);
