import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
  AlertTriangle,
  Eye,
  CheckCircle2,
  BarChart3,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface ContentTask {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  content_type: string | null;
  platforms: string[];
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  review_notes: string | null;
  created_at: string;
  company_name?: string;
}

const STATUSES = [
  "brief",
  "creation",
  "review",
  "revision",
  "approved",
  "scheduled",
  "published",
  "reported",
];

const STATUS_LABELS: Record<string, string> = {
  brief: "Brief",
  creation: "Creation",
  review: "Review",
  revision: "Revision",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  reported: "Reported",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-gray-100 text-gray-700 border-gray-200",
};

const PLATFORM_OPTIONS = ["facebook", "youtube", "whatsapp", "linkedin", "tiktok", "instagram"];

const CONTENT_TYPES = ["post", "story", "reel", "video", "carousel", "article", "infographic", "ad"];

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "bg-blue-100 text-blue-700",
  youtube: "bg-red-100 text-red-700",
  whatsapp: "bg-green-100 text-green-700",
  linkedin: "bg-blue-100 text-blue-800",
  tiktok: "bg-gray-200 text-gray-800",
  instagram: "bg-pink-100 text-pink-700",
};

const emptyForm = {
  company_id: "",
  title: "",
  description: "",
  content_type: "post",
  platforms: [] as string[],
  priority: "medium",
  due_date: "",
  assigned_to: "",
  review_notes: "",
};

