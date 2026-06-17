import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// NOTE: these tables are new; regenerate Supabase types (Lovable does this
// automatically) to drop the `as any` casts below.
const db = supabase as any;

export type ExpensePaymentStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "awaiting_payer"
  | "payment_processing"
  | "paid"
  | "payment_failed";

export interface ExpensePaymentRequest {
  id: string;
  request_number: string;
  amount: number;
  merchant_id: string;
  purpose: string;
  expected_date: string;
  status: ExpensePaymentStatus;
  requested_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  paid_at: string | null;
  bkash_trx_id: string | null;
  payment_error: string | null;
  created_at: string;
}

export interface NewExpenseRequest {
  amount: number;
  merchant_id: string;
  purpose: string;
  expected_date: string;
}

// The single account allowed to approve/reject and execute bKash payments.
// Keep in sync with is_expense_approver() (SQL) and APPROVER_EMAIL (edge fn).
export const EXPENSE_APPROVER_EMAIL = "syed@eduintbd.com";

// True only for the designated approver account.
export function useIsExpenseApprover() {
  return useQuery({
    queryKey: ["is-expense-approver"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return (user?.email ?? "").toLowerCase() === EXPENSE_APPROVER_EMAIL;
    },
  });
}

// RLS returns own rows for employees and all rows for admins — no client filter needed.
export function useExpensePayments() {
  return useQuery({
    queryKey: ["expense-payments"],
    queryFn: async () => {
      const { data, error } = await db
        .from("expense_payment_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExpensePaymentRequest[];
    },
  });
}

export function useCreateExpensePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewExpenseRequest) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await db
        .from("expense_payment_requests")
        .insert({
          amount: input.amount,
          merchant_id: input.merchant_id.trim(),
          purpose: input.purpose.trim(),
          expected_date: input.expected_date,
          requested_by: user.id,
          status: "pending_approval",
        })
        .select()
        .single();
      if (error) throw error;
      return data as ExpensePaymentRequest;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense-payments"] }),
  });
}

// Admin-only. RLS + the DB transition trigger reject this for anyone else.
export function useDecideExpensePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; decision: "approved" | "rejected"; reason?: string }) => {
      const patch: Record<string, unknown> = { status: args.decision };
      if (args.decision === "rejected") patch.rejection_reason = args.reason ?? null;
      const { error } = await db.from("expense_payment_requests").update(patch).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense-payments"] }),
  });
}

// Admin-only. Abandon a payment the payer never completed (awaiting_payer ->
// payment_failed) so it can be retried. RLS + trigger reject this for non-admins.
export function useCancelAwaitingPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("expense_payment_requests")
        .update({ status: "payment_failed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense-payments"] }),
  });
}

// Admin-only. Creates the bKash payment server-side and returns the bkashURL the
// payer must be redirected to. Execution (capture) happens in the bkash-callback
// function after the payer confirms on bKash's hosted page.
export function useExecuteExpensePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("bkash-execute-payment", {
        body: { request_id: id },
      });
      // Edge function returns a JSON error body for handled failures.
      if (error) throw new Error((data as any)?.message ?? error.message);
      if ((data as any)?.error) throw new Error((data as any).message ?? (data as any).error);
      if (!(data as any)?.bkashURL) throw new Error("bKash did not return a payment URL");
      return data as { request_id: string; payment_id: string; bkashURL: string };
    },
    // Row is now 'awaiting_payer'; reflect that immediately.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense-payments"] }),
  });
}
