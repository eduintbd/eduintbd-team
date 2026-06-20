-- =============================================================================
-- KPI extensions: self-service daily-task KPIs, org-wide common KPIs, and
-- optional file attachments on completion.
--
--  * employee_kpis        - now carries a kind ('manager' | 'self'), a
--                           completion status, an optional task_date and an
--                           optional attachment. Employees may manage their own
--                           rows (daily tasks); managers/admins manage all.
--  * common_kpis          - shared KPI definitions visible to every employee.
--                           Any authenticated user may create one.
--  * common_kpi_completions - per-employee completion of a common KPI, with an
--                           optional attachment.
--  * storage bucket 'kpi-attachments' - private store for completion uploads.
--
-- Reuses: public.has_role(uuid, app_role), public.employees(user_id),
--         public.update_updated_at_column().
-- =============================================================================

-- 1. employee_kpis: completion + daily-task + attachment fields ---------------
ALTER TABLE public.employee_kpis
  ADD COLUMN IF NOT EXISTS kind            TEXT NOT NULL DEFAULT 'manager'
                                           CHECK (kind IN ('manager', 'self')),
  ADD COLUMN IF NOT EXISTS status          TEXT NOT NULL DEFAULT 'pending'
                                           CHECK (status IN ('pending', 'completed')),
  ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS task_date       DATE,
  ADD COLUMN IF NOT EXISTS attachment_url  TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Employees may create / update / complete / delete their OWN KPI rows.
DROP POLICY IF EXISTS "Employees manage own KPIs" ON public.employee_kpis;
CREATE POLICY "Employees manage own KPIs"
ON public.employee_kpis FOR ALL TO authenticated
USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- 2. common_kpis: org-wide shared KPI definitions ----------------------------
CREATE TABLE IF NOT EXISTS public.common_kpis (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  unit          TEXT,
  target_value  NUMERIC(14,2),
  period_label  TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_common_kpis_updated_at ON public.common_kpis;
CREATE TRIGGER trg_common_kpis_updated_at
  BEFORE UPDATE ON public.common_kpis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.common_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view common KPIs"
  ON public.common_kpis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can create common KPIs"
  ON public.common_kpis FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creator or manager can update common KPIs"
  ON public.common_kpis FOR UPDATE TO authenticated
  USING (created_by = auth.uid()
         OR public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'manager'::public.app_role));
CREATE POLICY "Creator or manager can delete common KPIs"
  ON public.common_kpis FOR DELETE TO authenticated
  USING (created_by = auth.uid()
         OR public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'manager'::public.app_role));

-- 3. common_kpi_completions: per-employee completion of a common KPI ---------
CREATE TABLE IF NOT EXISTS public.common_kpi_completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_kpi_id   UUID NOT NULL REFERENCES public.common_kpis(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed')),
  completed_at    TIMESTAMPTZ DEFAULT now(),
  notes           TEXT,
  attachment_url  TEXT,
  attachment_name TEXT,
  created_by      UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (common_kpi_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_common_kpi_completions_emp ON public.common_kpi_completions(employee_id);

DROP TRIGGER IF EXISTS trg_common_kpi_completions_updated_at ON public.common_kpi_completions;
CREATE TRIGGER trg_common_kpi_completions_updated_at
  BEFORE UPDATE ON public.common_kpi_completions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.common_kpi_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View KPI completions"
  ON public.common_kpi_completions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employee or manager manage KPI completions"
  ON public.common_kpi_completions FOR ALL TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'manager'::public.app_role));

-- 4. Storage bucket for optional completion attachments ----------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('kpi-attachments', 'kpi-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated read kpi attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kpi-attachments');
CREATE POLICY "Authenticated upload kpi attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kpi-attachments');
CREATE POLICY "Owner or manager update kpi attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kpi-attachments'
         AND (owner = auth.uid()
              OR public.has_role(auth.uid(), 'admin'::public.app_role)
              OR public.has_role(auth.uid(), 'manager'::public.app_role)));
CREATE POLICY "Owner or manager delete kpi attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kpi-attachments'
         AND (owner = auth.uid()
              OR public.has_role(auth.uid(), 'admin'::public.app_role)
              OR public.has_role(auth.uid(), 'manager'::public.app_role)));
