import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_to_employee: {
    first_name: string;
    last_name: string;
  } | null;
}

interface TaskKanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  isAdmin: boolean;
  currentEmployeeId?: string;
}

export function TaskKanbanBoard({ tasks, onStatusChange, isAdmin, currentEmployeeId }: TaskKanbanBoardProps) {
  const columns = [
    { id: "pending", title: "Pending", color: "border-l-yellow-500" },
    { id: "in_progress", title: "In Progress", color: "border-l-blue-500" },
    { id: "completed", title: "Completed", color: "border-l-green-500" },
  ];

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

  // Check if user can update this specific task
  const canUpdateTask = (task: Task) => {
    if (isAdmin) return true;
    // Allow if user is assigned to or created the task
    if (currentEmployeeId && (task.assigned_to === currentEmployeeId || task.assigned_by === currentEmployeeId)) {
      return true;
    }
    return false;
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const task = tasks.find(t => t.id === taskId);
    if (taskId && task && canUpdateTask(task)) {
      onStatusChange(taskId, newStatus);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map((column) => (
        <div
          key={column.id}
          className="space-y-3"
          onDrop={(e) => handleDrop(e, column.id)}
          onDragOver={handleDragOver}
        >
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
            <h3 className="font-semibold">{column.title}</h3>
            <Badge variant="secondary">
              {tasks.filter((t) => t.status === column.id).length}
            </Badge>
          </div>
          <div className="space-y-3 min-h-[200px]">
            {tasks
              .filter((task) => task.status === column.id)
              .map((task) => {
                const canDrag = canUpdateTask(task);
                return (
                  <Card
                    key={task.id}
                    draggable={canDrag}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className={cn(
                      "border-l-4 transition-shadow hover:shadow-md",
                      column.color,
                      canDrag ? "cursor-move" : "cursor-default"
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-medium line-clamp-2">
                          {task.title}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", getPriorityColor(task.priority))}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {task.assigned_to_employee && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>
                              {task.assigned_to_employee.first_name}{" "}
                              {task.assigned_to_employee.last_name}
                            </span>
                          </div>
                        )}
                        {task.due_date && (
                          <div
                            className={cn(
                              "flex items-center gap-1",
                              isOverdue(task.due_date) &&
                                task.status !== "completed" &&
                                "text-red-600 font-medium"
                            )}
                          >
                            {isOverdue(task.due_date) && task.status !== "completed" ? (
                              <AlertCircle className="h-3 w-3" />
                            ) : (
                              <Calendar className="h-3 w-3" />
                            )}
                            <span>
                              {isOverdue(task.due_date) && task.status !== "completed"
                                ? "Overdue: "
                                : "Due: "}
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}