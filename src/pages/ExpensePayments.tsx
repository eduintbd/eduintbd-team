import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Clock, CheckCircle2, XCircle, Loader2, Wallet, AlertTriangle, BadgeDollarSign, ExternalLink } from "lucide-react";
import {
  useExpensePayments, useCreateExpensePayment, useDecideExpensePayment,
  useExecuteExpensePayment, useCancelAwaitingPayment, useIsExpenseApprover, type ExpensePaymentStatus,
} from "@/hooks/useExpensePayments";

const statusConfig: Record<ExpensePaymentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pending_approval:   { label: "Pending Approval",   variant: "outline",     icon: Clock },
  approved:           { label: "Approved",           variant: "default",     icon: CheckCircle2 },
  rejected:           { label: "Rejected",           variant: "destructive", icon: XCircle },
  awaiting_payer:     { label: "Awaiting Payment",   variant: "secondary",   icon: ExternalLink },
  payment_processing: { label: "Processing",         variant: "secondary",   icon: Loader2 },
  paid:               { label: "Paid",               variant: "default",     icon: BadgeDollarSign },
  payment_failed:     { label: "Payment Failed",     variant: "destructive", icon: AlertTriangle },
};

export default function ExpensePayments() {
  const qc = useQueryClient();
  const { data: isApprover = false } = useIsExpenseApprover();

  const { data: requests = [], isLoading } = useExpensePayments();
  const createMut = useCreateExpensePayment();
  const decideMut = useDecideExpensePayment();
  const executeMut = useExecuteExpensePayment();
  const cancelMut = useCancelAwaitingPayment();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: "", merchant_id: "", purpose: "", expected_date: "" });
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const resetForm = () => setForm({ amount: "", merchant_id: "", purpose: "", expected_date: "" });

  const submit = () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return toast.error("Enter a valid amount greater than 0");
    if (!form.merchant_id.trim()) return toast.error("Merchant ID is required");
    if (!form.purpose.trim()) return toast.error("Purpose is required");
    if (!form.expected_date) return toast.error("Expected date is required");

    createMut.mutate(
      { amount, merchant_id: form.merchant_id, purpose: form.purpose, expected_date: form.expected_date },
      {
        onSuccess: () => { toast.success("Request submitted for approval"); resetForm(); setOpen(false); },
        onError: (e: any) => toast.error(e.message ?? "Failed to submit request"),
      },
    );
  };

  const decide = (id: string, decision: "approved" | "rejected", reason?: string) =>
    decideMut.mutate(
      { id, decision, reason },
      {
        onSuccess: () => { toast.success(`Request ${decision}`); setRejectId(null); setRejectReason(""); },
        onError: (e: any) => toast.error(e.message ?? "Action failed"),
      },
    );

  // Create the bKash payment and open the hosted page in a popup. The
  // bkash-callback function runs execute() server-side and marks the row paid.
  // We DON'T rely on window.opener postMessage (it's severed by the cross-origin
  // localhost -> bkash.com -> supabase.co redirects). Instead we poll the DB
  // while the payment window is open, so the row reliably flips to Paid.
  const execute = (id: string) =>
    executeMut.mutate(id, {
      onSuccess: (data) => {
        const popup = window.open(data.bkashURL, "bkash-pay", "width=480,height=760");
        if (!popup) {
          toast.error("Popup blocked. Allow popups for this site, then click Pay again.");
          return;
        }
        toast.info("Complete the payment in the bKash window…");

        let settled = false;
        const refresh = () => qc.invalidateQueries({ queryKey: ["expense-payments"] });
        const stop = () => {
          settled = true;
          window.removeEventListener("message", onMessage);
          window.clearInterval(timer);
        };
        // Fast path if the popup's postMessage does reach us.
        const onMessage = (ev: MessageEvent) => {
          if (ev.data?.type === "bkash-pay-success") { stop(); refresh(); toast.success("Payment completed"); }
          else if (ev.data?.type === "bkash-pay-error") { stop(); refresh(); toast.error(ev.data?.message ?? "Payment was not completed"); }
        };
        window.addEventListener("message", onMessage);

        // Robust path: poll the row's status every 2.5s. Works regardless of
        // postMessage or whether the popup can auto-close. Detects the terminal
        // status itself, plus keeps polling a few times after the popup closes,
        // with a ~3 min safety cap.
        let total = 0, closedTicks = 0;
        const timer = window.setInterval(async () => {
          if (settled) return;
          total++;
          if (popup.closed) closedTicks++;
          // Refetch the active list (also updates the table), then read the row.
          await qc.refetchQueries({ queryKey: ["expense-payments"] }).catch(() => {});
          const list = qc.getQueryData(["expense-payments"]) as { id: string; status: string }[] | undefined;
          const row = list?.find((r) => r.id === id);
          if (row && (row.status === "paid" || row.status === "payment_failed")) {
            stop();
            row.status === "paid"
              ? toast.success("Payment completed")
              : toast.error("Payment was not completed");
          } else if (closedTicks >= 2 || total > 72) {
            stop(); refresh();
          }
        }, 2500);
      },
      onError: (e: any) => toast.error(e.message ?? "Could not start payment"),
    });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" /> Expense Payments
          </h1>
          <p className="text-muted-foreground">
            {isApprover ? "Review, approve, and execute bKash expense payments." : "Submit office expense payment requests for approval."}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Request</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Purchase / Expense Request</DialogTitle>
              <DialogDescription>This is logged as PENDING_APPROVAL and sent to the admin.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (BDT)</Label>
                <Input id="amount" type="number" min="0" step="0.01" value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant ID (bKash receiver)</Label>
                <Input id="merchant" value={form.merchant_id}
                  onChange={(e) => setForm({ ...form, merchant_id: e.target.value })} placeholder="e.g. 01XXXXXXXXX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Textarea id="purpose" value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="What is this expense for?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected">Expected Date</Label>
                <Input id="expected" type="date" value={form.expected_date}
                  onChange={(e) => setForm({ ...form, expected_date: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={createMut.isPending}>
                {createMut.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <CardDescription>{isApprover ? "All employee expense requests." : "Your expense requests."}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="text-muted-foreground">No requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => {
                  const sc = statusConfig[r.status];
                  const Icon = sc.icon;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.request_number}</TableCell>
                      <TableCell>{Number(r.amount).toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{r.merchant_id}</TableCell>
                      <TableCell className="max-w-[220px] truncate" title={r.purpose}>{r.purpose}</TableCell>
                      <TableCell>{r.expected_date ? format(new Date(r.expected_date), "dd MMM yyyy") : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={sc.variant} className="gap-1">
                          <Icon className="h-3 w-3" /> {sc.label}
                        </Badge>
                        {r.status === "payment_failed" && r.payment_error && (
                          <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={r.payment_error}>
                            {r.payment_error}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        {isApprover && r.status === "pending_approval" && (
                          <>
                            <Button size="sm" onClick={() => decide(r.id, "approved")} disabled={decideMut.isPending}>
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setRejectId(r.id)}>
                              Reject
                            </Button>
                          </>
                        )}
                        {isApprover && (r.status === "approved" || r.status === "payment_failed") && (
                          <Button size="sm" onClick={() => execute(r.id)} disabled={executeMut.isPending}>
                            {executeMut.isPending ? "Starting..." : r.status === "payment_failed" ? "Retry Payment" : "Pay via bKash"}
                          </Button>
                        )}
                        {isApprover && r.status === "awaiting_payer" && (
                          <Button size="sm" variant="outline" disabled={cancelMut.isPending}
                            onClick={() => cancelMut.mutate(r.id, {
                              onSuccess: () => toast.success("Payment cancelled; you can retry"),
                              onError: (e: any) => toast.error(e.message ?? "Could not cancel"),
                            })}>
                            Cancel
                          </Button>
                        )}
                        {r.status === "paid" && r.bkash_trx_id && (
                          <span className="text-xs text-muted-foreground font-mono">TRX {r.bkash_trx_id}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reject reason dialog */}
      <Dialog open={!!rejectId} onOpenChange={(o) => { if (!o) { setRejectId(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>Provide a reason. The requester will be notified.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" disabled={decideMut.isPending}
              onClick={() => rejectId && decide(rejectId, "rejected", rejectReason)}>
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
