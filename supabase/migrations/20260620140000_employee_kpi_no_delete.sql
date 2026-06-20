-- Employees may create and update (progress + remarks) their own KPI tasks, but
-- must NOT edit-away or delete the record. Replace the broad FOR ALL self policy
-- with INSERT + UPDATE only; DELETE stays with admins/managers via the existing
-- "Managers manage employee KPIs" policy.

DROP POLICY IF EXISTS "Employees manage own KPIs" ON public.employee_kpis;

CREATE POLICY "Employees create own KPIs"
ON public.employee_kpis FOR INSERT TO authenticated
WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Employees update own KPIs"
ON public.employee_kpis FOR UPDATE TO authenticated
USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