export default function ContentPipeline() {
  const [tasks, setTasks] = useState<ContentTask[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCompany, setFilterCompany] = useState<string>("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editTask, setEditTask] = useState<ContentTask | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: taskData }, { data: compData }, { data: empData }] = await Promise.all([
      supabase
        .from("social_media_content_tasks")
        .select("*, social_media_companies(name)")
        .order("created_at", { ascending: false }),
      supabase.from("social_media_companies").select("id, name").order("name"),
      supabase.from("employees").select("id, first_name, last_name").eq("status", "active").order("first_name"),
    ]);

    const mapped = ((taskData as any[]) || []).map((t: any) => ({
      ...t,
      platforms: t.platforms || [],
      company_name: t.social_media_companies?.name || "Unknown",
    }));

    setTasks(mapped);
    setCompanies((compData as Company[]) || []);
    setEmployees((empData as Employee[]) || []);
    setLoading(false);
  };

  const filteredTasks = filterCompany === "all"
    ? tasks
    : tasks.filter((t) => t.company_id === filterCompany);

  const today = new Date().toISOString().split("T")[0];

  const stats = {
    total: filteredTasks.length,
    overdue: filteredTasks.filter(
      (t) => t.due_date && t.due_date < today && !["published", "reported"].includes(t.status)
    ).length,
    inReview: filteredTasks.filter((t) => t.status === "review").length,
    publishedThisMonth: filteredTasks.filter((t) => {
      const monthPrefix = today.slice(0, 7);
      return t.status === "published" && t.created_at?.startsWith(monthPrefix);
    }).length,
  };

  const moveTask = async (task: ContentTask, direction: "forward" | "back") => {
    const idx = STATUSES.indexOf(task.status);
    const newIdx = direction === "forward" ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= STATUSES.length) return;

    const newStatus = STATUSES[newIdx];
    const { error } = await supabase
      .from("social_media_content_tasks")
      .update({ status: newStatus } as any)
      .eq("id", task.id);

    if (error) {
      toast.error("Failed to move task: " + error.message);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );
    toast.success(`Moved to ${STATUS_LABELS[newStatus]}`);
  };

  const openAdd = () => {
    setForm({ ...emptyForm });
    setAddOpen(true);
  };

  const openEdit = (task: ContentTask) => {
    setForm({
      company_id: task.company_id,
      title: task.title,
      description: task.description || "",
      content_type: task.content_type || "post",
      platforms: task.platforms || [],
      priority: task.priority,
      due_date: task.due_date || "",
      assigned_to: task.assigned_to || "",
      review_notes: task.review_notes || "",
    });
    setEditTask(task);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.company_id) {
      toast.error("Title and company are required");
      return;
    }

    const payload: any = {
      company_id: form.company_id,
      title: form.title.trim(),
      description: form.description || null,
      content_type: form.content_type,
      platforms: form.platforms,
      priority: form.priority,
      due_date: form.due_date || null,
      assigned_to: form.assigned_to || null,
      review_notes: form.review_notes || null,
    };

    if (editTask) {
      const { error } = await supabase
        .from("social_media_content_tasks")
        .update(payload)
        .eq("id", editTask.id);
      if (error) {
        toast.error("Failed to update: " + error.message);
        return;
      }
      toast.success("Task updated");
      setEditTask(null);
    } else {
      payload.status = "brief";
      const { error } = await supabase
        .from("social_media_content_tasks")
        .insert(payload);
      if (error) {
        toast.error("Failed to create: " + error.message);
        return;
      }
      toast.success("Task created");
      setAddOpen(false);
    }

    fetchData();
  };

  const togglePlatform = (platform: string) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const getEmployeeName = (id: string | null) => {
    if (!id) return "";
    const emp = employees.find((e) => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : id;
  };

  const taskFormDialog = (
    open: boolean,
    onClose: () => void,
    title: string
  ) => (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Company</Label>
            <Select value={form.company_id} onValueChange={(v) => setForm((p) => ({ ...p, company_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Content Type</Label>
              <Select value={form.content_type} onValueChange={(v) => setForm((p) => ({ ...p, content_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((ct) => (
                    <SelectItem key={ct} value={ct}>{ct.charAt(0).toUpperCase() + ct.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-3 mt-1">
              {PLATFORM_OPTIONS.map((p) => (
                <label key={p} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={form.platforms.includes(p)}
                    onCheckedChange={() => togglePlatform(p)}
                  />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
            </div>
            <div>
              <Label>Assigned To</Label>
              <Select value={form.assigned_to} onValueChange={(v) => setForm((p) => ({ ...p, assigned_to: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {editTask && (
            <div>
              <Label>Status</Label>
              <Select value={editTask.status} onValueChange={(v) => {
                setEditTask((prev) => prev ? { ...prev, status: v } : prev);
                setForm((p) => ({ ...p }));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Review Notes</Label>
            <Textarea value={form.review_notes} onChange={(e) => setForm((p) => ({ ...p, review_notes: e.target.value }))} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Content Pipeline</h2>
          <p className="text-muted-foreground">Manage content tasks across production stages</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Task
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{stats.overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Eye className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{stats.inReview}</p>
              <p className="text-xs text-muted-foreground">In Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.publishedThisMonth}</p>
              <p className="text-xs text-muted-foreground">Published This Month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {STATUSES.map((status) => {
            const columnTasks = filteredTasks.filter((t) => t.status === status);
            return (
              <div key={status} className="w-[280px] flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">{STATUS_LABELS[status]}</h3>
                  <Badge variant="secondary" className="text-xs">{columnTasks.length}</Badge>
                </div>
                <div className="space-y-3 min-h-[200px] bg-muted/30 rounded-lg p-2">
                  {columnTasks.map((task) => {
                    const isOverdue =
                      task.due_date && task.due_date < today && !["published", "reported"].includes(task.status);
                    return (
                      <Card
                        key={task.id}
                        className={`cursor-pointer hover:shadow-md transition-shadow ${isOverdue ? "border-red-300" : ""}`}
                        onClick={() => openEdit(task)}
                      >
                        <CardContent className="p-3 space-y-2">
                          <p className="font-medium text-sm leading-tight">{task.title}</p>
                          <p className="text-xs text-muted-foreground">{task.company_name}</p>
                          <div className="flex flex-wrap gap-1">
                            {(task.platforms || []).map((p) => (
                              <Badge key={p} variant="outline" className={`text-[10px] px-1.5 py-0 ${PLATFORM_COLORS[p] || ""}`}>
                                {p}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {task.content_type && (
                              <Badge variant="secondary" className="text-[10px]">{task.content_type}</Badge>
                            )}
                            <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                              {task.priority}
                            </Badge>
                          </div>
                          {task.due_date && (
                            <p className={`text-[11px] ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                              Due: {task.due_date}
                            </p>
                          )}
                          {task.assigned_to && (
                            <p className="text-[11px] text-muted-foreground">
                              {getEmployeeName(task.assigned_to)}
                            </p>
                          )}
                          <Separator />
                          <div className="flex justify-between">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              disabled={STATUSES.indexOf(status) === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTask(task, "back");
                              }}
                            >
                              <ChevronLeft className="h-3 w-3 mr-0.5" /> Move
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              disabled={STATUSES.indexOf(status) === STATUSES.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTask(task, "forward");
                              }}
                            >
                              Move <ChevronRight className="h-3 w-3 ml-0.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Dialog */}
      {taskFormDialog(addOpen, () => setAddOpen(false), "Add Task")}

      {/* Edit Dialog */}
      {taskFormDialog(!!editTask, () => setEditTask(null), "Edit Task")}
    </div>
  );
}
