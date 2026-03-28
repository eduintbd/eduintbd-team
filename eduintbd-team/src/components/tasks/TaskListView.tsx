import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskDetailDialog } from "./TaskDetailDialog";
import { EditTaskDialog } from "./EditTaskDialog";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  created_at: string;
  assigned_to_employee: {
    id: string;
    first_name: string;
    last_name: string;
    employee_code: string;
  } | null;
  assigned_by_employee: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

interface TaskListViewProps {
  tasks: Task[];
  isAdmin: boolean;
  currentEmployeeId?: string;
}

export function TaskListView({ tasks, isAdmin, currentEmployeeId }: TaskListViewProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
      case "in_progress":
        return "bg-blue-500/10 text-blue-700 border-blue-200";
      case "completed":
        return "bg-green-500/10 text-green-700 border-green-200";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-500/10 text-green-700 border-green-200";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-200";
    }
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === "completed") return false;
    return new Date(dueDate) < new Date();
  };

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setDetailDialogOpen(true);
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const canEditTask = (task: Task) => {
    if (isAdmin) return true;
    return task.assigned_to === currentEmployeeId;
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Task</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Priority</th>
                  <th className="text-left p-4 font-medium">Assigned To</th>
                  <th className="text-left p-4 font-medium">Due Date</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={cn("capitalize", getStatusColor(task.status))}
                      >
                        {task.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={cn("capitalize", getPriorityColor(task.priority))}
                      >
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {task.assigned_to_employee ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {task.assigned_to_employee.first_name}{" "}
                            {task.assigned_to_employee.last_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4">
                      {task.due_date ? (
                        <div
                          className={cn(
                            "flex items-center gap-2 text-sm",
                            isOverdue(task.due_date, task.status) &&
                              "text-red-600 font-medium"
                          )}
                        >
                          <Calendar className="h-4 w-4" />
                          {new Date(task.due_date).toLocaleDateString()}
                          {isOverdue(task.due_date, task.status) && (
                            <Badge variant="destructive" className="text-xs">
                              Overdue
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No due date</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(task)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEditTask(task) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(task)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedTask && (
        <>
          <TaskDetailDialog
            task={selectedTask}
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
          />
          <EditTaskDialog
            task={selectedTask}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            isAdmin={isAdmin}
          />
        </>
      )}
    </div>
  );
}
