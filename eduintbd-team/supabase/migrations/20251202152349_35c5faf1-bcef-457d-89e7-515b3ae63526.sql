-- Create department_managers junction table for multiple managers per department
CREATE TABLE public.department_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (department_id, employee_id)
);

-- Enable RLS
ALTER TABLE public.department_managers ENABLE ROW LEVEL SECURITY;

-- RLS policies for department_managers
CREATE POLICY "Authenticated users can view department managers"
ON public.department_managers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage department managers"
ON public.department_managers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing manager_id data to junction table
INSERT INTO public.department_managers (department_id, employee_id)
SELECT id, manager_id FROM public.departments WHERE manager_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Rename hr_manager to manager in app_role enum
ALTER TYPE public.app_role RENAME VALUE 'hr_manager' TO 'manager';

-- Update RLS policies that reference hr_manager to use manager instead
-- attendance_records
DROP POLICY IF EXISTS "HR managers and admins can manage attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "HR managers and admins can view all attendance" ON public.attendance_records;

CREATE POLICY "Managers and admins can manage attendance" 
ON public.attendance_records 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers and admins can view all attendance" 
ON public.attendance_records 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- departments
DROP POLICY IF EXISTS "HR managers and admins can manage departments" ON public.departments;

CREATE POLICY "Managers and admins can manage departments" 
ON public.departments 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- employee_leave_balances
DROP POLICY IF EXISTS "HR managers and admins can manage leave balances" ON public.employee_leave_balances;
DROP POLICY IF EXISTS "HR managers and admins can view all leave balances" ON public.employee_leave_balances;

CREATE POLICY "Managers and admins can manage leave balances" 
ON public.employee_leave_balances 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers and admins can view all leave balances" 
ON public.employee_leave_balances 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- employee_payroll
DROP POLICY IF EXISTS "HR managers and admins can manage payroll" ON public.employee_payroll;
DROP POLICY IF EXISTS "HR managers, accountants and admins can view all payroll" ON public.employee_payroll;

CREATE POLICY "Managers and admins can manage payroll" 
ON public.employee_payroll 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers, accountants and admins can view all payroll" 
ON public.employee_payroll 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

-- employee_profile_updates
DROP POLICY IF EXISTS "HR managers and admins can manage pending updates" ON public.employee_profile_updates;
DROP POLICY IF EXISTS "HR managers and admins can view all pending updates" ON public.employee_profile_updates;

CREATE POLICY "Managers and admins can manage pending updates" 
ON public.employee_profile_updates 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers and admins can view all pending updates" 
ON public.employee_profile_updates 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- employees
DROP POLICY IF EXISTS "HR managers and admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "HR managers and admins can view all employees" ON public.employees;

CREATE POLICY "Managers and admins can manage employees" 
ON public.employees 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers and admins can view all employees" 
ON public.employees 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- leave_requests
DROP POLICY IF EXISTS "HR managers and admins can manage leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "HR managers and admins can view all leave requests" ON public.leave_requests;

CREATE POLICY "Managers and admins can manage leave requests" 
ON public.leave_requests 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers and admins can view all leave requests" 
ON public.leave_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- leave_types
DROP POLICY IF EXISTS "HR managers and admins can manage leave types" ON public.leave_types;

CREATE POLICY "Managers and admins can manage leave types" 
ON public.leave_types 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- payroll_items
DROP POLICY IF EXISTS "HR managers, accountants and admins can manage payroll items" ON public.payroll_items;

CREATE POLICY "Managers, accountants and admins can manage payroll items" 
ON public.payroll_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

-- payroll_run_details
DROP POLICY IF EXISTS "HR managers and admins can manage payroll details" ON public.payroll_run_details;
DROP POLICY IF EXISTS "HR managers, accountants and admins can view all payroll detail" ON public.payroll_run_details;

CREATE POLICY "Managers and admins can manage payroll details" 
ON public.payroll_run_details 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers, accountants and admins can view all payroll details" 
ON public.payroll_run_details 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

-- payroll_runs
DROP POLICY IF EXISTS "HR managers and admins can manage payroll runs" ON public.payroll_runs;
DROP POLICY IF EXISTS "HR managers, accountants and admins can view payroll runs" ON public.payroll_runs;

CREATE POLICY "Managers and admins can manage payroll runs" 
ON public.payroll_runs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers, accountants and admins can view payroll runs" 
ON public.payroll_runs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

-- positions
DROP POLICY IF EXISTS "HR managers and admins can manage positions" ON public.positions;

CREATE POLICY "Managers and admins can manage positions" 
ON public.positions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- task_assignments
DROP POLICY IF EXISTS "HR managers and admins can manage task assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "HR managers and admins can view all task assignments" ON public.task_assignments;

CREATE POLICY "Managers and admins can manage task assignments" 
ON public.task_assignments 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers and admins can view all task assignments" 
ON public.task_assignments 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Update can_view_task function to use 'manager' instead of checking department managers differently
CREATE OR REPLACE FUNCTION public.can_view_task(_task_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    -- Admins can see all tasks
    SELECT 1 WHERE public.has_role(_user_id, 'admin'::app_role)
  ) OR EXISTS (
    -- Managers (from department_managers table) can see tasks in their department
    SELECT 1
    FROM tasks t
    JOIN employees e_current ON e_current.user_id = _user_id
    JOIN department_managers dm ON dm.employee_id = e_current.id
    LEFT JOIN employees e_assigned_to ON t.assigned_to = e_assigned_to.id
    LEFT JOIN employees e_assigned_by ON t.assigned_by = e_assigned_by.id
    WHERE t.id = _task_id
      AND (
        e_assigned_to.department_id = dm.department_id
        OR e_assigned_by.department_id = dm.department_id
      )
  ) OR EXISTS (
    -- Employees can see tasks assigned to them or created by them
    SELECT 1
    FROM tasks t
    JOIN employees e ON e.user_id = _user_id
    WHERE t.id = _task_id
      AND (t.assigned_to = e.id OR t.assigned_by = e.id)
  )
$function$;