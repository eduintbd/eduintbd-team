import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Pencil,
  Trash2,
  ClipboardList,
} from "lucide-react";

interface FacilityTask {
  id: string;
  name: string;
  category: string;
  frequency: string;
  assigned_to: string | null;
  is_active: boolean;
}

interface FacilityTaskLog {
  id: string;
  task_id: string;
  date: string;
  status: string;
  completed_by: string | null;
  notes: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  cleaning: "bg-blue-100 text-blue-800",
  security: "bg-yellow-100 text-yellow-800",
  kitchen: "bg-green-100 text-green-800",
  general: "bg-gray-100 text-gray-800",
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> },
  completed: { label: "Done", className: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  skipped: { label: "Skipped", className: "bg-gray-100 text-gray-700", icon: <XCircle className="h-3 w-3" /> },
};

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function StaffDuties() {
  const [tasks, setTasks] = useState<FacilityTask[]>([]);
  const [logs, setLogs] = useState<FacilityTaskLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [loading, setLoading] = useState(true);

  // Task dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FacilityTask | null>(null);
  const [taskForm, setTaskForm] = useState({ name: "", category: "cleaning", frequency: "daily", assigned_to: "" });

  // Skip dialog
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [skipLogId, setSkipLogId] = useState<string | null>(null);
  const [skipNotes, setSkipNotes] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      ensureDailyLogsAndFetch();
    }
  }, [selectedDate, tasks]);

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("facility_tasks" as any)
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("name");
    setTasks((data as any) || []);
  };

  const fetchLogs = async () => {
    const { data } = await supabase
      .from("facility_task_logs" as any)
      .select("*")
      .eq("date", selectedDate);
    setLogs((data as any) || []);
    setLoading(false);
  };

  const ensureDailyLogsAndFetch = async () => {
    setLoading(true);
    // Batch insert pending logs for tasks that don't have one yet
    const { data: existingLogs } = await supabase
      .from("facility_task_logs" as any)
      .select("task_id")
      .eq("date", selectedDate);

    const existingTaskIds = new Set((existingLogs as any[] || []).map((l: any) => l.task_id));
    const missingTasks = tasks.filter((t) => !existingTaskIds.has(t.id));

    if (missingTasks.length > 0) {
      await supabase
        .from("facility_task_logs" as any)
        .insert(
          missingTasks.map((t) => ({
            task_id: t.id,
            date: selectedDate,
            status: "pending",
          })) as any
        );
    }

    fetchLogs();
  };

  const markCompleted = async (logId: string) => {
    await supabase
      .from("facility_task_logs" as any)
      .update({ status: "completed" } as any)
      .eq("id", logId);
    toast.success("Task marked as done");
    fetchLogs();
  };

  const openSkipDialog = (logId: string) => {
    setSkipLogId(logId);
    setSkipNotes("");
    setSkipDialogOpen(true);
  };

  const confirmSkip = async () => {
    if (!skipLogId) return;
    await supabase
      .from("facility_task_logs" as any)
      .update({ status: "skipped", notes: skipNotes || null } as any)
      .eq("id", skipLogId);
    toast.success("Task skipped");
    setSkipDialogOpen(false);
    setSkipLogId(null);
    fetchLogs();
  };

  const resetPending = async (logId: string) => {
    await supabase
      .from("facility_task_logs" as any)
      .update({ status: "pending", notes: null, completed_by: null } as any)
      .eq("id", logId);
    toast.success("Reset to pending");
    fetchLogs();
  };

  // Task CRUD
  const openAddTask = () => {
    setEditingTask(null);
    setTaskForm({ name: "", category: "cleaning", frequency: "daily", assigned_to: "" });
    setTaskDialogOpen(true);
  };

  const openEditTask = (task: FacilityTask) => {
    setEditingTask(task);
    setTaskForm({
      name: task.name,
      category: task.category,
      frequency: task.frequency,
      assigned_to: task.assigned_to || "",
    });
    setTaskDialogOpen(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.name) {
      toast.error("Task name is required");
      return;
    }
    const payload = {
      name: taskForm.name,
      category: taskForm.category,
      frequency: taskForm.frequency,
      assigned_to: taskForm.assigned_to || null,
    };

    if (editingTask) {
      await supabase.from("facility_tasks" as any).update(payload as any).eq("id", editingTask.id);
      toast.success("Task updated");
    } else {
      await supabase.from("facility_tasks" as any).insert(payload as any);
      toast.success("Task added");
    }
    setTaskDialogOpen(false);
    fetchTasks();
  };

  const handleDeleteTask = async (id: string) => {
    await supabase.from("facility_tasks" as any).update({ is_active: false } as any).eq("id", id);
    toast.success("Task removed");
    fetchTasks();
  };

  // Merge tasks with logs for display
  const taskLogRows = tasks.map((task) => {
    const log = logs.find((l) => l.task_id === task.id);
    return { task, log };
  });

  const completedCount = taskLogRows.filter((r) => r.log?.status === "completed").length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Staff Duties & Facility Tasks
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="w-40 h-9"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <Button size="sm" onClick={openAddTask}>
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> {completedCount} / {tasks.length} completed
            </Badge>
            {completedCount === tasks.length && tasks.length > 0 && (
              <Badge className="bg-green-100 text-green-800">All tasks done!</Badge>
            )}
          </div>

          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : taskLogRows.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No tasks configured. Add your first task.</p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskLogRows.map(({ task, log }) => {
                    const status = log?.status || "pending";
                    const sc = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
                    return (
                      <TableRow
                        key={task.id}
                        className={status === "completed" ? "bg-green-50/50 dark:bg-green-950/10" : ""}
                      >
                        <TableCell className="font-medium">{task.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[task.category] || CATEGORY_COLORS.general}`}>
                            {task.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">{task.frequency}</TableCell>
                        <TableCell>{task.assigned_to || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 text-xs ${sc.className}`}>
                            {sc.icon} {sc.label}
                          </Badge>
                          {log?.notes && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{log.notes}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {log && status === "pending" && (
                              <>
                                <Button variant="outline" size="sm" className="h-7 text-xs text-green-700" onClick={() => markCompleted(log.id)}>
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                                </Button>
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openSkipDialog(log.id)}>
                                  Skip
                                </Button>
                              </>
                            )}
                            {log && status !== "pending" && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => resetPending(log.id)}>
                                Reset
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTask(task)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTask(task.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit" : "Add"} Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Task Name *</Label>
              <Input value={taskForm.name} onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })} placeholder="e.g. Office Cleaning" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={taskForm.category} onValueChange={(v) => setTaskForm({ ...taskForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={taskForm.frequency} onValueChange={(v) => setTaskForm({ ...taskForm, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Assigned To</Label>
              <Input value={taskForm.assigned_to} onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })} placeholder="Person's name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTask}>{editingTask ? "Save" : "Add Task"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skip Dialog */}
      <Dialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Skip Task</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <Label>Reason (optional)</Label>
            <Input value={skipNotes} onChange={(e) => setSkipNotes(e.target.value)} placeholder="Why was this skipped?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmSkip}>Skip Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
