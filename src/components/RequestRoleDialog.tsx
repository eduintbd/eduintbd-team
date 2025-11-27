import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface RequestRoleDialogProps {
  employeeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RequestRoleDialog({
  employeeId,
  open,
  onOpenChange,
}: RequestRoleDialogProps) {
  const queryClient = useQueryClient();
  const [requestedRole, setRequestedRole] = useState<string>("");
  const [reason, setReason] = useState("");

  const requestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("role_upgrade_requests")
        .insert({
          employee_id: employeeId,
          requested_role: requestedRole as "hr_manager" | "accountant",
          reason: reason,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-requests"] });
      toast.success("Access request submitted successfully");
      setRequestedRole("");
      setReason("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit request");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Higher Access</DialogTitle>
          <DialogDescription>
            Submit a request to the Founder for elevated access permissions
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="role">Requested Role</Label>
            <Select value={requestedRole} onValueChange={setRequestedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hr_manager">Manager Access</SelectItem>
                <SelectItem value="accountant">Accountant/CFO Access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reason">Reason for Request</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you need this access level..."
              rows={4}
            />
          </div>

          <Button
            onClick={() => requestMutation.mutate()}
            disabled={requestMutation.isPending || !requestedRole || !reason}
            className="w-full"
          >
            {requestMutation.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
