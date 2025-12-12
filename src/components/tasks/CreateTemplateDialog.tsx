import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface TaskItem {
  id: string;
  title: string;
  description: string;
  priority: string;
  is_recurring: boolean;
  recurrence_pattern: string;
  due_days_offset: number;
}

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateTemplateDialog = ({ open, onOpenChange }: CreateTemplateDialogProps) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [autoAssign, setAutoAssign] = useState(false);
  const [taskItems, setTaskItems] = useState<TaskItem[]>([
    {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      priority: "medium",
      is_recurring: false,
      recurrence_pattern: "daily",
      due_days_offset: 0,
    },
  ]);

  // Get current employee
  const { data: currentEmployee } = useQuery({
    queryKey: ['current-employee-for-template'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      return data;
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      // Create the template
      const { data: template, error: templateError } = await supabase
        .from('task_templates')
        .insert({
          name,
          description: description || null,
          auto_assign_on_employee_creation: autoAssign,
          created_by: currentEmployee?.id || null,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create the template items
      const validItems = taskItems.filter(item => item.title.trim());
      if (validItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('task_template_items')
          .insert(
            validItems.map(item => ({
              template_id: template.id,
              title: item.title,
              description: item.description || null,
              priority: item.priority,
              is_recurring: item.is_recurring,
              recurrence_pattern: item.is_recurring ? item.recurrence_pattern : null,
              due_days_offset: item.due_days_offset,
            }))
          );

        if (itemsError) throw itemsError;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      toast.success("Template created successfully");
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast.error("Failed to create template");
    }
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setAutoAssign(false);
    setTaskItems([
      {
        id: crypto.randomUUID(),
        title: "",
        description: "",
        priority: "medium",
        is_recurring: false,
        recurrence_pattern: "daily",
        due_days_offset: 0,
      },
    ]);
  };

  const addTaskItem = () => {
    setTaskItems([
      ...taskItems,
      {
        id: crypto.randomUUID(),
        title: "",
        description: "",
        priority: "medium",
        is_recurring: false,
        recurrence_pattern: "daily",
        due_days_offset: 0,
      },
    ]);
  };

  const removeTaskItem = (id: string) => {
    if (taskItems.length > 1) {
      setTaskItems(taskItems.filter(item => item.id !== id));
    }
  };

  const updateTaskItem = (id: string, field: keyof TaskItem, value: any) => {
    setTaskItems(taskItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (!taskItems.some(item => item.title.trim())) {
      toast.error("At least one task is required");
      return;
    }
    createTemplateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Task Template</DialogTitle>
          <DialogDescription>
            Create a reusable task group for onboarding or recurring workflows
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., New Employee Onboarding"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this template..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Switch
                checked={autoAssign}
                onCheckedChange={setAutoAssign}
              />
              <div>
                <Label className="font-medium">Auto-assign to new employees</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create these tasks when a new employee is approved
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Tasks</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTaskItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>

            <div className="space-y-4">
              {taskItems.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 border rounded-lg space-y-3 bg-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Task {index + 1}
                    </span>
                    {taskItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeTaskItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3">
                    <Input
                      value={item.title}
                      onChange={(e) => updateTaskItem(item.id, 'title', e.target.value)}
                      placeholder="Task title *"
                    />

                    <Textarea
                      value={item.description}
                      onChange={(e) => updateTaskItem(item.id, 'description', e.target.value)}
                      placeholder="Task description (optional)"
                      rows={2}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Priority</Label>
                        <Select
                          value={item.priority}
                          onValueChange={(value) => updateTaskItem(item.id, 'priority', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Due (days after assignment)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.due_days_offset}
                          onChange={(e) => updateTaskItem(item.id, 'due_days_offset', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.is_recurring}
                          onCheckedChange={(checked) => updateTaskItem(item.id, 'is_recurring', checked)}
                        />
                        <Label className="text-sm flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          Recurring
                        </Label>
                      </div>

                      {item.is_recurring && (
                        <Select
                          value={item.recurrence_pattern}
                          onValueChange={(value) => updateTaskItem(item.id, 'recurrence_pattern', value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTemplateMutation.isPending}>
              {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
