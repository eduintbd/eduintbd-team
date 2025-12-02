import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, ListTodo, LayoutGrid, Filter } from "lucide-react";
import { TaskKanbanBoard } from "@/components/tasks/TaskKanbanBoard";
import { TaskListView } from "@/components/tasks/TaskListView";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { TaskFilters } from "@/components/tasks/TaskFilters";

export default function Tasks() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ["user-roles", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      return data?.map(r => r.role) || [];
    },
    enabled: !!session?.user?.id,
  });

  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", session.user.id)
        .single();
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", filterStatus, filterPriority, filterAssignedTo],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          *
        `)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }
      if (filterPriority !== "all") {
        query = query.eq("priority", filterPriority);
      }
      if (filterAssignedTo !== "all") {
        query = query.eq("assigned_to", filterAssignedTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch employee details for each task
      const tasksWithEmployees = await Promise.all(
        (data || []).map(async (task) => {
          let assignedToEmployee = null;
          let assignedByEmployee = null;

          if (task.assigned_to) {
            const { data: empData } = await supabase
              .from("employees")
              .select("id, first_name, last_name, employee_code")
              .eq("id", task.assigned_to)
              .single();
            assignedToEmployee = empData;
          }

          if (task.assigned_by) {
            const { data: empData } = await supabase
              .from("employees")
              .select("id, first_name, last_name")
              .eq("id", task.assigned_by)
              .single();
            assignedByEmployee = empData;
          }

          return {
            ...task,
            assigned_to_employee: assignedToEmployee,
            assigned_by_employee: assignedByEmployee,
          };
        })
      );

      return tasksWithEmployees;
    },
  });

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
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task status updated");
    },
    onError: (error) => {
      toast.error("Failed to update task: " + error.message);
    },
  });

  const isAdmin = userRoles?.some(role => 
    role === "admin" || role === "manager"
  ) || false;

  const taskStats = {
    total: tasks?.length || 0,
    pending: tasks?.filter((t) => t.status === "pending").length || 0,
    inProgress: tasks?.filter((t) => t.status === "in_progress").length || 0,
    completed: tasks?.filter((t) => t.status === "completed").length || 0,
  };

  if (isLoading) {
    return <div className="p-8">Loading tasks...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Task Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage and track all tasks</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-xl md:text-2xl font-bold">{taskStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Pending</CardTitle>
            <div className="h-3 w-3 rounded-full bg-warning" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-xl md:text-2xl font-bold">{taskStats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">In Progress</CardTitle>
            <div className="h-3 w-3 rounded-full bg-primary" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-xl md:text-2xl font-bold">{taskStats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Completed</CardTitle>
            <div className="h-3 w-3 rounded-full bg-success" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-xl md:text-2xl font-bold">{taskStats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <TaskFilters
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterPriority={filterPriority}
        setFilterPriority={setFilterPriority}
        filterAssignedTo={filterAssignedTo}
        setFilterAssignedTo={setFilterAssignedTo}
        employees={employees || []}
      />

      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="kanban" className="flex-1 sm:flex-none">
            <LayoutGrid className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Kanban Board</span>
            <span className="sm:hidden">Kanban</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex-1 sm:flex-none">
            <ListTodo className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">List View</span>
            <span className="sm:hidden">List</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="kanban" className="space-y-4">
          <TaskKanbanBoard
            tasks={tasks || []}
            onStatusChange={(taskId, newStatus) =>
              updateTaskStatusMutation.mutate({ taskId, newStatus })
            }
            isAdmin={isAdmin}
            currentEmployeeId={currentEmployee?.id}
          />
        </TabsContent>
        <TabsContent value="list" className="space-y-4">
          <TaskListView
            tasks={tasks || []}
            isAdmin={isAdmin}
            currentEmployeeId={currentEmployee?.id}
          />
        </TabsContent>
      </Tabs>

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        employees={employees || []}
        currentEmployeeId={currentEmployee?.id}
      />
    </div>
  );
}
