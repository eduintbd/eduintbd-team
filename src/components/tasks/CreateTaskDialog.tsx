import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Paperclip, X, FileIcon } from "lucide-react";

const taskFormSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200, "Title is too long"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  assignedTo: z.array(z.string()).min(1, "At least one assignee is required"),
  dueDate: z.string().optional(),
  isRecurring: z.boolean(),
  recurrencePattern: z.string().optional(),
  visibilityLevel: z.enum(["private", "team", "department", "public"]),
}).refine((data) => {
  if (data.isRecurring && !data.recurrencePattern) {
    return false;
  }
  return true;
}, {
  message: "Recurrence pattern is required for recurring tasks",
  path: ["recurrencePattern"],
});

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
  const queryClient = useQueryClient();
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      assignedTo: [],
      dueDate: "",
      isRecurring: false,
      recurrencePattern: "",
      visibilityLevel: "private",
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof taskFormSchema>) => {
      // Resolve current employee id reliably (avoid stale cached IDs when session changes)
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        throw new Error("You are not signed in. Please sign out and sign in again.");
      }

      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();

      if (empError) throw empError;
      if (!empData?.id) {
        throw new Error(
          "Your account is not linked to an employee record yet. Please contact an admin."
        );
      }

      const resolvedEmployeeId = empData.id;

      // Insert the task
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: values.title,
          description: values.description || null,
          priority: values.priority,
          assigned_to: values.assignedTo.length === 1 ? values.assignedTo[0] : null,
          assigned_by: resolvedEmployeeId,
          due_date: values.dueDate || null,
          status: "pending",
          is_recurring: values.isRecurring,
          recurrence_pattern: values.isRecurring ? values.recurrencePattern : null,
          visibility_level: values.visibilityLevel,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Insert into task_assignments (supports multi-assignee; keep for single too)
      if (values.assignedTo.length > 0 && taskData) {
        const assignments = values.assignedTo.map((empId) => ({
          task_id: taskData.id,
          employee_id: empId,
        }));

        const { error: assignmentError } = await supabase
          .from("task_assignments")
          .insert(assignments);

        if (assignmentError) throw assignmentError;
      }

      // Upload attachments if any
      if (attachments.length > 0 && taskData) {
        for (const file of attachments) {
          const filePath = `${taskData.id}/${Date.now()}-${file.name}`;

          const { error: uploadError } = await supabase.storage
            .from("task-attachments")
            .upload(filePath, file);

          if (uploadError) {
            console.error("Upload error:", uploadError);
            continue;
          }

          // Save attachment metadata
          const { error: metaError } = await supabase.from("task_attachments").insert({
            task_id: taskData.id,
            employee_id: resolvedEmployeeId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
          });

          if (metaError) console.error("Metadata error:", metaError);
        }
      }
    },
    onSuccess: () => {
      toast.success("Task created successfully!");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      form.reset();
      setAttachments([]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to create task: " + error.message);
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setAttachments([]);
    }
  }, [open, form]);

  const onSubmit = (values: z.infer<typeof taskFormSchema>) => {
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="h-[calc(90vh-200px)] pr-4">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter task title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter task description" 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Priority & Due Date */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Priority & Timeline</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Assignment */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Assignment</h3>
                  
                  <FormField
                    control={form.control}
                    name="assignedTo"
                    render={() => (
                      <FormItem>
                        <FormLabel>Assign To (Select Multiple)</FormLabel>
                        <div className="border rounded-md bg-background">
                          <ScrollArea className="h-48 p-4">
                            <div className="space-y-3">
                              {employees.map((emp) => (
                                <FormField
                                  key={emp.id}
                                  control={form.control}
                                  name="assignedTo"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(emp.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, emp.id])
                                              : field.onChange(
                                                  field.value?.filter((value) => value !== emp.id)
                                                );
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal cursor-pointer">
                                        {emp.first_name} {emp.last_name} ({emp.employee_code})
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Visibility */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Access Control</h3>
                  
                  <FormField
                    control={form.control}
                    name="visibilityLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Who Can View This Task</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="private">Private (Assignees Only)</SelectItem>
                            <SelectItem value="team">Team (Same Department)</SelectItem>
                            <SelectItem value="department">Department Wide</SelectItem>
                            <SelectItem value="public">Public (All Employees)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Recurring */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Recurrence</h3>
                  
                  <FormField
                    control={form.control}
                    name="isRecurring"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Make this a recurring task
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  {form.watch("isRecurring") && (
                    <FormField
                      control={form.control}
                      name="recurrencePattern"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recurrence Pattern</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select pattern" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <Separator />

                {/* Attachments */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Attachments</h3>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                  />
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-dashed"
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Add Attachment
                  </Button>

                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted rounded-md"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              ({formatFileSize(file.size)})
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                            className="h-6 w-6 p-0 flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
