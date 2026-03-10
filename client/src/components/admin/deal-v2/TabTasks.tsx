import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle2, Plus, CalendarIcon, ClipboardEdit, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { EmptyState } from "@/components/ui/phase1/empty-state";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function getPriorityColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case "high":
    case "urgent":
      return "text-red-600 bg-red-50";
    case "medium":
      return "text-amber-600 bg-amber-50";
    default:
      return "text-muted-foreground bg-muted";
  }
}

export default function TabTasks({
  deal,
  tasks,
  dealId,
  stages = [],
}: {
  deal: any;
  tasks: any[];
  dealId: string;
  stages?: any[];
}) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [formTemplateId, setFormTemplateId] = useState<string>("");

  const { data: teamData } = useQuery<{ teamMembers: { id: number; fullName: string; email: string; role: string }[] }>({
    queryKey: ["/api/admin/team-members"],
  });
  const teamMembers = teamData?.teamMembers ?? [];

  const { data: formTemplatesData } = useQuery<any>({
    queryKey: ["/api/admin/inquiry-form-templates"],
  });
  const formTemplates = Array.isArray(formTemplatesData?.templates) ? formTemplatesData.templates : (Array.isArray(formTemplatesData) ? formTemplatesData : []);

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      return apiRequest("PATCH", `/api/admin/deals/${dealId}/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/deals`, dealId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
      toast({ title: "Task updated" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: { taskName: string; taskDescription?: string; priority: string; assignedTo?: string; dueDate?: string; formTemplateId?: number }) => {
      return apiRequest("POST", `/api/admin/deals/${dealId}/tasks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/deals`, dealId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
      toast({ title: "Task created" });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    },
  });

  function resetForm() {
    setTaskName("");
    setDescription("");
    setPriority("medium");
    setAssignedTo("");
    setDueDate(undefined);
    setFormTemplateId("");
  }

  function handleSubmit() {
    if (!taskName.trim()) return;
    createTaskMutation.mutate({
      taskName: taskName.trim(),
      taskDescription: description.trim() || undefined,
      priority,
      assignedTo: assignedTo || undefined,
      dueDate: dueDate ? dueDate.toISOString() : undefined,
      formTemplateId: formTemplateId && formTemplateId !== "none" ? parseInt(formTemplateId) : undefined,
    });
  }

  const getAssigneeName = (task: any) => {
    if (task._assignedToBorrower || task.assignedTo === "borrower") {
      return deal?.customerFirstName && deal?.customerLastName
        ? `${deal.customerFirstName} ${deal.customerLastName} (Borrower)`
        : deal?.customerEmail ? `${deal.customerEmail} (Borrower)` : "Borrower";
    }
    if (task.assigneeName) return task.assigneeName;
    if (task.assignedTo) {
      const assignedId = typeof task.assignedTo === "string" ? parseInt(task.assignedTo) : task.assignedTo;
      const member = teamMembers.find((m) => m.id === assignedId);
      if (member) return member.fullName || member.email;
      return `User #${task.assignedTo}`;
    }
    return null;
  };

  const renderTask = (task: any) => {
    const assignee = getAssigneeName(task);
    return (
      <div
        key={task.id}
        className="flex items-center gap-3 py-2.5 px-4 border-b border-border/30 last:border-b-0 hover:bg-muted/30"
        data-testid={`task-item-${task.id}`}
      >
        <Checkbox
          checked={task.status === "completed" || task.status === "done"}
          onCheckedChange={(checked) => {
            updateTaskMutation.mutate({
              taskId: task.id,
              status: checked ? "completed" : "pending",
            });
          }}
          data-testid={`checkbox-task-${task.id}`}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] font-medium ${task.status === "completed" || task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
            {task.taskTitle || task.taskName || task.title}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            {assignee && (
              <p className="text-[13px] text-muted-foreground">Assigned to: {assignee}</p>
            )}
            {task.dueDate && !isNaN(new Date(task.dueDate).getTime()) && (
              <p className="text-[13px] text-muted-foreground">Due: {format(new Date(task.dueDate), "MMM d, yyyy")}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {task.priority && (
            <Badge variant="secondary" className={`text-[12px] ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </Badge>
          )}
          {task.borrowerActionRequired && (
            <Badge variant="outline" className="text-[12px] text-blue-600 border-blue-200">
              Borrower
            </Badge>
          )}
          {task.formTemplateId && (
            <Badge variant="secondary" className="text-[12px]">
              <ClipboardEdit className="h-3 w-3 mr-1" />
              Form
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const stageMap = new Map<number, any>();
  stages.forEach((s: any) => stageMap.set(s.id, s));

  const tasksByStage = new Map<number | null, any[]>();
  tasks.forEach((task) => {
    const key = task.stageId || null;
    if (!tasksByStage.has(key)) tasksByStage.set(key, []);
    tasksByStage.get(key)!.push(task);
  });

  const sortedStageKeys: (number | null)[] = [];
  const stageIds = stages
    .sort((a: any, b: any) => (a.stageOrder ?? 0) - (b.stageOrder ?? 0))
    .map((s: any) => s.id);
  stageIds.forEach((id: number) => {
    sortedStageKeys.push(id);
  });
  tasksByStage.forEach((_, key) => {
    if (key !== null && !sortedStageKeys.includes(key)) sortedStageKeys.push(key);
  });
  if (tasksByStage.has(null)) sortedStageKeys.push(null);

  const stageData = sortedStageKeys.map((stageId) => {
    const stageTasks = tasksByStage.get(stageId) || [];
    const stage = stageId ? stageMap.get(stageId) : null;
    const stageOrder = stage?.stageOrder ?? 0;
    const stageName = stage?.stageName || "General Tasks";
    const completedCount = stageTasks.filter((t) => t.status === "completed" || t.status === "done").length;
    const allComplete = completedCount === stageTasks.length && stageTasks.length > 0;
    return { stageId, stageOrder, stageName, completedCount, totalCount: stageTasks.length, allComplete, tasks: stageTasks };
  });
  const activeIdx = stageData.findIndex((s) => !s.allComplete);

  const completedTotal = tasks.filter((t) => t.status === "completed" || t.status === "done").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground" data-testid="text-tasks-count">
          Tasks ({completedTotal}/{tasks.length} complete)
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialogOpen(true)}
          data-testid="button-add-task"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No tasks"
          description="Tasks will appear here once the deal workflow is configured."
        />
      ) : (
        <div className="space-y-3">
          {stageData.map((s, idx) => (
            <TaskStageSection
              key={s.stageId ?? "general"}
              stageOrder={s.stageOrder}
              stageName={s.stageName}
              completedCount={s.completedCount}
              totalCount={s.totalCount}
              allComplete={s.allComplete}
              tasks={s.tasks}
              defaultOpen={idx === activeIdx || idx === 0}
              renderTask={renderTask}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[480px]" data-testid="dialog-add-task">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-name">Task Name *</Label>
              <Input
                id="task-name"
                placeholder="Enter task name"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                data-testid="input-task-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="input-task-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="select-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assigned To</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger data-testid="select-task-assignee">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {deal?.customerEmail && (
                      <SelectItem value="borrower">
                        {deal.customerFirstName && deal.customerLastName
                          ? `${deal.customerFirstName} ${deal.customerLastName} (Borrower)`
                          : `${deal.customerEmail} (Borrower)`}
                      </SelectItem>
                    )}
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={String(member.id)}>
                        {member.fullName || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Popover modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${!dueDate ? "text-muted-foreground" : ""}`}
                    data-testid="button-task-due-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" style={{ pointerEvents: "auto" }} onOpenAutoFocus={(e) => e.preventDefault()}>
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => { setDueDate(date); }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            {formTemplates.length > 0 && (
              <div className="space-y-1.5">
                <Label>Form Template</Label>
                <Select value={formTemplateId} onValueChange={setFormTemplateId}>
                  <SelectTrigger data-testid="select-task-form-template">
                    <SelectValue placeholder="No form attached" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No form attached</SelectItem>
                    {formTemplates.map((tpl: any) => (
                      <SelectItem key={tpl.id} value={String(tpl.id)}>
                        <span className="flex items-center gap-2">
                          <ClipboardEdit className="h-3 w-3" />
                          {tpl.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Attach a form for the borrower to fill out in their portal.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }} data-testid="button-cancel-task">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!taskName.trim() || createTaskMutation.isPending}
              data-testid="button-submit-task"
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskStageSection({
  stageOrder,
  stageName,
  completedCount,
  totalCount,
  allComplete,
  tasks,
  defaultOpen = false,
  renderTask,
}: {
  stageOrder: number;
  stageName: string;
  completedCount: number;
  totalCount: number;
  allComplete: boolean;
  tasks: any[];
  defaultOpen?: boolean;
  renderTask: (task: any) => JSX.Element;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-md bg-card" data-testid={`task-stage-section-${stageOrder}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        data-testid={`button-toggle-task-stage-${stageOrder}`}
      >
        <div className="flex items-center gap-2.5">
          {allComplete ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40 flex items-center justify-center text-[12px] font-bold text-muted-foreground">
              {stageOrder || "—"}
            </div>
          )}
          <span className="text-[16px] font-semibold text-muted-foreground">
            {stageOrder ? `Stage ${stageOrder}: ` : ""}{stageName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-muted-foreground">
            {completedCount}/{totalCount} complete
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              !isOpen && "-rotate-90"
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border/50">
          {tasks.map(renderTask)}
        </div>
      )}
    </div>
  );
}
