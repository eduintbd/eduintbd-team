import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Paperclip, CalendarDays, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const db = supabase as any;

type KpiTaskStatus = "pending" | "in_progress" | "completed";

interface KpiTask {
  id: string;
  employee_id: string;
  metric_name: string;
  task_date: string | null;
  status: KpiTaskStatus;
  completed_at: string | null;
  notes: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
  employee: {
    first_name: string;
    last_name: string;
    employee_code: string;
  } | null;
}

const STATUS_META: Record<KpiTaskStatus, { label: string; variant: "secondary" | "default" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "outline" },
  completed: { label: "Completed", variant: "default" },
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" }) : "—";

export function KpiTaskManagementPanel({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | KpiTaskStatus>("all");

  const { data: tasks = [], isLoading } = useQuery<KpiTask[]>({
    queryKey: ["kpi-tasks"],
    queryFn: async () => {
      const { data, error } = await db
        .from("employee_kpis")
        .select(
          `id, employee_id, metric_name, task_date, status, completed_at, notes,
           attachment_url, attachment_name, created_at,
           employee:employees(first_name, last_name, employee_code)`
        )
        .eq("kind", "self")
        .order("task_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KpiTask[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: KpiTaskStatus }) => {
      const { error } = await db
        .from("employee_kpis")
        .update({
          status,
          completed_at: status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi-tasks"] });
      toast.success("Task progress updated");
    },
    onError: (e: any) => toast.error("Failed to update: " + e.message),
  });

  const filtered = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((t) => t.status === filter)),
    [tasks, filter]
  );

  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  }), [tasks]);

  if (isLoading) return <div className="py-8 text-muted-foreground text-sm">Loading employee KPI tasks…</div>;

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="text-base">Employee KPI Tasks</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Daily tasks self-logged by employees. {canEdit ? "Update progress here." : ""}
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({stats.total})</SelectItem>
            <SelectItem value="pending">Pending ({stats.pending})</SelectItem>
            <SelectItem value="in_progress">In Progress ({stats.in_progress})</SelectItem>
            <SelectItem value="completed">Completed ({stats.completed})</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0 md:p-6 md:pt-0">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">No employee KPI tasks{filter !== "all" ? ` (${STATUS_META[filter as KpiTaskStatus].label.toLowerCase()})` : ""}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Employee</th>
                  <th className="text-left px-4 py-2 font-semibold">Task</th>
                  <th className="text-left px-4 py-2 font-semibold">Date</th>
                  <th className="text-left px-4 py-2 font-semibold">Attachment</th>
                  <th className="text-left px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-muted/30 align-top">
                    <td className="px-4 py-2">
                      {t.employee ? (
                        <Link to={`/employees/${t.employee_id}`} className="font-medium hover:text-primary hover:underline inline-flex items-center gap-1">
                          {t.employee.first_name} {t.employee.last_name}
                        </Link>
                      ) : "—"}
                      {t.employee && <div className="text-xs text-muted-foreground">{t.employee.employee_code}</div>}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{t.metric_name}</div>
                      {t.notes && <div className="text-xs text-muted-foreground">{t.notes}</div>}
                      {t.status === "completed" && t.completed_at && (
                        <div className="text-xs text-success">Done {fmtDate(t.completed_at)}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />{fmtDate(t.task_date)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {t.attachment_url ? (
                        <a href={t.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          <Paperclip className="h-3 w-3" />{t.attachment_name || "File"}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      {canEdit ? (
                        <Select
                          value={t.status}
                          onValueChange={(v) => setStatus.mutate({ id: t.id, status: v as KpiTaskStatus })}
                        >
                          <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={STATUS_META[t.status].variant}>{STATUS_META[t.status].label}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
