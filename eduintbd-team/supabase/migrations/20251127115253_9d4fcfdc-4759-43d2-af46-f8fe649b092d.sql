-- Update RLS policy to allow all authenticated users to view all employees
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;

CREATE POLICY "Authenticated users can view all employees"
ON public.employees
FOR SELECT
TO authenticated
USING (true);