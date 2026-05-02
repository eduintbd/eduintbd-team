-- Add Symphony orchestrator integration fields to tasks table
-- These fields allow Symphony to track and manage tasks autonomously

-- Add identifier column for human-readable task IDs (e.g., TASK-42)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS identifier VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);

-- Create sequence for auto-generating task identifiers
CREATE SEQUENCE IF NOT EXISTS task_identifier_seq START 1;

-- Backfill existing tasks with identifiers
UPDATE public.tasks
SET identifier = 'TASK-' || nextval('task_identifier_seq')
WHERE identifier IS NULL;

-- Make identifier NOT NULL after backfill
ALTER TABLE public.tasks ALTER COLUMN identifier SET NOT NULL;

-- Auto-generate identifier for new tasks via trigger
CREATE OR REPLACE FUNCTION public.generate_task_identifier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.identifier IS NULL THEN
    NEW.identifier := 'TASK-' || nextval('task_identifier_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_task_identifier
BEFORE INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.generate_task_identifier();

-- Service role bypass policies for Symphony server-side access
CREATE POLICY "Service role full access on tasks"
ON public.tasks
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on task_comments"
ON public.task_comments
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
