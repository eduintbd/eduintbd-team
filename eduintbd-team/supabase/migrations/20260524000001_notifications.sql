-- Notifications table
CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'task_assigned',
  reference_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view their own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Employees can mark their notifications as read"
ON public.notifications FOR UPDATE TO authenticated
USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- Allow triggers (SECURITY DEFINER functions) to insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

-- Trigger: fire when a row is inserted into task_assignments
-- This covers both task creation and re-assignment via EditTaskDialog
CREATE OR REPLACE FUNCTION public.handle_task_assignment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_title text;
  v_assigner_name text;
BEGIN
  SELECT title INTO v_task_title FROM public.tasks WHERE id = NEW.task_id;

  -- Try to get the name of whoever created/last updated the task
  SELECT e.first_name || ' ' || e.last_name INTO v_assigner_name
  FROM public.tasks t
  JOIN public.employees e ON e.id = t.assigned_by
  WHERE t.id = NEW.task_id;

  INSERT INTO public.notifications (employee_id, title, message, type, reference_id)
  VALUES (
    NEW.employee_id,
    'New Task Assigned',
    CASE
      WHEN v_assigner_name IS NOT NULL
        THEN v_assigner_name || ' assigned you a task: ' || v_task_title
      ELSE 'You have been assigned a task: ' || v_task_title
    END,
    'task_assigned',
    NEW.task_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_assignment_created
  AFTER INSERT ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_assignment_notification();
