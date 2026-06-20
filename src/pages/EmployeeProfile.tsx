import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useEmployeeProfile,
  useEmployeeKpis,
  useUpsertKpi,
  useDeleteKpi,
  type EmployeeKpi,
  type KpiInput,
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
  CalendarDays, Plus, Pencil, Trash2, Target, BadgeCheck,
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
  employee_id,
  period_label: "",
  metric_name: "",
  target_value: null,
  actual_value: null,
  unit: "",
  weight: 1,
  score: null,
  notes: "",
});

export default function EmployeeProfile() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useEmployeeProfile(employeeId);
  const { data: kpis = [] } = useEmployeeKpis(employeeId);
  const upsertKpi = useUpsertKpi();
  const deleteKpi = useDeleteKpi(employeeId ?? "");

  const [kpiForm, setKpiForm] = useState<KpiInput | null>(null);

  // Who can edit KPIs (admins / managers).
  const { data: canManage = false } = useQuery({
    queryKey: ["current-user-can-manage"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      return (roles ?? []).some((r: any) => ["admin", "manager"].includes(r.role));
    },
  });

  const performance = useMemo(() => {
    const scored = kpis.filter((k) => k.score != null && k.weight > 0);
    const totalWeight = scored.reduce((s, k) => s + Number(k.weight), 0);
    if (totalWeight === 0) return null;
    const weighted = scored.reduce((s, k) => s + Number(k.score) * Number(k.weight), 0);
    return Math.round(weighted / totalWeight);
  }, [kpis]);

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

  const saveKpi = async () => {
    if (!kpiForm) return;
    if (!kpiForm.period_label.trim() || !kpiForm.metric_name.trim()) {
      toast.error("Period and metric name are required");
      return;
    }
    try {
      await upsertKpi.mutateAsync(kpiForm);
      toast.success(kpiForm.id ? "KPI updated" : "KPI added");
      setKpiForm(null);
    } catch (e: any) {
      toast.error("Failed to save KPI: " + e.message);
    }
  };

  const removeKpi = async (k: EmployeeKpi) => {
    if (!confirm(`Delete KPI "${k.metric_name}" (${k.period_label})?`)) return;
    try {
      await deleteKpi.mutateAsync(k.id);
      toast.success("KPI deleted");
    } catch (e: any) {
      toast.error("Failed to delete: " + e.message);
    }
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

      <Tabs defaultValue="overview" className="space-y-4">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" />KPIs & Performance</CardTitle>
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
              {kpis.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No KPIs recorded yet.{canManage ? " Use “Add KPI” to set targets and scores." : ""}
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
                      {kpis.map((k) => (
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

      {/* KPI add/edit dialog */}
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Period start</Label>
                  <Input type="date" value={kpiForm.period_start ?? ""}
                    onChange={(e) => setKpiForm({ ...kpiForm, period_start: e.target.value || null })} />
                </div>
                <div className="space-y-1">
                  <Label>Period end</Label>
                  <Input type="date" value={kpiForm.period_end ?? ""}
                    onChange={(e) => setKpiForm({ ...kpiForm, period_end: e.target.value || null })} />
                </div>
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
            <Button onClick={saveKpi} disabled={upsertKpi.isPending}>
              {upsertKpi.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
