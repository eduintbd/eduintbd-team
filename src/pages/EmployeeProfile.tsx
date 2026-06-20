import { useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useEmployeeProfile,
  useEmployeeKpis,
  useUpsertKpi,
  useDeleteKpi,
  useCompleteKpi,
  useCommonKpis,
  useUpsertCommonKpi,
  useDeleteCommonKpi,
  useCommonKpiCompletions,
  useUpsertCompletion,
  uploadKpiAttachment,
  type EmployeeKpi,
  type KpiInput,
  type CommonKpi,
  type CommonKpiInput,
} from "@/hooks/useEmployeeProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft, Wallet, Receipt, Handshake, TrendingUp, Building2, Mail, Phone,
  CalendarDays, Plus, Pencil, Trash2, Target, BadgeCheck, ListTodo, Globe,
  CheckCircle2, Circle, Paperclip,
} from "lucide-react";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(amount || 0);

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" }) : "—";

function StatCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string; sub?: string; icon: any; accent: string;
}) {
  return (
    <Card className={`border-l-4 ${accent}`}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">{label}</div>
            <div className="text-xl md:text-2xl font-bold text-foreground truncate">{value}</div>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

const emptyKpi = (employee_id: string): KpiInput => ({
  employee_id, period_label: "", metric_name: "", target_value: null,
  actual_value: null, unit: "", weight: 1, score: null, notes: "", kind: "manager",
});

const emptyTask = (employee_id: string): KpiInput => ({
  employee_id, period_label: "Daily task", metric_name: "", task_date: "",
  notes: "", kind: "self", status: "pending", weight: 0,
});

const emptyCommon = (): CommonKpiInput => ({
  title: "", description: "", unit: "", target_value: null, period_label: "",
});

export default function EmployeeProfile() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useEmployeeProfile(employeeId);
  const { data: kpis = [] } = useEmployeeKpis(employeeId);
  const { data: commonKpis = [] } = useCommonKpis();
  const { data: completions = [] } = useCommonKpiCompletions(employeeId);

  const upsertKpi = useUpsertKpi();
  const deleteKpi = useDeleteKpi(employeeId ?? "");
  const completeKpi = useCompleteKpi(employeeId ?? "");
  const upsertCommon = useUpsertCommonKpi();
  const deleteCommon = useDeleteCommonKpi();
  const upsertCompletion = useUpsertCompletion(employeeId ?? "");

  const [kpiForm, setKpiForm] = useState<KpiInput | null>(null);
  const [taskForm, setTaskForm] = useState<KpiInput | null>(null);
  const [commonForm, setCommonForm] = useState<CommonKpiInput | null>(null);
  // Completion-with-optional-attachment flow.
  const [completeCtx, setCompleteCtx] =
    useState<{ kind: "self" | "common"; id: string; title: string } | null>(null);
  const [completeFile, setCompleteFile] = useState<File | null>(null);
  const [completeNotes, setCompleteNotes] = useState("");
  const [completing, setCompleting] = useState(false);

  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";

  const { data: currentUserId = null, isLoading: userLoading } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  const { data: canManage = false, isLoading: roleLoading } = useQuery({
    queryKey: ["current-user-can-manage"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      return (roles ?? []).some((r: any) => ["admin", "manager"].includes(r.role));
    },
  });

  const scoredKpis = useMemo(() => kpis.filter((k) => k.kind !== "self"), [kpis]);
  const selfTasks = useMemo(() => kpis.filter((k) => k.kind === "self"), [kpis]);

  const performance = useMemo(() => {
    const scored = scoredKpis.filter((k) => k.score != null && k.weight > 0);
    const totalWeight = scored.reduce((s, k) => s + Number(k.weight), 0);
    if (totalWeight === 0) return null;
    const weighted = scored.reduce((s, k) => s + Number(k.score) * Number(k.weight), 0);
    return Math.round(weighted / totalWeight);
  }, [scoredKpis]);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading profile…</div>;
  if (error || !data) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-destructive">Could not load this employee.</p>
        <Button variant="outline" onClick={() => navigate("/employees")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Employees
        </Button>
      </div>
    );
  }

  const { employee, payroll, expenses, deals, inflows, byCompany, totals } = data;
  const fullName = `${employee.first_name} ${employee.last_name}`;
  const initials = `${employee.first_name?.[0] ?? ""}${employee.last_name?.[0] ?? ""}`.toUpperCase();
  const isOwner = !!currentUserId && currentUserId === employee.user_id;
  const authLoading = userLoading || roleLoading;
  const authorized = isOwner || canManage;
  const completionFor = (commonKpiId: string) =>
    completions.find((c) => c.common_kpi_id === commonKpiId);

  // Regular employees may only view their OWN profile; managers/admins view any.
  if (authLoading) return <div className="p-8 text-muted-foreground">Loading profile…</div>;
  if (!authorized) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-destructive">You don't have access to this employee's profile.</p>
        <Button variant="outline" onClick={() => navigate("/profile")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go to My Profile
        </Button>
      </div>
    );
  }

  const saveKpi = async () => {
    if (!kpiForm) return;
    if (!kpiForm.period_label.trim() || !kpiForm.metric_name.trim()) {
      toast.error("Period and metric name are required");
      return;
    }
    try {
      await upsertKpi.mutateAsync({ ...kpiForm, kind: "manager" });
      toast.success(kpiForm.id ? "KPI updated" : "KPI added");
      setKpiForm(null);
    } catch (e: any) {
      toast.error("Failed to save KPI: " + e.message);
    }
  };

  const saveTask = async () => {
    if (!taskForm) return;
    if (!taskForm.metric_name.trim()) {
      toast.error("Task name is required");
      return;
    }
    try {
      await upsertKpi.mutateAsync({ ...taskForm, kind: "self" });
      toast.success(taskForm.id ? "Task updated" : "Task added");
      setTaskForm(null);
    } catch (e: any) {
      toast.error("Failed to save task: " + e.message);
    }
  };

  const saveCommon = async () => {
    if (!commonForm) return;
    if (!commonForm.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      await upsertCommon.mutateAsync(commonForm);
      toast.success(commonForm.id ? "Common KPI updated" : "Common KPI added");
      setCommonForm(null);
    } catch (e: any) {
      toast.error("Failed to save common KPI: " + e.message);
    }
  };

  const removeKpi = async (k: EmployeeKpi) => {
    if (!confirm(`Delete "${k.metric_name}"?`)) return;
    try {
      await deleteKpi.mutateAsync(k.id);
      toast.success("Deleted");
    } catch (e: any) {
      toast.error("Failed to delete: " + e.message);
    }
  };

  const reopenSelf = async (k: EmployeeKpi) => {
    try {
      await completeKpi.mutateAsync({ id: k.id, completed: false });
    } catch (e: any) {
      toast.error("Failed: " + e.message);
    }
  };

  const submitCompletion = async () => {
    if (!completeCtx) return;
    setCompleting(true);
    try {
      let attach: { attachment_url: string; attachment_name: string } | null = null;
      if (completeFile) attach = await uploadKpiAttachment(completeFile, employee.id);
      if (completeCtx.kind === "self") {
        await completeKpi.mutateAsync({
          id: completeCtx.id, completed: true,
          notes: completeNotes || null,
          attachment_url: attach?.attachment_url ?? undefined,
          attachment_name: attach?.attachment_name ?? undefined,
        });
      } else {
        await upsertCompletion.mutateAsync({
          common_kpi_id: completeCtx.id, completed: true,
          notes: completeNotes || null,
          attachment_url: attach?.attachment_url ?? null,
          attachment_name: attach?.attachment_name ?? null,
        });
      }
      toast.success("Marked completed");
      setCompleteCtx(null);
      setCompleteFile(null);
      setCompleteNotes("");
    } catch (e: any) {
      toast.error("Failed to complete: " + e.message);
    } finally {
      setCompleting(false);
    }
  };

  const openComplete = (
    kind: "self" | "common", id: string, title: string, existingNote?: string | null
  ) => {
    setCompleteFile(null);
    setCompleteNotes(existingNote ?? "");
    setCompleteCtx({ kind, id, title });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <Link to="/employees" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Employees
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
              {initials || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">{fullName}</h1>
                <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                  {employee.status ?? "—"}
                </Badge>
                {isOwner && <Badge variant="outline">You</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {employee.position?.position_title || "—"}
                {employee.department?.department_name ? ` · ${employee.department.department_name}` : ""}
                {` · ${employee.employee_code}`}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{employee.company_email || employee.email}</span>
                {employee.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{employee.phone}</span>}
                <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />Joined {fmtDate(employee.hire_date)}</span>
              </div>
            </div>
            {performance != null && (
              <div className="text-center shrink-0">
                <div className="text-3xl font-bold text-primary">{performance}</div>
                <div className="text-xs text-muted-foreground">Perf. score</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Monthly Cost" value={formatCurrency(totals.monthlyCost)}
          sub={payroll.length > 0 ? "Net payroll" : "Base salary"} icon={Wallet} accent="border-l-primary" />
        <StatCard label="Expenses (paid)" value={formatCurrency(totals.expensePaidTotal)}
          sub={`${formatCurrency(totals.expensePendingTotal)} pending`} icon={Receipt} accent="border-l-warning" />
        <StatCard label="Deals" value={String(totals.dealCount)}
          sub={`${byCompany.filter((c) => c.dealCount > 0).length} companies`} icon={Handshake} accent="border-l-blue-500" />
        <StatCard label="Money Inflow" value={formatCurrency(totals.inflowPaidTotal)}
          sub={`${totals.inflowCount} invoices · ${formatCurrency(totals.inflowInvoicedTotal)} billed`} icon={TrendingUp} accent="border-l-success" />
      </div>

      <Tabs defaultValue={initialTab} className="space-y-4">
        <TabsList className="w-full overflow-x-auto flex sm:inline-flex">
          <TabsTrigger value="overview" className="flex-1 sm:flex-none">Companies</TabsTrigger>
          <TabsTrigger value="compensation" className="flex-1 sm:flex-none">Compensation</TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1 sm:flex-none">Expenses</TabsTrigger>
          <TabsTrigger value="deals" className="flex-1 sm:flex-none">Deals & Inflow</TabsTrigger>
          <TabsTrigger value="performance" className="flex-1 sm:flex-none">Performance</TabsTrigger>
        </TabsList>

        {/* By company */}
        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Contribution by Company</CardTitle></CardHeader>
            <CardContent className="p-0 md:p-6 md:pt-0">
              {byCompany.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No deals or invoices attributed to this employee yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold">Company</th>
                        <th className="text-right px-4 py-2 font-semibold">Deals</th>
                        <th className="text-right px-4 py-2 font-semibold">Invoices</th>
                        <th className="text-right px-4 py-2 font-semibold">Billed</th>
                        <th className="text-right px-4 py-2 font-semibold">Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byCompany.map((c) => (
                        <tr key={c.company_id ?? "none"} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium">{c.company_name}</td>
                          <td className="px-4 py-2 text-right">{c.dealCount}</td>
                          <td className="px-4 py-2 text-right">{c.invoiceCount}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(c.invoicedTotal)}</td>
                          <td className="px-4 py-2 text-right text-success font-medium">{formatCurrency(c.paidTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compensation */}
        <TabsContent value="compensation">
          <Card>
            <CardHeader><CardTitle className="text-base">Salary & Payroll</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><div className="text-xs text-muted-foreground">Base salary</div><div className="font-semibold">{formatCurrency(totals.baseSalary)}</div></div>
                <div><div className="text-xs text-muted-foreground">Payroll earnings</div><div className="font-semibold">{formatCurrency(totals.payrollEarnings)}</div></div>
                <div><div className="text-xs text-muted-foreground">Deductions</div><div className="font-semibold text-destructive">{formatCurrency(totals.payrollDeductions)}</div></div>
                <div><div className="text-xs text-muted-foreground">Monthly cost</div><div className="font-semibold text-primary">{formatCurrency(totals.monthlyCost)}</div></div>
              </div>
              <Separator />
              {payroll.length === 0 ? (
                <p className="text-muted-foreground text-sm">No structured payroll items. Showing base salary only.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold">Item</th>
                        <th className="text-left px-4 py-2 font-semibold">Type</th>
                        <th className="text-left px-4 py-2 font-semibold">Effective</th>
                        <th className="text-right px-4 py-2 font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payroll.map((p) => (
                        <tr key={p.id} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium">{p.item_name}</td>
                          <td className="px-4 py-2"><Badge variant={p.item_type === "deduction" ? "destructive" : "secondary"}>{p.item_type}</Badge></td>
                          <td className="px-4 py-2">{fmtDate(p.effective_date)}</td>
                          <td className={`px-4 py-2 text-right font-medium ${p.item_type === "deduction" ? "text-destructive" : ""}`}>{formatCurrency(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader><CardTitle className="text-base">Expense Requests</CardTitle></CardHeader>
            <CardContent className="p-0 md:p-6 md:pt-0">
              {expenses.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No expense requests submitted by this employee.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold">Request #</th>
                        <th className="text-left px-4 py-2 font-semibold">Purpose</th>
                        <th className="text-left px-4 py-2 font-semibold">Status</th>
                        <th className="text-left px-4 py-2 font-semibold">Expected</th>
                        <th className="text-right px-4 py-2 font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e) => (
                        <tr key={e.id} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-2 font-mono text-xs">{e.request_number ?? "—"}</td>
                          <td className="px-4 py-2">{e.purpose}</td>
                          <td className="px-4 py-2"><Badge variant={e.status === "paid" ? "default" : e.status === "rejected" || e.status === "payment_failed" ? "destructive" : "secondary"}>{e.status.replace(/_/g, " ")}</Badge></td>
                          <td className="px-4 py-2">{fmtDate(e.expected_date)}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deals & inflow */}
        <TabsContent value="deals" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Deals / Content Tasks ({deals.length})</CardTitle></CardHeader>
            <CardContent className="p-0 md:p-6 md:pt-0">
              {deals.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No deals assigned to this employee.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold">Title</th>
                        <th className="text-left px-4 py-2 font-semibold">Company</th>
                        <th className="text-left px-4 py-2 font-semibold">Type</th>
                        <th className="text-left px-4 py-2 font-semibold">Status</th>
                        <th className="text-left px-4 py-2 font-semibold">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deals.map((d) => (
                        <tr key={d.id} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium">{d.title}</td>
                          <td className="px-4 py-2">{d.company_name}</td>
                          <td className="px-4 py-2">{d.content_type ?? "—"}</td>
                          <td className="px-4 py-2"><Badge variant="secondary">{d.status}</Badge></td>
                          <td className="px-4 py-2">{fmtDate(d.due_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Money Inflow / Invoices ({inflows.length})</CardTitle></CardHeader>
            <CardContent className="p-0 md:p-6 md:pt-0">
              {inflows.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No invoices created by this employee.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold">Invoice #</th>
                        <th className="text-left px-4 py-2 font-semibold">Company</th>
                        <th className="text-left px-4 py-2 font-semibold">Month</th>
                        <th className="text-left px-4 py-2 font-semibold">Status</th>
                        <th className="text-right px-4 py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inflows.map((i) => (
                        <tr key={i.id} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-2 font-mono text-xs">{i.invoice_number}</td>
                          <td className="px-4 py-2">{i.company_name}</td>
                          <td className="px-4 py-2">{i.month ? new Date(i.month).toLocaleDateString("en-BD", { year: "numeric", month: "short" }) : "—"}</td>
                          <td className="px-4 py-2"><Badge variant={i.status === "paid" ? "default" : i.status === "overdue" || i.status === "cancelled" ? "destructive" : "secondary"}>{i.status}</Badge></td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(i.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance / KPIs */}
        <TabsContent value="performance" className="space-y-4">
          {/* My daily tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2"><ListTodo className="h-4 w-4" />My Daily Tasks</CardTitle>
              {isOwner && (
                <Button size="sm" onClick={() => setTaskForm(emptyTask(employee.id))}>
                  <Plus className="h-4 w-4 mr-1" /> Add Task
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {selfTasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">
                  {isOwner ? "No tasks yet. Add your daily tasked jobs and mark them done." : "No self-logged tasks."}
                </p>
              ) : (
                <div className="space-y-2">
                  {selfTasks.map((t) => {
                    const done = t.status === "completed";
                    return (
                      <div key={t.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <button
                          disabled={!isOwner}
                          onClick={() => (done ? reopenSelf(t) : openComplete("self", t.id, t.metric_name, t.notes))}
                          className="mt-0.5 disabled:opacity-50"
                          title={done ? "Reopen" : "Mark complete"}
                        >
                          {done
                            ? <CheckCircle2 className="h-5 w-5 text-success" />
                            : <Circle className="h-5 w-5 text-muted-foreground" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm ${done ? "line-through text-muted-foreground" : ""}`}>{t.metric_name}</div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                            {t.task_date && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDate(t.task_date)}</span>}
                            {done && t.completed_at && <span>Done {fmtDate(t.completed_at)}</span>}
                            {t.attachment_url && (
                              <a href={t.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                <Paperclip className="h-3 w-3" />{t.attachment_name || "Attachment"}
                              </a>
                            )}
                          </div>
                          {t.notes && <p className="text-xs text-muted-foreground mt-1">{t.notes}</p>}
                        </div>
                        <Badge variant={done ? "default" : t.status === "in_progress" ? "outline" : "secondary"}>
                          {done ? "Completed" : t.status === "in_progress" ? "In Progress" : "Pending"}
                        </Badge>
                        {/* Employees can only update progress + remarks. Admins
                            and managers may edit or delete the task record. */}
                        {canManage && (
                          <>
                            <Button variant="ghost" size="sm" title="Edit task" onClick={() => setTaskForm({ ...t })}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Delete task" onClick={() => removeKpi(t)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Common KPIs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" />Common KPIs</CardTitle>
              {canManage && (
                <Button size="sm" variant="outline" onClick={() => setCommonForm(emptyCommon())}>
                  <Plus className="h-4 w-4 mr-1" /> Add Common KPI
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {commonKpis.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">
                  No common KPIs defined yet.{canManage ? " Add one that applies to the whole team." : ""}
                </p>
              ) : (
                <div className="space-y-2">
                  {commonKpis.map((ck: CommonKpi) => {
                    const c = completionFor(ck.id);
                    const done = c?.status === "completed";
                    return (
                      <div key={ck.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <button
                          disabled={!isOwner}
                          onClick={() =>
                            done
                              ? upsertCompletion.mutateAsync({ common_kpi_id: ck.id, completed: false }).catch((e: any) => toast.error(e.message))
                              : openComplete("common", ck.id, ck.title, c?.notes)
                          }
                          className="mt-0.5 disabled:opacity-50"
                          title={isOwner ? (done ? "Reopen" : "Mark complete") : ""}
                        >
                          {done
                            ? <CheckCircle2 className="h-5 w-5 text-success" />
                            : <Circle className="h-5 w-5 text-muted-foreground" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{ck.title}</div>
                          {ck.description && <p className="text-xs text-muted-foreground mt-0.5">{ck.description}</p>}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                            {ck.target_value != null && <span>Target: {ck.target_value}{ck.unit ? " " + ck.unit : ""}</span>}
                            {ck.period_label && <span>{ck.period_label}</span>}
                            {done && c?.completed_at && <span>Done {fmtDate(c.completed_at)}</span>}
                            {c?.attachment_url && (
                              <a href={c.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                <Paperclip className="h-3 w-3" />{c.attachment_name || "Attachment"}
                              </a>
                            )}
                          </div>
                        </div>
                        <Badge variant={done ? "default" : "secondary"}>{done ? "Completed" : "Pending"}</Badge>
                        {canManage && (
                          <Button variant="ghost" size="sm" title="Delete common KPI"
                            onClick={async () => {
                              if (!confirm(`Delete common KPI "${ck.title}" for everyone?`)) return;
                              try { await deleteCommon.mutateAsync(ck.id); toast.success("Deleted"); }
                              catch (e: any) { toast.error(e.message); }
                            }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scored / manager KPIs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" />Scored KPIs</CardTitle>
              {canManage && (
                <Button size="sm" onClick={() => setKpiForm(emptyKpi(employee.id))}>
                  <Plus className="h-4 w-4 mr-1" /> Add KPI
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {performance != null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground inline-flex items-center gap-1"><BadgeCheck className="h-4 w-4" />Weighted performance</span>
                    <span className="font-semibold">{performance}/100</span>
                  </div>
                  <Progress value={performance} />
                </div>
              )}
              {scoredKpis.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">
                  No scored KPIs yet.{canManage ? " Use “Add KPI” to set targets and scores." : ""}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Period</th>
                        <th className="text-left px-3 py-2 font-semibold">Metric</th>
                        <th className="text-right px-3 py-2 font-semibold">Target</th>
                        <th className="text-right px-3 py-2 font-semibold">Actual</th>
                        <th className="text-right px-3 py-2 font-semibold">Weight</th>
                        <th className="text-right px-3 py-2 font-semibold">Score</th>
                        {canManage && <th className="px-3 py-2" />}
                      </tr>
                    </thead>
                    <tbody>
                      {scoredKpis.map((k) => (
                        <tr key={k.id} className="border-b hover:bg-muted/30 align-top">
                          <td className="px-3 py-2 whitespace-nowrap">{k.period_label}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{k.metric_name}</div>
                            {k.notes && <div className="text-xs text-muted-foreground">{k.notes}</div>}
                          </td>
                          <td className="px-3 py-2 text-right">{k.target_value != null ? `${k.target_value}${k.unit ? " " + k.unit : ""}` : "—"}</td>
                          <td className="px-3 py-2 text-right">{k.actual_value != null ? `${k.actual_value}${k.unit ? " " + k.unit : ""}` : "—"}</td>
                          <td className="px-3 py-2 text-right">{k.weight}</td>
                          <td className="px-3 py-2 text-right font-semibold">{k.score != null ? `${k.score}` : "—"}</td>
                          {canManage && (
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <Button variant="ghost" size="sm" onClick={() => setKpiForm({ ...k })}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => removeKpi(k)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Scored KPI add/edit dialog */}
      <Dialog open={!!kpiForm} onOpenChange={(o) => !o && setKpiForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{kpiForm?.id ? "Edit KPI" : "Add KPI"}</DialogTitle></DialogHeader>
          {kpiForm && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Period *</Label>
                  <Input value={kpiForm.period_label} placeholder="Jun 2026 / Q2 2026"
                    onChange={(e) => setKpiForm({ ...kpiForm, period_label: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Unit</Label>
                  <Input value={kpiForm.unit ?? ""} placeholder="deals / % / ৳"
                    onChange={(e) => setKpiForm({ ...kpiForm, unit: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Metric *</Label>
                <Input value={kpiForm.metric_name} placeholder="Deals closed, Content delivery…"
                  onChange={(e) => setKpiForm({ ...kpiForm, metric_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Target</Label>
                  <Input type="number" value={kpiForm.target_value ?? ""}
                    onChange={(e) => setKpiForm({ ...kpiForm, target_value: e.target.value === "" ? null : Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Actual</Label>
                  <Input type="number" value={kpiForm.actual_value ?? ""}
                    onChange={(e) => setKpiForm({ ...kpiForm, actual_value: e.target.value === "" ? null : Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Weight</Label>
                  <Input type="number" min={0} step="0.5" value={kpiForm.weight ?? 1}
                    onChange={(e) => setKpiForm({ ...kpiForm, weight: e.target.value === "" ? 0 : Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Score (0–100)</Label>
                <Input type="number" min={0} max={100} value={kpiForm.score ?? ""}
                  onChange={(e) => setKpiForm({ ...kpiForm, score: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea rows={2} value={kpiForm.notes ?? ""}
                  onChange={(e) => setKpiForm({ ...kpiForm, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setKpiForm(null)}>Cancel</Button>
            <Button onClick={saveKpi} disabled={upsertKpi.isPending}>{upsertKpi.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily task add/edit dialog */}
      <Dialog open={!!taskForm} onOpenChange={(o) => !o && setTaskForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{taskForm?.id ? "Edit Task" : "Add Daily Task"}</DialogTitle></DialogHeader>
          {taskForm && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Task *</Label>
                <Input value={taskForm.metric_name} placeholder="What did you work on?"
                  onChange={(e) => setTaskForm({ ...taskForm, metric_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={taskForm.task_date ?? ""}
                  onChange={(e) => setTaskForm({ ...taskForm, task_date: e.target.value || null })} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea rows={2} value={taskForm.notes ?? ""}
                  onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskForm(null)}>Cancel</Button>
            <Button onClick={saveTask} disabled={upsertKpi.isPending}>{upsertKpi.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Common KPI add/edit dialog */}
      <Dialog open={!!commonForm} onOpenChange={(o) => !o && setCommonForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{commonForm?.id ? "Edit Common KPI" : "Add Common KPI"}</DialogTitle></DialogHeader>
          {commonForm && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Title *</Label>
                <Input value={commonForm.title} placeholder="Applies to all employees"
                  onChange={(e) => setCommonForm({ ...commonForm, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea rows={2} value={commonForm.description ?? ""}
                  onChange={(e) => setCommonForm({ ...commonForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Target</Label>
                  <Input type="number" value={commonForm.target_value ?? ""}
                    onChange={(e) => setCommonForm({ ...commonForm, target_value: e.target.value === "" ? null : Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Unit</Label>
                  <Input value={commonForm.unit ?? ""}
                    onChange={(e) => setCommonForm({ ...commonForm, unit: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Period</Label>
                  <Input value={commonForm.period_label ?? ""} placeholder="Monthly"
                    onChange={(e) => setCommonForm({ ...commonForm, period_label: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommonForm(null)}>Cancel</Button>
            <Button onClick={saveCommon} disabled={upsertCommon.isPending}>{upsertCommon.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion + optional attachment dialog */}
      <Dialog open={!!completeCtx} onOpenChange={(o) => !o && setCompleteCtx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Mark completed</DialogTitle></DialogHeader>
          {completeCtx && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{completeCtx.title}</p>
              <div className="space-y-1">
                <Label>Remarks (optional)</Label>
                <Textarea rows={2} placeholder="Add a note about this update…"
                  value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" />Attachment (optional)</Label>
                <Input type="file" onChange={(e) => setCompleteFile(e.target.files?.[0] ?? null)} />
                {completeFile && <p className="text-xs text-muted-foreground">{completeFile.name}</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteCtx(null)}>Cancel</Button>
            <Button onClick={submitCompletion} disabled={completing}>
              {completing ? "Saving…" : <><CheckCircle2 className="h-4 w-4 mr-1" />Mark complete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
