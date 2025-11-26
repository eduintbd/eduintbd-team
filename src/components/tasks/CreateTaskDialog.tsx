import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Array<{ id: string; first_name: string; last_name: string; employee_code: string }>;
  currentEmployeeId?: string;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  employees,
  currentEmployeeId,
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState("");
  const [visibilityLevel, setVisibilityLevel] = useState("private");
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      // Insert the task
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title,
          description: description || null,
          priority,
          assigned_to: assignedTo.length === 1 ? assignedTo[0] : null,
          assigned_by: currentEmployeeId || null,
          due_date: dueDate || null,
          status: "pending",
          is_recurring: isRecurring,
          recurrence_pattern: isRecurring ? recurrencePattern : null,
          visibility_level: visibilityLevel,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // If multiple assignees, insert into task_assignments
      if (assignedTo.length > 0 && taskData) {
        const assignments = assignedTo.map((empId) => ({
          task_id: taskData.id,
          employee_id: empId,
        }));

        const { error: assignmentError } = await supabase
          .from("task_assignments")
          .insert(assignments);

        if (assignmentError) throw assignmentError;
      }
    },
    onSuccess: () => {
      toast.success("Task created successfully!");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to create task: " + error.message);
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssignedTo([]);
    setDueDate("");
    setIsRecurring(false);
    setRecurrencePattern("");
    setVisibilityLevel("private");
  };

  const toggleAssignee = (employeeId: string) => {
    setAssignedTo((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority *</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assign To (Multiple)</Label>
            <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
              {employees.map((emp) => (
                <div key={emp.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`emp-${emp.id}`}
                    checked={assignedTo.includes(emp.id)}
                    onCheckedChange={() => toggleAssignee(emp.id)}
                  />
                  <Label
                    htmlFor={`emp-${emp.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {emp.first_name} {emp.last_name} ({emp.employee_code})
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Who Can View Task</Label>
            <Select value={visibilityLevel} onValueChange={setVisibilityLevel}>
              <SelectTrigger id="visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private (Assignees Only)</SelectItem>
                <SelectItem value="team">Team (Same Department)</SelectItem>
                <SelectItem value="department">Department Wide</SelectItem>
                <SelectItem value="public">Public (All Employees)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
              />
              <Label htmlFor="recurring" className="font-normal cursor-pointer">
                Make this a recurring task
              </Label>
            </div>

            {isRecurring && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="recurrence">Recurrence Pattern</Label>
                <Select value={recurrencePattern} onValueChange={setRecurrencePattern}>
                  <SelectTrigger id="recurrence">
                    <SelectValue placeholder="Select pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!title || (isRecurring && !recurrencePattern) || createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? "Creating..." : "Create Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
