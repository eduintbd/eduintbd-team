-- Create a function to check if a user is in the Finance department
CREATE OR REPLACE FUNCTION public.is_finance_department(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.departments d ON e.department_id = d.id
    WHERE e.user_id = _user_id
      AND d.department_code = 'FIN'
  )
$$;

-- Update RLS policies to replace 'accountant' with Finance department check

-- chart_of_accounts: Update manage policy
DROP POLICY IF EXISTS "Accountants and admins can manage chart of accounts" ON public.chart_of_accounts;
CREATE POLICY "Admins and Finance dept can manage chart of accounts" 
ON public.chart_of_accounts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_finance_department(auth.uid()));

-- chart_of_accounts: Update view policy
DROP POLICY IF EXISTS "Limited roles can view chart of accounts" ON public.chart_of_accounts;
CREATE POLICY "Admins, managers, and Finance dept can view chart of accounts" 
ON public.chart_of_accounts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_finance_department(auth.uid()));

-- journal_entries: Update manage policy
DROP POLICY IF EXISTS "Accountants and admins can manage journal entries" ON public.journal_entries;
CREATE POLICY "Admins and Finance dept can manage journal entries" 
ON public.journal_entries 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_finance_department(auth.uid()));

-- journal_entries: Update view policy
DROP POLICY IF EXISTS "Accountants, HR managers and admins can view journal entries" ON public.journal_entries;
CREATE POLICY "Admins, managers, and Finance dept can view journal entries" 
ON public.journal_entries 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_finance_department(auth.uid()));

-- journal_entry_lines: Update manage policy
DROP POLICY IF EXISTS "Accountants and admins can manage journal entry lines" ON public.journal_entry_lines;
CREATE POLICY "Admins and Finance dept can manage journal entry lines" 
ON public.journal_entry_lines 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_finance_department(auth.uid()));

-- journal_entry_lines: Update view policy
DROP POLICY IF EXISTS "Accountants, HR managers and admins can view journal entry line" ON public.journal_entry_lines;
CREATE POLICY "Admins, managers, and Finance dept can view journal entry lines" 
ON public.journal_entry_lines 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_finance_department(auth.uid()));

-- assets: Update manage policy
DROP POLICY IF EXISTS "Accountants and admins can manage assets" ON public.assets;
CREATE POLICY "Admins and Finance dept can manage assets" 
ON public.assets 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_finance_department(auth.uid()));

-- assets: Update view policy
DROP POLICY IF EXISTS "Accountants and admins can view all assets" ON public.assets;
CREATE POLICY "Admins and Finance dept can view all assets" 
ON public.assets 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_finance_department(auth.uid()));

-- amortization_schedule: Update manage policy
DROP POLICY IF EXISTS "Accountants and admins can manage amortization schedule" ON public.amortization_schedule;
CREATE POLICY "Admins and Finance dept can manage amortization schedule" 
ON public.amortization_schedule 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_finance_department(auth.uid()));

-- amortization_schedule: Update view policy
DROP POLICY IF EXISTS "Accountants and admins can view amortization schedule" ON public.amortization_schedule;
CREATE POLICY "Admins and Finance dept can view amortization schedule" 
ON public.amortization_schedule 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_finance_department(auth.uid()));

-- employee_payroll: Update view policy to use Finance dept
DROP POLICY IF EXISTS "Managers, accountants and admins can view all payroll" ON public.employee_payroll;
CREATE POLICY "Managers, admins, and Finance dept can view all payroll" 
ON public.employee_payroll 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_finance_department(auth.uid()));

-- payroll_items: Update manage policy
DROP POLICY IF EXISTS "Managers, accountants and admins can manage payroll items" ON public.payroll_items;
CREATE POLICY "Managers, admins, and Finance dept can manage payroll items" 
ON public.payroll_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_finance_department(auth.uid()));

-- payroll_run_details: Update view policy
DROP POLICY IF EXISTS "Managers, accountants and admins can view all payroll details" ON public.payroll_run_details;
CREATE POLICY "Managers, admins, and Finance dept can view all payroll details" 
ON public.payroll_run_details 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_finance_department(auth.uid()));

-- payroll_runs: Update view policy
DROP POLICY IF EXISTS "Managers, accountants and admins can view payroll runs" ON public.payroll_runs;
CREATE POLICY "Managers, admins, and Finance dept can view payroll runs" 
ON public.payroll_runs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_finance_department(auth.uid()));