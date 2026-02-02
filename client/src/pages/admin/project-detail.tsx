import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Plus, CheckCircle2, Clock, AlertCircle, User, Building, FileText, ClipboardList } from "lucide-react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AdminTask {
  id: number;
  projectId: number;
  taskTitle: string;
  taskDescription: string | null;
  taskCategory: string | null;
  status: string;
  priority: string;
  assignedTo: number | null;
  dueDate: string | null;
  completedAt: string | null;
  internalNotes: string | null;
  createdAt: string;
}

interface ProjectStage {
  id: number;
  stageName: string;
  stageOrder: number;
  status: string;
}

interface ProjectTask {
  id: number;
  stageId: number;
  taskName: string;
  status: string;
  priority: string;
}

interface Owner {
  id: number;
  email: string;
  fullName: string;
}

interface AdminActivityItem {
  id: number;
  actionType: string;
  actionDescription: string;
  createdAt: string;
}

interface ProjectDetail {
  id: number;
  projectNumber: string;
  projectName: string;
  borrowerName: string | null;
  borrowerEmail: string | null;
  propertyAddress: string | null;
  loanAmount: number | null;
  interestRate: number | null;
  loanTermMonths: number | null;
  loanType: string | null;
  status: string;
  currentStage: string | null;
  progressPercentage: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  blocked: "bg-red-100 text-red-700",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function AdminProjectDetail() {
  const [, params] = useRoute("/admin/projects/:id");
  const projectId = params?.id ? parseInt(params.id) : null;
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ taskTitle: "", taskDescription: "", priority: "medium", taskCategory: "" });
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{
    project: ProjectDetail;
    stages: ProjectStage[];
    tasks: ProjectTask[];
    activity: any[];
    adminTasks: AdminTask[];
    adminActivity: AdminActivityItem[];
    owner: Owner | null;
  }>({
    queryKey: ["/api/admin/projects", projectId],
    enabled: !!projectId,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: typeof newTask) => {
      return await apiRequest("POST", `/api/admin/projects/${projectId}/tasks`, task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects", projectId] });
      setIsAddTaskOpen(false);
      setNewTask({ taskTitle: "", taskDescription: "", priority: "medium", taskCategory: "" });
      toast({ title: "Task created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: { status?: string; internalNotes?: string } }) => {
      return await apiRequest("PATCH", `/api/admin/tasks/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects", projectId] });
      toast({ title: "Task updated" });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading || !data) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { project, stages, tasks, adminTasks, adminActivity, owner } = data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/projects">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-project-number">
            {project.projectNumber}
          </h1>
          <p className="text-muted-foreground">{project.projectName}</p>
        </div>
        <Badge className={statusColors[project.status] || ""} data-testid="badge-project-status">
          {project.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="admin-tasks">
            <TabsList>
              <TabsTrigger value="admin-tasks" data-testid="tab-admin-tasks">
                <ClipboardList className="h-4 w-4 mr-2" />
                Admin Tasks
              </TabsTrigger>
              <TabsTrigger value="user-tasks" data-testid="tab-user-tasks">
                User Milestones
              </TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity">
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="admin-tasks" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Internal Workflow Tasks</h3>
                <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-task">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Admin Task</DialogTitle>
                      <DialogDescription>Add an internal workflow task for this project</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Task Title</Label>
                        <Input
                          value={newTask.taskTitle}
                          onChange={(e) => setNewTask({ ...newTask, taskTitle: e.target.value })}
                          placeholder="e.g., Review appraisal report"
                          data-testid="input-task-title"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={newTask.taskDescription}
                          onChange={(e) => setNewTask({ ...newTask, taskDescription: e.target.value })}
                          placeholder="Task details..."
                          data-testid="input-task-description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Priority</Label>
                          <Select
                            value={newTask.priority}
                            onValueChange={(v) => setNewTask({ ...newTask, priority: v })}
                          >
                            <SelectTrigger data-testid="select-task-priority">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Category</Label>
                          <Select
                            value={newTask.taskCategory}
                            onValueChange={(v) => setNewTask({ ...newTask, taskCategory: v })}
                          >
                            <SelectTrigger data-testid="select-task-category">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="document_processing">Document Processing</SelectItem>
                              <SelectItem value="underwriting_review">Underwriting Review</SelectItem>
                              <SelectItem value="approval_required">Approval Required</SelectItem>
                              <SelectItem value="closing_coordination">Closing Coordination</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddTaskOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => createTaskMutation.mutate(newTask)}
                        disabled={!newTask.taskTitle || createTaskMutation.isPending}
                        data-testid="button-submit-task"
                      >
                        Create Task
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {adminTasks.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No admin tasks yet. Create one to track internal workflow.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {adminTasks.map((task) => (
                    <Card key={task.id} data-testid={`card-admin-task-${task.id}`}>
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {task.status === "completed" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : task.status === "blocked" ? (
                                <AlertCircle className="h-4 w-4 text-red-600" />
                              ) : (
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-medium">{task.taskTitle}</span>
                              <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                              {task.taskCategory && (
                                <Badge variant="outline">{task.taskCategory.replace("_", " ")}</Badge>
                              )}
                            </div>
                            {task.taskDescription && (
                              <p className="text-sm text-muted-foreground mt-1">{task.taskDescription}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <Select
                            value={task.status}
                            onValueChange={(v) => updateTaskMutation.mutate({ id: task.id, updates: { status: v } })}
                          >
                            <SelectTrigger className="w-[130px]" data-testid={`select-task-status-${task.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="user-tasks">
              <Card>
                <CardHeader>
                  <CardTitle>User-Facing Milestones</CardTitle>
                  <CardDescription>Tasks visible to the user and borrower portal</CardDescription>
                </CardHeader>
                <CardContent>
                  {stages.map((stage) => {
                    const stageTasks = tasks.filter((t) => t.stageId === stage.id);
                    return (
                      <div key={stage.id} className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={statusColors[stage.status]}>{stage.status.replace("_", " ")}</Badge>
                          <span className="font-medium">{stage.stageName.replace("_", " ")}</span>
                        </div>
                        <div className="pl-4 space-y-1">
                          {stageTasks.map((task) => (
                            <div key={task.id} className="flex items-center gap-2 text-sm">
                              {task.status === "completed" ? (
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                              ) : (
                                <Clock className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span>{task.taskName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Admin Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                  {adminActivity.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No activity yet</p>
                  ) : (
                    <div className="space-y-3">
                      {adminActivity.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {item.actionType.replace(/_/g, " ")}
                          </Badge>
                          <div className="flex-1">
                            <p className="text-sm">{item.actionDescription}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={project.progressPercentage} className="flex-1 h-2" />
                  <span className="text-sm font-medium">{project.progressPercentage}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Stage</p>
                <p className="font-medium">{project.currentStage?.replace("_", " ") || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loan Amount</p>
                <p className="font-medium">{formatCurrency(project.loanAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Interest Rate</p>
                <p className="font-medium">{project.interestRate ? `${project.interestRate}%` : "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loan Type</p>
                <p className="font-medium">{project.loanType || "-"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Owner
              </CardTitle>
            </CardHeader>
            <CardContent>
              {owner ? (
                <div>
                  <p className="font-medium">{owner.fullName}</p>
                  <p className="text-sm text-muted-foreground">{owner.email}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">Unknown</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4" />
                Borrower
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <p className="font-medium">{project.borrowerName || "Not specified"}</p>
                {project.borrowerEmail && (
                  <p className="text-sm text-muted-foreground">{project.borrowerEmail}</p>
                )}
                {project.propertyAddress && (
                  <p className="text-sm text-muted-foreground mt-2">{project.propertyAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
