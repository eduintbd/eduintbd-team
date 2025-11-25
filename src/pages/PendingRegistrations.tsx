import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Plus } from "lucide-react";
import { CreateDepartmentDialog } from "@/components/CreateDepartmentDialog";
import { CreatePositionDialog } from "@/components/CreatePositionDialog";

export default function PendingRegistrations() {
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRejectEmployee, setSelectedRejectEmployee] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [salary, setSalary] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [createDeptDialogOpen, setCreateDeptDialogOpen] = useState(false);
  const [createPosDialogOpen, setCreatePosDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: pendingEmployees, isLoading } = useQuery({
    queryKey: ["pending-registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("registration_status", "pending")
        .order("created_at", { ascending: false });
      
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
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

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

  const approveMutation = useMutation({
    mutationFn: async () => {
      // Update employee
      const { error: updateError } = await supabase
        .from("employees")
        .update({
          registration_status: "approved",
          company_email: companyEmail,
          salary: parseFloat(salary),
          hire_date: joiningDate,
          position_id: position,
          department_id: department,
        })
        .eq("id", selectedEmployee.id);

      if (updateError) throw updateError;

      // Get position and department names for email
      const { data: posData } = await supabase
        .from("positions")
        .select("position_title")
        .eq("id", position)
        .single();

      const { data: deptData } = await supabase
        .from("departments")
        .select("department_name")
        .eq("id", department)
        .single();

      // Send approval email
      const { error: emailError } = await supabase.functions.invoke("send-approval-email", {
        body: {
          email: selectedEmployee.email,
          firstName: selectedEmployee.first_name,
          lastName: selectedEmployee.last_name,
          status: "approved",
          position: posData?.position_title || "N/A",
          department: deptData?.department_name || "N/A",
          companyEmail,
          joiningDate,
        },
      });

      if (emailError) {
        console.error("Email sending failed:", emailError);
        toast.warning("Registration approved but email notification failed");
      }
    },
    onSuccess: () => {
      toast.success("Registration approved and email sent!");
      queryClient.invalidateQueries({ queryKey: ["pending-registrations"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to approve registration: " + error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { error: updateError } = await supabase
        .from("employees")
        .update({ registration_status: "rejected" })
        .eq("id", selectedRejectEmployee.id);

      if (updateError) throw updateError;

      // Send rejection email
      const { error: emailError } = await supabase.functions.invoke("send-approval-email", {
        body: {
          email: selectedRejectEmployee.email,
          firstName: selectedRejectEmployee.first_name,
          lastName: selectedRejectEmployee.last_name,
          status: "rejected",
          rejectionReason,
        },
      });

      if (emailError) {
        console.error("Email sending failed:", emailError);
        toast.warning("Registration rejected but email notification failed");
      }
    },
    onSuccess: () => {
      toast.success("Registration rejected and email sent");
      queryClient.invalidateQueries({ queryKey: ["pending-registrations"] });
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedRejectEmployee(null);
    },
    onError: (error) => {
      toast.error("Failed to reject registration: " + error.message);
    },
  });

  const resetForm = () => {
    setCompanyEmail("");
    setSalary("");
    setJoiningDate("");
    setPosition("");
    setDepartment("");
    setSelectedEmployee(null);
  };

  const handleApprove = (employee: any) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  const handleReject = (employee: any) => {
    setSelectedRejectEmployee(employee);
    setRejectDialogOpen(true);
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pending Registrations</h1>
        <p className="text-muted-foreground">Review and approve employee registrations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingEmployees?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">Date of Birth</th>
                  <th className="text-left p-2">Blood Group</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingEmployees?.map((employee) => (
                  <tr key={employee.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{employee.first_name} {employee.last_name}</td>
                    <td className="p-2">{employee.email}</td>
                    <td className="p-2">{employee.phone}</td>
                    <td className="p-2">{employee.date_of_birth}</td>
                    <td className="p-2">{employee.blood_group}</td>
                    <td className="p-2 space-x-2">
                      <Button size="sm" onClick={() => handleApprove(employee)}>
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleReject(employee)}
                      >
                        Reject
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approve Registration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee Information</Label>
              <p className="text-sm text-muted-foreground">
                {selectedEmployee?.first_name} {selectedEmployee?.last_name} - {selectedEmployee?.email}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Company Email</Label>
              <Input
                id="companyEmail"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="employee@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Salary</Label>
              <Input
                id="salary"
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="Enter salary amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="joiningDate">Joining Date</Label>
              <Input
                id="joiningDate"
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="department">Department</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreateDeptDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </div>
              <select
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select department</option>
                {departments?.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.department_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="position">Position</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreatePosDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </div>
              <select
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select position</option>
                {positions?.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.position_title}
                  </option>
                ))}
              </select>
            </div>
            <Button 
              onClick={() => approveMutation.mutate()} 
              disabled={!companyEmail || !salary || !joiningDate || !position || !department}
              className="w-full"
            >
              Approve Registration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee Information</Label>
              <p className="text-sm text-muted-foreground">
                {selectedRejectEmployee?.first_name} {selectedRejectEmployee?.last_name} - {selectedRejectEmployee?.email}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason (Optional)</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide feedback to the applicant..."
                rows={4}
              />
            </div>
            <Button 
              onClick={() => rejectMutation.mutate()} 
              variant="destructive"
              className="w-full"
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateDepartmentDialog
        open={createDeptDialogOpen}
        onOpenChange={setCreateDeptDialogOpen}
        onDepartmentCreated={(id) => setDepartment(id)}
      />

      <CreatePositionDialog
        open={createPosDialogOpen}
        onOpenChange={setCreatePosDialogOpen}
        onPositionCreated={(id) => setPosition(id)}
        preselectedDepartmentId={department}
      />
    </div>
  );
}
