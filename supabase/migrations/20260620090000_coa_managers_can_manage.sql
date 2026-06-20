-- Allow managers (in addition to admins and the Finance department) to create /
-- edit / delete chart-of-accounts entries. Previously the "manage" policy only
-- permitted admins or FIN-department employees, so managers could view the COA
-- but every insert was rejected by RLS ("Error creating account").

DROP POLICY IF EXISTS "Admins and Finance dept can manage chart of accounts"
  ON public.chart_of_accounts;

CREATE POLICY "Admins, managers, and Finance dept can manage chart of accounts"
ON public.chart_of_accounts
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
  OR public.is_finance_department(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
  OR public.is_finance_department(auth.uid())
);
