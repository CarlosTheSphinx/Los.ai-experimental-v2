import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/phase1/empty-state";
import { CollapsibleSection } from "@/components/ui/phase1/collapsible-section";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

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
}: {
  deal: any;
  tasks: any[];
  dealId: string;
}) {
  const { toast } = useToast();

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      return apiRequest("PATCH", `/api/deals/${dealId}/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
      toast({ title: "Task updated" });
    },
  });

  const todo = tasks.filter((t) => t.status === "pending" || t.status === "to_do");
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const done = tasks.filter((t) => t.status === "completed" || t.status === "done");

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No tasks"
        description="Tasks will appear here once the deal workflow is configured."
      />
    );
  }

  const renderTask = (task: any) => (
    <div
      key={task.id}
      className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50"
    >
      <Checkbox
        checked={task.status === "completed" || task.status === "done"}
        onCheckedChange={(checked) => {
          updateTaskMutation.mutate({
            taskId: task.id,
            status: checked ? "completed" : "pending",
          });
        }}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium ${task.status === "completed" || task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
          {task.taskTitle || task.title}
        </p>
        {task.assignedTo && (
          <p className="text-[11px] text-muted-foreground">Assigned to: {task.assignedTo}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {task.priority && (
          <Badge variant="secondary" className={`text-[10px] ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </Badge>
        )}
        {task.borrowerActionRequired && (
          <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">
            Borrower
          </Badge>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {todo.length > 0 && (
        <CollapsibleSection title="To Do" badge={String(todo.length)} defaultOpen={true}>
          <div className="space-y-0.5">{todo.map(renderTask)}</div>
        </CollapsibleSection>
      )}
      {inProgress.length > 0 && (
        <CollapsibleSection title="In Progress" badge={String(inProgress.length)} defaultOpen={true}>
          <div className="space-y-0.5">{inProgress.map(renderTask)}</div>
        </CollapsibleSection>
      )}
      {done.length > 0 && (
        <CollapsibleSection title="Completed" badge={String(done.length)} defaultOpen={false}>
          <div className="space-y-0.5">{done.map(renderTask)}</div>
        </CollapsibleSection>
      )}
    </div>
  );
}
