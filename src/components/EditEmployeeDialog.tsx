import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import RequestRoleDialog from "./RequestRoleDialog";

interface EditEmployeeDialogProps {
  employee: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditEmployeeDialog({
  employee,
  open,
  onOpenChange,
}: EditEmployeeDialogProps) {
  const queryClient = useQueryClient();
  const [employeeCode, setEmployeeCode] = useState(employee.employee_code);
  const [departmentId, setDepartmentId] = useState(employee.department_id || "");
  const [positionId, setPositionId] = useState(employee.position_id || "");
  const [isManager, setIsManager] = useState(false);
  const [isAccountant, setIsAccountant] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [isFounder, setIsFounder] = useState(false);

  // Check if current user is the Founder
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: employee } = await supabase
        .from("employees")
        .select("email")
        .eq("user_id", user.id)
        .single();
      
      return employee;
    },
  });

  useEffect(() => {
    if (currentUser) {
      // Check if current user is the founder (syed@eduintbd.com)
      setIsFounder(currentUser.email === "syed@eduintbd.com");
    }
  }, [currentUser]);

  const { data: userRoles } = useQuery({
    queryKey: ["user-roles", employee.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", employee.user_id);
      if (error) throw error;
      return data;
    },
    enabled: !!employee.user_id,
  });

  useEffect(() => {
    setEmployeeCode(employee.employee_code);
    setDepartmentId(employee.department_id || "");
    setPositionId(employee.position_id || "");
    
    if (userRoles) {
      const roles = userRoles.map(r => r.role);
      setIsManager(roles.includes("manager"));
      setIsAccountant(roles.includes("accountant"));
    }
  }, [employee, userRoles]);

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("is_active", true)
        .order("department_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: positions } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("positions")
        .select("*")
        .eq("is_active", true)
        .order("position_title");
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Update employee details
      const { error: employeeError } = await supabase
        .from("employees")
        .update({
          employee_code: employeeCode,
          department_id: departmentId || null,
          position_id: positionId || null,
        })
        .eq("id", employee.id);

      if (employeeError) throw employeeError;

      // Delete all existing roles for this user
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", employee.user_id);

      if (deleteError) throw deleteError;

      // Insert new roles
      const rolesToInsert = [];
      
      if (isManager) {
        rolesToInsert.push({ user_id: employee.user_id, role: "manager" });
      }
      
      if (isAccountant) {
        rolesToInsert.push({ user_id: employee.user_id, role: "accountant" });
      }
      
      // Always ensure at least employee role exists
      if (!isManager && !isAccountant) {
        rolesToInsert.push({ user_id: employee.user_id, role: "employee" });
      }

      if (rolesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(rolesToInsert);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee updated successfully");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update employee");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="employee_code">ID No.</Label>
            <Input
              id="employee_code"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="EDU01"
            />
          </div>
          <div>
            <Label htmlFor="department">Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.department_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="position">Position</Label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {positions?.map((pos) => (
                  <SelectItem key={pos.id} value={pos.id}>
                    {pos.position_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isFounder ? (
            <>
              <div className="space-y-3">
                <Label>Access Roles</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="manager"
                    checked={isManager}
                    onCheckedChange={(checked) => setIsManager(checked as boolean)}
                  />
                  <label
                    htmlFor="manager"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Manager Access
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="accountant"
                    checked={isAccountant}
                    onCheckedChange={(checked) => setIsAccountant(checked as boolean)}
                  />
                  <label
                    htmlFor="accountant"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Accountant/CFO Access
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  All employees have basic employee access by default
                </p>
              </div>
              
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="w-full"
              >
                {updateMutation.isPending ? "Updating..." : "Update Employee"}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">
                  Only the Founder can directly assign higher access roles. If you need elevated permissions, you can submit a request for approval.
                </p>
              </div>
              
              <Button
                onClick={() => setRequestDialogOpen(true)}
                variant="outline"
                className="w-full"
              >
                Request Higher Access
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      <RequestRoleDialog
        employeeId={employee.id}
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
      />
    </Dialog>
  );
}
