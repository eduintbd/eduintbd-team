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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { addDays, format } from "date-fns";

interface AssignTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    id: string;
    name: string;
    task_template_items: any[];
  };
}

export const AssignTemplateDialog = ({ open, onOpenChange, template }: AssignTemplateDialogProps) => {
  const queryClient = useQueryClient();
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Get current employee (assigner)
  const { data: currentEmployee } = useQuery({
    queryKey: ['current-employee-for-assign'],
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

  // Fetch active employees
  const { data: employees } = useQuery({
    queryKey: ['employees-for-assign'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code, department_id, departments(department_name)')
        .eq('status', 'active')
        .eq('registration_status', 'approved')
        .order('first_name');

      if (error) throw error;
      return data;
    }
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!currentEmployee?.id || selectedEmployees.length === 0) {
        throw new Error("No employees selected");
      }

      const tasksToCreate = [];

      for (const employeeId of selectedEmployees) {
        for (const item of template.task_template_items) {
          const dueDate = addDays(new Date(), item.due_days_offset || 0);
          
          tasksToCreate.push({
            title: item.title,
            description: item.description,
            priority: item.priority || 'medium',
            status: 'pending',
            is_recurring: item.is_recurring || false,
            recurrence_pattern: item.recurrence_pattern,
            visibility_level: item.visibility_level || 'private',
            due_date: format(dueDate, 'yyyy-MM-dd'),
            assigned_to: employeeId,
            assigned_by: currentEmployee.id,
          });
        }
      }

      const { error } = await supabase
        .from('tasks')
        .insert(tasksToCreate);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Tasks assigned to ${selectedEmployees.length} employee(s)`);
      setSelectedEmployees([]);
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error assigning template:', error);
      toast.error("Failed to assign tasks");
    }
  });

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleAll = () => {
    if (selectedEmployees.length === employees?.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees?.map(e => e.id) || []);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Template</DialogTitle>
          <DialogDescription>
            Assign "{template.name}" tasks to selected employees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Select Employees ({selectedEmployees.length} selected)
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleAll}
            >
              {selectedEmployees.length === employees?.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <ScrollArea className="h-64 border rounded-lg">
            <div className="p-2 space-y-1">
              {employees?.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => toggleEmployee(employee.id)}
                >
                  <Checkbox
                    checked={selectedEmployees.includes(employee.id)}
                    onCheckedChange={() => toggleEmployee(employee.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {employee.employee_code} • {(employee.departments as any)?.department_name || 'No Department'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Tasks to assign:</p>
            <div className="space-y-1">
              {template.task_template_items?.map((item: any) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{item.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {item.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={assignMutation.isPending || selectedEmployees.length === 0}
          >
            {assignMutation.isPending ? "Assigning..." : `Assign to ${selectedEmployees.length} Employee(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
