import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Pencil, UserPlus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CreateDepartmentDialog } from "@/components/CreateDepartmentDialog";
import { CreatePositionDialog } from "@/components/CreatePositionDialog";

export default function Departments() {
  const queryClient = useQueryClient();
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [createDeptDialogOpen, setCreateDeptDialogOpen] = useState(false);
  const [createPosDialogOpen, setCreatePosDialogOpen] = useState(false);

  // Check if current user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      return data?.some(r => r.role === "admin") || false;
    },
  });

  const { data: departments, isLoading } = useQuery({
    queryKey: ["departments-with-managers"],
    queryFn: async () => {
      const { data: depts, error } = await supabase
        .from("departments")
        .select("*")
        .order("department_code");
      
      if (error) throw error;

      // Fetch managers for all departments
      const { data: managers } = await supabase
        .from("department_managers")
        .select(`
          department_id,
          employee:employees(id, first_name, last_name, employee_code)
        `);

      // Map managers to departments
      const deptsWithManagers = depts?.map(dept => ({
        ...dept,
        managers: managers?.filter(m => m.department_id === dept.id).map(m => m.employee) || []
      }));

      return deptsWithManagers;
    },
  });

  const { data: positions } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("positions")
        .select(`
          *,
          department:departments(department_name)
        `)
        .order("position_code");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-for-manager"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, employee_code")
        .eq("status", "active")
        .eq("registration_status", "approved")
        .order("first_name");
      
      if (error) throw error;
      return data;
    },
  });

  const addManagerMutation = useMutation({
    mutationFn: async ({ departmentId, employeeId }: { departmentId: string; employeeId: string }) => {
      // Add to department_managers
      const { error: dmError } = await supabase
        .from("department_managers")
        .insert({ department_id: departmentId, employee_id: employeeId });

      if (dmError) {
        if (dmError.code === '23505') {
          throw new Error("This employee is already a manager for this department");
        }
        throw dmError;
      }

      // Also assign manager role if not already assigned
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", (await supabase.from("employees").select("user_id").eq("id", employeeId).single()).data?.user_id)
        .eq("role", "manager")
        .maybeSingle();

      if (!existingRole) {
        const { data: emp } = await supabase
          .from("employees")
          .select("user_id")
          .eq("id", employeeId)
          .single();

        if (emp?.user_id) {
          await supabase
            .from("user_roles")
            .insert({ user_id: emp.user_id, role: "manager" });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-with-managers"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Manager added successfully");
      setManagerDialogOpen(false);
      setSelectedManagerId("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add manager");
    },
  });

  const removeManagerMutation = useMutation({
    mutationFn: async ({ departmentId, employeeId }: { departmentId: string; employeeId: string }) => {
      const { error } = await supabase
        .from("department_managers")
        .delete()
        .eq("department_id", departmentId)
        .eq("employee_id", employeeId);

      if (error) throw error;

      // Check if employee manages any other departments
      const { data: otherDepts } = await supabase
        .from("department_managers")
        .select("id")
        .eq("employee_id", employeeId);

      // If no longer managing any department, remove manager role
      if (!otherDepts || otherDepts.length === 0) {
        const { data: emp } = await supabase
          .from("employees")
          .select("user_id")
          .eq("id", employeeId)
          .single();

        if (emp?.user_id) {
          await supabase
            .from("user_roles")
            .delete()
            .eq("user_id", emp.user_id)
            .eq("role", "manager");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-with-managers"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Manager removed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove manager");
    },
  });

  const openManagerDialog = (dept: any) => {
    setSelectedDepartment(dept);
    setSelectedManagerId("");
    setManagerDialogOpen(true);
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Departments & Positions</h1>
          <p className="text-muted-foreground">Manage organizational structure</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreatePosDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Position
          </Button>
          <Button onClick={() => setCreateDeptDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Managers</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Status</th>
                  {isAdmin && <th className="text-left p-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {departments?.map((dept) => (
                  <tr key={dept.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{dept.department_code}</td>
                    <td className="p-2 font-medium">{dept.department_name}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {dept.managers && dept.managers.length > 0 ? (
                          dept.managers.map((manager: any) => (
                            <Badge 
                              key={manager.id} 
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {manager.first_name} {manager.last_name}
                              {isAdmin && (
                                <X 
                                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                  onClick={() => removeManagerMutation.mutate({ 
                                    departmentId: dept.id, 
                                    employeeId: manager.id 
                                  })}
                                />
                              )}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">No manager assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-sm text-muted-foreground">{dept.description || '-'}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        dept.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {dept.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openManagerDialog(dept)}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Add Manager
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Department</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {positions?.map((pos) => (
                  <tr key={pos.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{pos.position_code}</td>
                    <td className="p-2">{pos.position_title}</td>
                    <td className="p-2">{pos.department?.department_name || '-'}</td>
                    <td className="p-2">{pos.description || '-'}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        pos.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {pos.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Manager Dialog */}
      <Dialog open={managerDialogOpen} onOpenChange={setManagerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manager to {selectedDepartment?.department_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Employee</Label>
              <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.filter(emp => 
                    !selectedDepartment?.managers?.some((m: any) => m.id === emp.id)
                  ).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={() => {
                if (selectedDepartment && selectedManagerId) {
                  addManagerMutation.mutate({
                    departmentId: selectedDepartment.id,
                    employeeId: selectedManagerId,
                  });
                }
              }}
              disabled={!selectedManagerId || addManagerMutation.isPending}
              className="w-full"
            >
              {addManagerMutation.isPending ? "Adding..." : "Add Manager"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateDepartmentDialog 
        open={createDeptDialogOpen} 
        onOpenChange={setCreateDeptDialogOpen}
        onDepartmentCreated={() => queryClient.invalidateQueries({ queryKey: ["departments-with-managers"] })}
      />
      <CreatePositionDialog 
        open={createPosDialogOpen} 
        onOpenChange={setCreatePosDialogOpen}
        onPositionCreated={() => queryClient.invalidateQueries({ queryKey: ["positions"] })}
      />
    </div>
  );
}