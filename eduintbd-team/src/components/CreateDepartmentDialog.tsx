import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CreateDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDepartmentCreated: (departmentId: string) => void;
}

export function CreateDepartmentDialog({ open, onOpenChange, onDepartmentCreated }: CreateDepartmentDialogProps) {
  const [departmentName, setDepartmentName] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .insert({
          department_name: departmentName,
          department_code: departmentCode,
          description: description || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Department created successfully!");
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      onDepartmentCreated(data.id);
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to create department: " + error.message);
    },
  });

  const resetForm = () => {
    setDepartmentName("");
    setDepartmentCode("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Department</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dept-name">Department Name</Label>
            <Input
              id="dept-name"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              placeholder="e.g., Human Resources"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept-code">Department Code</Label>
            <Input
              id="dept-code"
              value={departmentCode}
              onChange={(e) => setDepartmentCode(e.target.value)}
              placeholder="e.g., HR"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept-desc">Description (Optional)</Label>
            <Textarea
              id="dept-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Department description"
            />
          </div>
          <Button 
            onClick={() => createMutation.mutate()} 
            disabled={!departmentName || !departmentCode || createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? "Creating..." : "Create Department"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
