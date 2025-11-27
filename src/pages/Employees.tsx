import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, Pencil, UserPlus, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import EditEmployeeDialog from "@/components/EditEmployeeDialog";
import { CreateDepartmentDialog } from "@/components/CreateDepartmentDialog";
import { CreatePositionDialog } from "@/components/CreatePositionDialog";

export default function Employees() {
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [addEmployeeDialogOpen, setAddEmployeeDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPendingEmployee, setSelectedPendingEmployee] = useState<any>(null);
  const [selectedRejectEmployee, setSelectedRejectEmployee] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [salary, setSalary] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [createDeptDialogOpen, setCreateDeptDialogOpen] = useState(false);
  const [createPosDialogOpen, setCreatePosDialogOpen] = useState(false);
  const [newEmployeeData, setNewEmployeeData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    employee_code: "",
  });
  const queryClient = useQueryClient();

  // Get current user role
  const { data: currentUserRole } = useQuery({
    queryKey: ["current-user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      return data?.role;
    },
  });

  const isManagerOrAbove = currentUserRole && ['admin', 'hr_manager'].includes(currentUserRole);

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select(`
          *,
          department:departments(department_name),
          position:positions(position_title)
        `)
        .eq("registration_status", "approved")
        .order("employee_code");
      
      if (employeesError) throw employeesError;

      // Fetch roles for all employees
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      
      if (rolesError) throw rolesError;

      // Map roles to employees
      const employeesWithRoles = employeesData?.map(emp => ({
        ...emp,
        roles: rolesData?.filter(r => r.user_id === emp.user_id).map(r => r.role) || []
      }));

      return employeesWithRoles;
    },
  });

  const { data: pendingEmployees } = useQuery({
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

  const addEmployeeMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Call edge function to create auth user and employee record
      const { data, error } = await supabase.functions.invoke("create-employee-account", {
        body: {
          employeeData: newEmployeeData,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error("Failed to create employee");
    },
    onSuccess: () => {
      toast.success("Employee added! Awaiting founder approval.");
      queryClient.invalidateQueries({ queryKey: ["pending-registrations"] });
      setAddEmployeeDialogOpen(false);
      setNewEmployeeData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        employee_code: "",
      });
    },
    onError: (error) => {
      toast.error("Failed to add employee: " + error.message);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      // Update employee record
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
        .eq("id", selectedPendingEmployee.id);

      if (updateError) throw updateError;

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

      await supabase.functions.invoke("send-approval-email", {
        body: {
          email: selectedPendingEmployee.email,
          firstName: selectedPendingEmployee.first_name,
          lastName: selectedPendingEmployee.last_name,
          status: "approved",
          position: posData?.position_title || "N/A",
          department: deptData?.department_name || "N/A",
          companyEmail,
          joiningDate,
        },
      });
    },
    onSuccess: () => {
      toast.success("Registration approved!");
      queryClient.invalidateQueries({ queryKey: ["pending-registrations"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setApproveDialogOpen(false);
      resetApprovalForm();
    },
    onError: (error) => {
      toast.error("Failed to approve: " + error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("employees")
        .update({ registration_status: "rejected" })
        .eq("id", selectedRejectEmployee.id);

      if (error) throw error;

      await supabase.functions.invoke("send-approval-email", {
        body: {
          email: selectedRejectEmployee.email,
          firstName: selectedRejectEmployee.first_name,
          lastName: selectedRejectEmployee.last_name,
          status: "rejected",
          rejectionReason,
        },
      });
    },
    onSuccess: () => {
      toast.success("Registration rejected");
      queryClient.invalidateQueries({ queryKey: ["pending-registrations"] });
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedRejectEmployee(null);
    },
    onError: (error) => {
      toast.error("Failed to reject: " + error.message);
    },
  });

  const resetApprovalForm = () => {
    setCompanyEmail("");
    setSalary("");
    setJoiningDate("");
    setPosition("");
    setDepartment("");
    setSelectedPendingEmployee(null);
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  // Filter employees based on search
  const filteredEmployees = employees?.filter(emp => 
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workforce Management</h1>
            <p className="text-gray-600 mt-2">Manage employees, departments, and access roles</p>
          </div>
          {isManagerOrAbove && (
            <Button 
              onClick={() => setAddEmployeeDialogOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          )}
        </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Employees</TabsTrigger>
          {isManagerOrAbove && (
            <TabsTrigger value="pending">
              Pending Approvals {pendingEmployees && pendingEmployees.length > 0 && `(${pendingEmployees.length})`}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-lg shadow-sm">
              <div className="text-sm font-medium text-gray-600 mb-2">Total Employees</div>
              <div className="text-3xl font-bold text-gray-900">{employees?.length || 0}</div>
            </div>
            <div className="bg-green-50 border border-green-100 p-6 rounded-lg shadow-sm">
              <div className="text-sm font-medium text-gray-600 mb-2">Active</div>
              <div className="text-3xl font-bold text-green-600">
                {employees?.filter(e => e.status === 'active').length || 0}
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-lg shadow-sm">
              <div className="text-sm font-medium text-gray-600 mb-2">Departments</div>
              <div className="text-3xl font-bold text-yellow-600">
                {new Set(employees?.map(e => e.department_id)).size || 0}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Directory</h3>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search employees by name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">ID No.</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Department</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Position</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Access Roles</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees?.map((employee) => (
                    <tr key={employee.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm">{employee.employee_code}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600">{employee.email}</td>
                      <td className="px-4 py-3 text-sm">{employee.department?.department_name || '-'}</td>
                      <td className="px-4 py-3 text-sm">{employee.position?.position_title || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-1 flex-wrap">
                          {employee.roles?.includes('admin') && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Admin</span>
                          )}
                          {employee.roles?.includes('hr_manager') && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Manager</span>
                          )}
                          {employee.roles?.includes('accountant') && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">CFO</span>
                          )}
                          {(!employee.roles || employee.roles.length === 0 || 
                            (employee.roles.length === 1 && employee.roles.includes('employee'))) && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">Employee</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {employee.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setEditDialogOpen(true);
                          }}
                          className="hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {isManagerOrAbove && (
          <TabsContent value="pending" className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-2">Pending Approvals</div>
                  <div className="text-3xl font-bold text-yellow-600">{pendingEmployees?.length || 0}</div>
                </div>
                <UserPlus className="h-8 w-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Applications</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Name</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Email</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Phone</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Date of Birth</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Blood Group</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingEmployees?.map((employee) => (
                      <tr key={employee.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600">{employee.email}</td>
                        <td className="px-4 py-3 text-sm">{employee.phone}</td>
                        <td className="px-4 py-3 text-sm">{employee.date_of_birth}</td>
                        <td className="px-4 py-3 text-sm">{employee.blood_group}</td>
                        <td className="px-4 py-3 text-sm space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setSelectedPendingEmployee(employee);
                              setApproveDialogOpen(true);
                            }}
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => {
                              setSelectedRejectEmployee(employee);
                              setRejectDialogOpen(true);
                            }}
                          >
                            Reject
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {selectedEmployee && (
        <EditEmployeeDialog
          employee={selectedEmployee}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      <Dialog open={addEmployeeDialogOpen} onOpenChange={setAddEmployeeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employee_code">Employee ID</Label>
              <Input
                id="employee_code"
                value={newEmployeeData.employee_code}
                onChange={(e) => setNewEmployeeData({...newEmployeeData, employee_code: e.target.value})}
                placeholder="EDU02"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={newEmployeeData.first_name}
                onChange={(e) => setNewEmployeeData({...newEmployeeData, first_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={newEmployeeData.last_name}
                onChange={(e) => setNewEmployeeData({...newEmployeeData, last_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newEmployeeData.email}
                onChange={(e) => setNewEmployeeData({...newEmployeeData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newEmployeeData.phone}
                onChange={(e) => setNewEmployeeData({...newEmployeeData, phone: e.target.value})}
              />
            </div>
            <Button 
              onClick={() => addEmployeeMutation.mutate()} 
              disabled={!newEmployeeData.employee_code || !newEmployeeData.first_name || !newEmployeeData.last_name || !newEmployeeData.email}
              className="w-full"
            >
              Add Employee (Requires Founder Approval)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approve Registration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee Information</Label>
              <p className="text-sm text-muted-foreground">
                {selectedPendingEmployee?.first_name} {selectedPendingEmployee?.last_name} - {selectedPendingEmployee?.email}
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
            >
              Confirm Rejection
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
    </div>
  );
}