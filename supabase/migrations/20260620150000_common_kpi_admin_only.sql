-- Restrict creation of org-wide Common KPIs to admins and managers only
-- (previously any authenticated employee could create one). Viewing and
-- completing common KPIs is unchanged for all employees.

DROP POLICY IF EXISTS "Anyone authenticated can create common KPIs" ON public.common_kpis;

CREATE POLICY "Managers create common KPIs"
ON public.common_kpis FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  )
);
