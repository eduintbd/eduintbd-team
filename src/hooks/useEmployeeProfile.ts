import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Several of the tables touched here (social_media_*, expense_payment_requests,
// employee_kpis) are newer than the committed Supabase types, so we cast through
// `any`, mirroring src/hooks/useExpensePayments.ts.
const db = supabase as any;

export interface EmployeeRecord {
  id: string;
  user_id: string | null;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company_email: string | null;
  hire_date: string | null;
  status: string | null;
  salary: number | null;
  department: { department_name: string } | null;
  position: { position_title: string } | null;
}

export interface PayrollLine {
  id: string;
  amount: number;
  effective_date: string;
  item_name: string;
  item_type: string; // 'earning' | 'deduction' | ...
}

export interface ExpenseLine {
  id: string;
  request_number: string | null;
  amount: number;
  purpose: string;
  status: string;
  expected_date: string | null;
  created_at: string;
}

export interface DealLine {
  id: string;
  title: string;
  status: string;
  content_type: string | null;
  due_date: string | null;
  company_id: string | null;
  company_name: string;
}

export interface InflowLine {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
  month: string | null;
  paid_date: string | null;
  company_id: string | null;
  company_name: string;
}

export interface CompanyRollup {
  company_id: string | null;
  company_name: string;
  dealCount: number;
  invoiceCount: number;
  invoicedTotal: number; // all non-cancelled invoices
  paidTotal: number;     // status === 'paid'
}

export interface EmployeeKpi {
  id: string;
  employee_id: string;
  period_label: string;
  period_start: string | null;
  period_end: string | null;
  metric_name: string;
  target_value: number | null;
  actual_value: number | null;
  unit: string | null;
  weight: number;
  score: number | null;
  notes: string | null;
  created_at: string;
}

export interface EmployeeProfileData {
  employee: EmployeeRecord;
  payroll: PayrollLine[];
  expenses: ExpenseLine[];
  deals: DealLine[];
  inflows: InflowLine[];
  byCompany: CompanyRollup[];
  totals: {
    baseSalary: number;
    payrollEarnings: number;
    payrollDeductions: number;
    monthlyCost: number;       // base salary or net payroll, whichever is known
    expensePaidTotal: number;  // expense requests in a paid state
    expensePendingTotal: number;
    dealCount: number;
    inflowCount: number;
    inflowPaidTotal: number;
    inflowInvoicedTotal: number;
  };
}

const PAID_EXPENSE_STATES = new Set(["paid"]);
const OPEN_EXPENSE_STATES = new Set([
  "pending_approval",
  "approved",
  "awaiting_payer",
  "payment_processing",
  "payment_failed",
]);

export function useEmployeeProfile(employeeId: string | undefined) {
  return useQuery<EmployeeProfileData>({
    enabled: !!employeeId,
    queryKey: ["employee-profile", employeeId],
    queryFn: async () => {
      // 1. Core employee record (+ department / position labels).
      const { data: employee, error: empErr } = await db
        .from("employees")
        .select(
          `id, user_id, employee_code, first_name, last_name, email, phone,
           company_email, hire_date, status, salary,
           department:departments(department_name),
           position:positions(position_title)`
        )
        .eq("id", employeeId)
        .single();
      if (empErr) throw empErr;

      const userId: string | null = employee.user_id ?? null;

      // 2. Everything else in parallel. Deals/expenses/inflows are attributed
      //    to the employee via their auth user id (assigned_to / requested_by /
      //    created_by). If the employee has no linked auth user, they are empty.
      const [payrollRes, companiesRes, expensesRes, dealsRes, inflowsRes] =
        await Promise.all([
          db
            .from("employee_payroll")
            .select("id, amount, effective_date, is_active, payroll_items(item_name, item_type)")
            .eq("employee_id", employeeId)
            .eq("is_active", true)
            .order("effective_date", { ascending: false }),
          db.from("social_media_companies").select("id, name"),
          userId
            ? db
                .from("expense_payment_requests")
                .select("id, request_number, amount, purpose, status, expected_date, created_at")
                .eq("requested_by", userId)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [] }),
          userId
            ? db
                .from("social_media_content_tasks")
                .select("id, title, status, content_type, due_date, company_id")
                .eq("assigned_to", userId)
                .order("due_date", { ascending: false, nullsFirst: false })
            : Promise.resolve({ data: [] }),
          userId
            ? db
                .from("social_media_invoices")
                .select("id, invoice_number, total, status, month, paid_date, company_id")
                .eq("created_by", userId)
                .order("month", { ascending: false })
            : Promise.resolve({ data: [] }),
        ]);

      const companyName = new Map<string, string>(
        (companiesRes.data ?? []).map((c: any) => [c.id, c.name])
      );
      const nameFor = (id: string | null) =>
        (id && companyName.get(id)) || "Unassigned";

      const payroll: PayrollLine[] = (payrollRes.data ?? []).map((p: any) => ({
        id: p.id,
        amount: Number(p.amount) || 0,
        effective_date: p.effective_date,
        item_name: p.payroll_items?.item_name ?? "Item",
        item_type: p.payroll_items?.item_type ?? "earning",
      }));

      const expenses: ExpenseLine[] = (expensesRes.data ?? []).map((e: any) => ({
        id: e.id,
        request_number: e.request_number,
        amount: Number(e.amount) || 0,
        purpose: e.purpose,
        status: e.status,
        expected_date: e.expected_date,
        created_at: e.created_at,
      }));

      const deals: DealLine[] = (dealsRes.data ?? []).map((d: any) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        content_type: d.content_type,
        due_date: d.due_date,
        company_id: d.company_id,
        company_name: nameFor(d.company_id),
      }));

      const inflows: InflowLine[] = (inflowsRes.data ?? []).map((i: any) => ({
        id: i.id,
        invoice_number: i.invoice_number,
        total: Number(i.total) || 0,
        status: i.status,
        month: i.month,
        paid_date: i.paid_date,
        company_id: i.company_id,
        company_name: nameFor(i.company_id),
      }));

      // 3. Roll up deals + inflows by company.
      const rollup = new Map<string, CompanyRollup>();
      const ensure = (id: string | null, name: string): CompanyRollup => {
        const key = id ?? "__none__";
        if (!rollup.has(key)) {
          rollup.set(key, {
            company_id: id,
            company_name: name,
            dealCount: 0,
            invoiceCount: 0,
            invoicedTotal: 0,
            paidTotal: 0,
          });
        }
        return rollup.get(key)!;
      };
      deals.forEach((d) => {
        ensure(d.company_id, d.company_name).dealCount += 1;
      });
      inflows.forEach((i) => {
        const r = ensure(i.company_id, i.company_name);
        if (i.status === "cancelled") return;
        r.invoiceCount += 1;
        r.invoicedTotal += i.total;
        if (i.status === "paid") r.paidTotal += i.total;
      });
      const byCompany = [...rollup.values()].sort(
        (a, b) => b.paidTotal - a.paidTotal || b.dealCount - a.dealCount
      );

      // 4. Totals.
      const payrollEarnings = payroll
        .filter((p) => p.item_type !== "deduction")
        .reduce((s, p) => s + p.amount, 0);
      const payrollDeductions = payroll
        .filter((p) => p.item_type === "deduction")
        .reduce((s, p) => s + p.amount, 0);
      const baseSalary = Number(employee.salary) || 0;
      const netPayroll = payrollEarnings - payrollDeductions;

      const expensePaidTotal = expenses
        .filter((e) => PAID_EXPENSE_STATES.has(e.status))
        .reduce((s, e) => s + e.amount, 0);
      const expensePendingTotal = expenses
        .filter((e) => OPEN_EXPENSE_STATES.has(e.status))
        .reduce((s, e) => s + e.amount, 0);

      const inflowPaidTotal = inflows
        .filter((i) => i.status === "paid")
        .reduce((s, i) => s + i.total, 0);
      const inflowInvoicedTotal = inflows
        .filter((i) => i.status !== "cancelled")
        .reduce((s, i) => s + i.total, 0);

      return {
        employee,
        payroll,
        expenses,
        deals,
        inflows,
        byCompany,
        totals: {
          baseSalary,
          payrollEarnings,
          payrollDeductions,
          monthlyCost: payroll.length > 0 ? netPayroll : baseSalary,
          expensePaidTotal,
          expensePendingTotal,
          dealCount: deals.length,
          inflowCount: inflows.length,
          inflowPaidTotal,
          inflowInvoicedTotal,
        },
      };
    },
  });
}

export function useEmployeeKpis(employeeId: string | undefined) {
  return useQuery<EmployeeKpi[]>({
    enabled: !!employeeId,
    queryKey: ["employee-kpis", employeeId],
    queryFn: async () => {
      const { data, error } = await db
        .from("employee_kpis")
        .select("*")
        .eq("employee_id", employeeId)
        .order("period_start", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EmployeeKpi[];
    },
  });
}

export interface KpiInput {
  id?: string;
  employee_id: string;
  period_label: string;
  period_start?: string | null;
  period_end?: string | null;
  metric_name: string;
  target_value?: number | null;
  actual_value?: number | null;
  unit?: string | null;
  weight?: number;
  score?: number | null;
  notes?: string | null;
}

export function useUpsertKpi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: KpiInput) => {
      const { id, ...fields } = input;
      if (id) {
        const { error } = await db.from("employee_kpis").update(fields).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db.from("employee_kpis").insert(fields);
        if (error) throw error;
      }
    },
    onSuccess: (_d, input) =>
      qc.invalidateQueries({ queryKey: ["employee-kpis", input.employee_id] }),
  });
}

export function useDeleteKpi(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("employee_kpis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-kpis", employeeId] }),
  });
}
