import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface EditTaskDialogProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}

export function EditTaskDialog({ task, open, onOpenChange, isAdmin }: EditTaskDialogProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || "");
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, employee_code")
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setStatus(task.status);
    setAssignedTo(task.assigned_to || "");
    setDueDate(task.due_date || "");
  }, [task]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updateData: any = {
        title,
        description: description || null,
        priority,
        status,
        due_date: dueDate || null,
        updated_at: new Date().toISOString(),
      };

      if (isAdmin) {
        updateData.assigned_to = assignedTo || null;
      }

      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", task.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to update task: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to delete task: " + error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-task-title">Task Title *</Label>
            <Input
              id="edit-task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-task-description">Description</Label>
            <Textarea
              id="edit-task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-task-priority">Priority *</Label>
              <select
                id="edit-task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-task-status">Status *</Label>
              <select
                id="edit-task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-task-due-date">Due Date</Label>
              <Input
                id="edit-task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="edit-task-assigned-to">Assign To</Label>
                <select
                  id="edit-task-assigned-to"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {employees?.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={!title || updateMutation.isPending}
              className="flex-1"
            >
              {updateMutation.isPending ? "Updating..." : "Update Task"}
            </Button>
            {isAdmin && (
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
