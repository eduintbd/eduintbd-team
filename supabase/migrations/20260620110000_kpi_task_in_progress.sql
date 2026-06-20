-- Allow an 'in_progress' state on employee self/daily-task KPIs so managers can
-- track progress (pending -> in_progress -> completed) on the Task Management
-- page, not just a binary pending/completed.

ALTER TABLE public.employee_kpis DROP CONSTRAINT IF EXISTS employee_kpis_status_check;
ALTER TABLE public.employee_kpis
  ADD CONSTRAINT employee_kpis_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed'));
