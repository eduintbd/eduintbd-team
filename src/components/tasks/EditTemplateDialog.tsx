import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  isNew?: boolean;
}

interface EditTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    id: string;
    name: string;
    description: string | null;
    auto_assign_on_employee_creation: boolean;
    task_template_items: any[];
  };
}

export const EditTemplateDialog = ({ open, onOpenChange, template }: EditTemplateDialogProps) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [autoAssign, setAutoAssign] = useState(false);
  const [taskItems, setTaskItems] = useState<TaskItem[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);

  useEffect(() => {
    if (template && open) {
      setName(template.name);
      setDescription(template.description || "");
      setAutoAssign(template.auto_assign_on_employee_creation);
      setTaskItems(
        template.task_template_items?.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description || "",
          priority: item.priority || "medium",
          is_recurring: item.is_recurring || false,
          recurrence_pattern: item.recurrence_pattern || "daily",
          due_days_offset: item.due_days_offset || 0,
        })) || []
      );
      setDeletedItemIds([]);
    }
  }, [template, open]);

  const updateTemplateMutation = useMutation({
    mutationFn: async () => {
      // Update the template
      const { error: templateError } = await supabase
        .from('task_templates')
        .update({
          name,
          description: description || null,
          auto_assign_on_employee_creation: autoAssign,
        })
        .eq('id', template.id);

      if (templateError) throw templateError;

      // Delete removed items
      if (deletedItemIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('task_template_items')
          .delete()
          .in('id', deletedItemIds);

        if (deleteError) throw deleteError;
      }

      // Update existing items and insert new ones
      for (const item of taskItems) {
        if (!item.title.trim()) continue;

        if (item.isNew) {
          const { error } = await supabase
            .from('task_template_items')
            .insert({
              template_id: template.id,
              title: item.title,
              description: item.description || null,
              priority: item.priority,
              is_recurring: item.is_recurring,
              recurrence_pattern: item.is_recurring ? item.recurrence_pattern : null,
              due_days_offset: item.due_days_offset,
            });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('task_template_items')
            .update({
              title: item.title,
              description: item.description || null,
              priority: item.priority,
              is_recurring: item.is_recurring,
              recurrence_pattern: item.is_recurring ? item.recurrence_pattern : null,
              due_days_offset: item.due_days_offset,
            })
            .eq('id', item.id);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      toast.success("Template updated successfully");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      toast.error("Failed to update template");
    }
  });

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
        isNew: true,
      },
    ]);
  };

  const removeTaskItem = (item: TaskItem) => {
    if (!item.isNew) {
      setDeletedItemIds([...deletedItemIds, item.id]);
    }
    setTaskItems(taskItems.filter(i => i.id !== item.id));
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
    updateTemplateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task Template</DialogTitle>
          <DialogDescription>
            Modify the template and its tasks
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Template Name *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., New Employee Onboarding"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeTaskItem(item)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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

              {taskItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tasks in this template. Add one above.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateTemplateMutation.isPending}>
              {updateTemplateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
