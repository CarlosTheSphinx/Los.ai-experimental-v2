import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Settings2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DealControls({
  deal,
  dealId,
  isAdmin = true,
  stages: programStages,
}: {
  deal: any;
  dealId: string;
  isAdmin?: boolean;
  stages?: any[];
}) {
  const { toast } = useToast();
  const apiBase = "/api/admin";
  const projectId = deal.projectId || deal.id;

  const [pendingProgramId, setPendingProgramId] = useState<number | null | undefined>(undefined);
  const [showProgramConfirm, setShowProgramConfirm] = useState(false);

  const invalidateDeal = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/deals", dealId] });
  };

  const saveControlMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest("PATCH", `${apiBase}/projects/${projectId}`, data);
    },
    onSuccess: () => {
      invalidateDeal();
      toast({ title: "Deal updated" });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const convertProgramMutation = useMutation({
    mutationFn: async (programId: number | null) => {
      return apiRequest("POST", `${apiBase}/projects/${projectId}/convert-program`, { programId });
    },
    onSuccess: () => {
      invalidateDeal();
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/deals`, dealId, "documents"] });
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/deals`, dealId, "tasks"] });
      toast({ title: "Loan program updated", description: "Documents and tasks have been synced to the new program." });
    },
    onError: () => toast({ title: "Failed to convert program", variant: "destructive" }),
  });

  const { data: programsData } = useQuery<any[]>({
    queryKey: ["/api/admin/programs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/programs", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      return d.programs || d || [];
    },
  });
  const programs = Array.isArray(programsData) ? programsData : [];

  const { data: dealStatusesData } = useQuery<any[]>({
    queryKey: ["/api/admin/deal-statuses"],
    queryFn: async () => {
      const res = await fetch("/api/admin/deal-statuses", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: assignedProcessors } = useQuery<any[]>({
    queryKey: ["/api/admin/projects", projectId, "processors"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/projects/${projectId}/processors`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: availableProcessors } = useQuery<any[]>({
    queryKey: ["/api/admin/processors"],
    queryFn: async () => {
      const res = await fetch("/api/admin/processors", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const addProcessorMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("POST", `/api/admin/projects/${projectId}/processors`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects", projectId, "processors"] });
      toast({ title: "Processor assigned" });
    },
    onError: () => toast({ title: "Failed to assign processor", variant: "destructive" }),
  });

  const removeProcessorMutation = useMutation({
    mutationFn: async (processorId: number) => {
      return apiRequest("DELETE", `/api/admin/projects/${projectId}/processors/${processorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects", projectId, "processors"] });
      toast({ title: "Processor removed" });
    },
    onError: () => toast({ title: "Failed to remove processor", variant: "destructive" }),
  });

  const defaultStageOptions = [
    { value: "application", label: "Application" },
    { value: "intake", label: "Intake" },
    { value: "processing", label: "Processing" },
    { value: "underwriting", label: "Underwriting" },
    { value: "approval", label: "Approval" },
    { value: "closing", label: "Closing" },
    { value: "funded", label: "Funded" },
    { value: "documentation", label: "Documentation" },
  ];

  const stageOptions = (programStages && programStages.length > 0)
    ? programStages.map((s: any) => ({
        value: s.stepKey || s.key || s.label?.toLowerCase().replace(/\s+/g, "_") || `stage-${s.id}`,
        label: s.stepName || s.name || s.label || s.stageName || `Stage ${s.id}`,
      }))
    : defaultStageOptions;

  const defaultStatusOptions = [
    { value: "active", label: "Active" },
    { value: "on_hold", label: "On Hold" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "funded", label: "Funded" },
  ];

  const configuredStatuses = Array.isArray(dealStatusesData) ? dealStatusesData : [];
  const statusOptions = configuredStatuses.length > 0
    ? configuredStatuses.filter((s: any) => s.isActive !== false).map((s: any) => ({
        value: s.key,
        label: s.label,
      }))
    : defaultStatusOptions;

  const assignedIds = new Set((assignedProcessors || []).map((p: any) => p.userId));
  const unassignedProcessors = (availableProcessors || []).filter((u: any) => !assignedIds.has(u.id));

  const handleProgramChange = (v: string) => {
    const newProgramId = v === "none" ? null : Number(v);
    setPendingProgramId(newProgramId);
    setShowProgramConfirm(true);
  };

  const confirmProgramChange = () => {
    if (pendingProgramId !== undefined) {
      convertProgramMutation.mutate(pendingProgramId);
    }
    setShowProgramConfirm(false);
    setPendingProgramId(undefined);
  };

  const cancelProgramChange = () => {
    setShowProgramConfirm(false);
    setPendingProgramId(undefined);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-[22px] flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            Deal Controls
          </CardTitle>
        </CardHeader>
        <div className="mx-6 mt-2 mb-3 border-b border-muted" />
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
            <div>
              <span className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Deal Status</span>
              <Select
                value={deal.projectStatus || deal.status || "active"}
                onValueChange={(v) => saveControlMutation.mutate({ status: v })}
              >
                <SelectTrigger className="h-9 mt-1 text-[16px]" data-testid="select-deal-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Current Stage</span>
              <Select
                value={deal.stage || deal.currentStage || "application"}
                onValueChange={(v) => saveControlMutation.mutate({ currentStage: v })}
              >
                <SelectTrigger className="h-9 mt-1 text-[16px]" data-testid="select-current-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stageOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Loan Program</span>
              <Select
                value={deal.programId ? String(deal.programId) : "none"}
                onValueChange={handleProgramChange}
                disabled={convertProgramMutation.isPending || !isAdmin}
              >
                <SelectTrigger className="h-9 mt-1 text-[16px]" data-testid="select-loan-program">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Program</SelectItem>
                  {programs.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Created</span>
              <p className="text-[17px] font-bold mt-2.5">{fmtDate(deal.createdAt)}</p>
            </div>

            <div className="col-span-2 md:col-span-4">
              <span className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Processors</span>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {(assignedProcessors || []).map((p: any) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[13px] font-medium border border-blue-200"
                    data-testid={`processor-badge-${p.userId}`}
                  >
                    {p.user?.fullName || p.user?.email || `User ${p.userId}`}
                    {isAdmin && (
                      <button
                        onClick={() => removeProcessorMutation.mutate(p.id)}
                        className="ml-0.5 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                        data-testid={`remove-processor-${p.userId}`}
                        disabled={removeProcessorMutation.isPending}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
                {isAdmin && unassignedProcessors.length > 0 && (
                  <Select
                    onValueChange={(v) => addProcessorMutation.mutate(Number(v))}
                    value=""
                  >
                    <SelectTrigger
                      className="h-8 w-[200px] text-[13px] border-dashed"
                      data-testid="select-add-processor"
                    >
                      <SelectValue placeholder="Add processor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedProcessors.map((u: any) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.fullName || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {(!assignedProcessors || assignedProcessors.length === 0) && unassignedProcessors.length === 0 && (
                  <span className="text-[14px] text-muted-foreground">No processors available</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showProgramConfirm} onOpenChange={setShowProgramConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Loan Program?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing the loan program will rebuild this deal's pipeline, including stages, document requirements, and tasks.
              Uploaded documents will be preserved, but the checklist structure will be replaced with the new program's template.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelProgramChange} data-testid="cancel-program-change">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmProgramChange}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-program-change"
            >
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
