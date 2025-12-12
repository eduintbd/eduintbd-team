import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit2, ClipboardList, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { CreateTemplateDialog } from "@/components/tasks/CreateTemplateDialog";
import { AssignTemplateDialog } from "@/components/tasks/AssignTemplateDialog";
import { EditTemplateDialog } from "@/components/tasks/EditTemplateDialog";

const TaskTemplates = () => {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Fetch templates with their items
  const { data: templates, isLoading } = useQuery({
    queryKey: ['task-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_templates')
        .select(`
          *,
          task_template_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Toggle auto-assign mutation
  const toggleAutoAssignMutation = useMutation({
    mutationFn: async ({ templateId, autoAssign }: { templateId: string; autoAssign: boolean }) => {
      const { error } = await supabase
        .from('task_templates')
        .update({ auto_assign_on_employee_creation: autoAssign })
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      toast.success("Template updated");
    },
    onError: () => {
      toast.error("Failed to update template");
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      toast.success("Template deleted");
    },
    onError: () => {
      toast.error("Failed to delete template");
    }
  });

  const handleEdit = (template: any) => {
    setSelectedTemplate(template);
    setEditDialogOpen(true);
  };

  const handleAssign = (template: any) => {
    setSelectedTemplate(template);
    setAssignDialogOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Task Templates</h1>
          <p className="text-muted-foreground">
            Create reusable task groups for onboarding and recurring workflows
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      {templates?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first task template to streamline onboarding and recurring tasks
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates?.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTemplateMutation.mutate(template.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Tasks ({template.task_template_items?.length || 0})
                  </p>
                  <div className="space-y-1.5">
                    {template.task_template_items?.slice(0, 4).map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="flex-1 truncate">{item.title}</span>
                        <Badge variant="outline" className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        {item.is_recurring && (
                          <RefreshCw className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                    {(template.task_template_items?.length || 0) > 4 && (
                      <p className="text-xs text-muted-foreground">
                        +{template.task_template_items.length - 4} more tasks
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={template.auto_assign_on_employee_creation}
                      onCheckedChange={(checked) =>
                        toggleAutoAssignMutation.mutate({
                          templateId: template.id,
                          autoAssign: checked
                        })
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      Auto-assign
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAssign(template)}
                  >
                    Assign
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {selectedTemplate && (
        <>
          <AssignTemplateDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            template={selectedTemplate}
          />
          <EditTemplateDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            template={selectedTemplate}
          />
        </>
      )}
    </div>
  );
};

export default TaskTemplates;
