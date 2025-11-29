import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MultiSelect, Option } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { Paperclip, Send, Download, X } from "lucide-react";
import { format } from "date-fns";

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
  const [assignedEmployees, setAssignedEmployees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const { data: comments } = useQuery({
    queryKey: ["task-comments", task.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("task_comments")
        .select("*, employees(first_name, last_name)")
        .eq("task_id", task.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: open,
  });

  const { data: attachments } = useQuery({
    queryKey: ["task-attachments", task.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("task_attachments")
        .select("*, employees(first_name, last_name)")
        .eq("task_id", task.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: open,
  });

  const { data: taskAssignments } = useQuery({
    queryKey: ["task-assignments", task.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_assignments")
        .select("employee_id")
        .eq("task_id", task.id);
      if (error) throw error;
      return data.map((a) => a.employee_id);
    },
    enabled: open && isAdmin,
  });

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.due_date || "");
  }, [task]);

  useEffect(() => {
    if (taskAssignments) {
      setAssignedEmployees(taskAssignments);
    }
  }, [taskAssignments]);

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
        // Set the primary assignee to the first selected employee (backward compatibility)
        updateData.assigned_to = assignedEmployees.length > 0 ? assignedEmployees[0] : null;
      }

      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", task.id);

      if (error) throw error;

      // Update task assignments if admin
      if (isAdmin) {
        // Delete existing assignments
        const { error: deleteError } = await supabase
          .from("task_assignments")
          .delete()
          .eq("task_id", task.id);

        if (deleteError) throw deleteError;

        // Insert new assignments
        if (assignedEmployees.length > 0) {
          const assignments = assignedEmployees.map((empId) => ({
            task_id: task.id,
            employee_id: empId,
          }));

          const { error: insertError } = await supabase
            .from("task_assignments")
            .insert(assignments);

          if (insertError) throw insertError;
        }
      }
    },
    onSuccess: () => {
      toast.success("Task updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-assignments", task.id] });
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

  const addCommentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!employee) throw new Error("Employee not found");

      const { error } = await (supabase as any).from("task_comments").insert({
        task_id: task.id,
        employee_id: employee.id,
        comment: commentText,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comment added!");
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["task-comments", task.id] });
    },
    onError: (error: any) => {
      toast.error("Failed to add comment: " + error.message);
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (fileToUpload: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!employee) throw new Error("Employee not found");

      const fileExt = fileToUpload.name.split(".").pop();
      const fileName = `${task.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(fileName, fileToUpload);

      if (uploadError) throw uploadError;

      const { error: dbError } = await (supabase as any).from("task_attachments").insert({
        task_id: task.id,
        employee_id: employee.id,
        file_name: fileToUpload.name,
        file_path: fileName,
        file_size: fileToUpload.size,
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success("File uploaded!");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["task-attachments", task.id] });
    },
    onError: (error: any) => {
      toast.error("Failed to upload file: " + error.message);
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      const { error: storageError } = await supabase.storage
        .from("task-attachments")
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await (supabase as any)
        .from("task_attachments")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success("Attachment deleted!");
      queryClient.invalidateQueries({ queryKey: ["task-attachments", task.id] });
    },
    onError: (error: any) => {
      toast.error("Failed to delete attachment: " + error.message);
    },
  });

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("task-attachments")
      .download(filePath);

    if (error) {
      toast.error("Failed to download file");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
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
                <Label htmlFor="edit-task-assigned-to">Assign To (Multiple)</Label>
                <MultiSelect
                  options={
                    employees?.map((emp) => ({
                      value: emp.id,
                      label: `${emp.first_name} ${emp.last_name} (${emp.employee_code})`,
                    })) || []
                  }
                  selected={assignedEmployees}
                  onChange={setAssignedEmployees}
                  placeholder="Select employees..."
                />
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

          <Separator className="my-6" />

          {/* Attachments Section */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Attachments</Label>
              <div className="mt-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="flex-1 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => file && uploadFileMutation.mutate(file)}
                    disabled={!file || uploadFileMutation.isPending}
                  >
                    <Paperclip className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                </div>
                {attachments && attachments.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {attachments.map((att: any) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-md"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{att.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded by {att.employees.first_name}{" "}
                            {att.employees.last_name} •{" "}
                            {format(new Date(att.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleDownload(att.file_path, att.file_name)
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              deleteAttachmentMutation.mutate({
                                id: att.id,
                                filePath: att.file_path,
                              })
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Comments Section */}
            <div>
              <Label className="text-base font-semibold">Comments</Label>
              <div className="mt-3 space-y-3">
                {comments && comments.length > 0 && (
                  <ScrollArea className="h-64 rounded-md border p-3">
                    <div className="space-y-3">
                      {comments.map((c: any) => (
                        <div key={c.id} className="space-y-1">
                          <div className="flex items-baseline gap-2">
                            <p className="text-sm font-medium">
                              {c.employees.first_name} {c.employees.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(c.created_at), "MMM d, h:mm a")}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {c.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
                <div className="flex gap-2">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                  />
                  <Button
                    size="sm"
                    onClick={() =>
                      comment.trim() && addCommentMutation.mutate(comment)
                    }
                    disabled={!comment.trim() || addCommentMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
