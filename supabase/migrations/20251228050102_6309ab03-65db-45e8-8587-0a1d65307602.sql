-- Ensure approved + active employees can create tasks

-- Helper: check whether the current user has an approved+active employee record
CREATE OR REPLACE FUNCTION public.is_active_approved_employee(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.user_id = _user_id
      AND COALESCE(e.registration_status, 'pending') = 'approved'
      AND COALESCE(e.status, 'active') = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_active_approved_employee(uuid) TO authenticated;

-- Replace task creation policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tasks'
      AND policyname = 'All employees can create tasks'
  ) THEN
    EXECUTE 'DROP POLICY "All employees can create tasks" ON public.tasks';
  END IF;
END $$;

CREATE POLICY "Approved active employees can create tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_approved_employee(auth.uid()));
