import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CreatePositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPositionCreated: (positionId: string) => void;
  preselectedDepartmentId?: string;
}

export function CreatePositionDialog({ open, onOpenChange, onPositionCreated, preselectedDepartmentId }: CreatePositionDialogProps) {
  const [positionTitle, setPositionTitle] = useState("");
  const [positionCode, setPositionCode] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState(preselectedDepartmentId || "");
  const queryClient = useQueryClient();

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("positions")
        .insert({
          position_title: positionTitle,
          position_code: positionCode,
          description: description || null,
          department_id: departmentId || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Position created successfully!");
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      onPositionCreated(data.id);
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to create position: " + error.message);
    },
  });

  const resetForm = () => {
    setPositionTitle("");
    setPositionCode("");
    setDescription("");
    setDepartmentId(preselectedDepartmentId || "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Position</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pos-title">Position Title</Label>
            <Input
              id="pos-title"
              value={positionTitle}
              onChange={(e) => setPositionTitle(e.target.value)}
              placeholder="e.g., Senior Accountant"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-code">Position Code</Label>
            <Input
              id="pos-code"
              value={positionCode}
              onChange={(e) => setPositionCode(e.target.value)}
              placeholder="e.g., SR-ACC"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-dept">Department</Label>
            <select
              id="pos-dept"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">No Department</option>
              {departments?.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.department_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-desc">Description (Optional)</Label>
            <Textarea
              id="pos-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Position description"
            />
          </div>
          <Button 
            onClick={() => createMutation.mutate()} 
            disabled={!positionTitle || !positionCode || createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? "Creating..." : "Create Position"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
