-- =============================================================================
-- Employee KPIs / Performance
-- Manual, per-employee, per-period KPI entries used by the employee profile page.
-- HR/managers set a metric with an optional target/actual and a 0-100 score;
-- the profile aggregates these into a weighted performance figure alongside the
-- (computed) salary cost, expenses, deals and money-inflow figures.
--
-- Reuses existing primitives: public.has_role(uuid, app_role),
-- public.employees(user_id), public.update_updated_at_column().
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.employee_kpis (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_label  TEXT NOT NULL,                 -- e.g. 'Jun 2026', 'Q2 2026'
  period_start  DATE,
  period_end    DATE,
  metric_name   TEXT NOT NULL,                 -- e.g. 'Deals closed', 'Content delivery'
  target_value  NUMERIC(14,2),
  actual_value  NUMERIC(14,2),
  unit          TEXT,                          -- e.g. '৳', 'deals', '%'
  weight        NUMERIC(5,2) NOT NULL DEFAULT 1 CHECK (weight >= 0),
  score         NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),  -- 0-100
  notes         TEXT,
  created_by    UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_kpis_employee ON public.employee_kpis(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_kpis_period   ON public.employee_kpis(period_start);

CREATE TRIGGER trg_employee_kpis_updated_at
  BEFORE UPDATE ON public.employee_kpis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.employee_kpis ENABLE ROW LEVEL SECURITY;

-- Read: the employee may see their own KPIs; admins and managers see everyone's.
CREATE POLICY "View own or managed employee KPIs"
ON public.employee_kpis FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
  OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

-- Write: only admins and managers may create / change / remove KPI entries.
CREATE POLICY "Managers manage employee KPIs"
ON public.employee_kpis FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
);
