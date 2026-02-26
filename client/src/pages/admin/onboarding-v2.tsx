import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Building2, Plug, Layers, DollarSign, FileSearch, Bot, MessageSquare,
  Users, Shield, Link, CheckCircle2, ChevronRight, ArrowRight, Rocket, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

const STEPS = [
  { id: 1, label: "Company Profile", icon: Building2, group: "Foundation" },
  { id: 2, label: "Integrations", icon: Plug, group: "Foundation" },
  { id: 3, label: "Loan Programs", icon: Layers, group: "Lending Setup" },
  { id: 4, label: "Pricing", icon: DollarSign, group: "Lending Setup" },
  { id: 5, label: "Doc Review", icon: FileSearch, group: "Lending Setup" },
  { id: 6, label: "AI Agent", icon: Bot, group: "Lending Setup" },
  { id: 7, label: "Communications", icon: MessageSquare, group: "Team & Access" },
  { id: 8, label: "Team Members", icon: Users, group: "Team & Access" },
  { id: 9, label: "Role Permissions", icon: Shield, group: "Team & Access" },
  { id: 10, label: "Magic Links", icon: Link, group: "Team & Access" },
];

const GROUPS = ["Foundation", "Lending Setup", "Team & Access"];

export default function OnboardingV2() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const initialStep = (() => {
    const params = new URLSearchParams(window.location.search);
    const s = parseInt(params.get("step") || "1", 10);
    return s >= 1 && s <= STEPS.length ? s : 1;
  })();
  const [currentStep, setCurrentStep] = useState(initialStep);

  const { data: googleStatusData } = useQuery<{
    connected: boolean;
    gmail: { connected: boolean; emailAddress: string | null };
    drive: { connected: boolean };
  }>({
    queryKey: ["/api/google/status"],
  });

  const { data: programsData } = useQuery<{ programs: any[] }>({
    queryKey: ["/api/programs-with-pricing"],
  });

  const { data: teamData } = useQuery<{ users: any[] }>({
    queryKey: ["/api/admin/users"],
  });

  const { data: settingsData } = useQuery<{ settings: any[] }>({
    queryKey: ["/api/admin/settings"],
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/complete-onboarding", {});
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await qc.refetchQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Setup complete", description: "Welcome to the platform!" });
      setLocation("/admin/deals");
    },
    onError: () => {
      toast({ title: "Error", description: "Could not complete setup.", variant: "destructive" });
    },
  });

  const stepCompletion = useMemo(() => {
    const getSetting = (key: string) =>
      settingsData?.settings?.find((s: any) => s.settingKey === key)?.settingValue;
    const companyName = getSetting("company_name") || getSetting("tenant_branding");
    const emailConnected = googleStatusData?.gmail?.connected || false;
    const hasPrograms = (programsData?.programs?.length || 0) > 0;
    const hasTeam = (teamData?.users?.length || 0) > 1;

    return new Map<number, boolean>([
      [1, !!companyName],
      [2, emailConnected],
      [3, hasPrograms],
      [4, hasPrograms],
      [5, false],
      [6, false],
      [7, emailConnected],
      [8, hasTeam],
      [9, false],
      [10, false],
    ]);
  }, [googleStatusData, programsData, teamData, settingsData]);

  const completedCount = Array.from(stepCompletion.values()).filter(Boolean).length;
  const progressPct = Math.round((completedCount / STEPS.length) * 100);
  const activeStep = STEPS.find((s) => s.id === currentStep)!;

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Left Panel — Setup Progress */}
      <div className="w-[340px] border-r bg-slate-50/50 dark:bg-card shrink-0 flex flex-col">
        <div className="p-6 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3" data-testid="text-setup-progress-title">
            Setup Progress
          </h2>
          <Progress value={progressPct} className="h-2 mb-2" />
          <p className="text-sm text-muted-foreground" data-testid="text-steps-count">
            {completedCount} of {STEPS.length} steps complete
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-5 pb-4" data-testid="nav-onboarding-steps">
          {GROUPS.map((group) => (
            <div key={group} className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                {group}
              </p>
              <div className="space-y-1">
                {STEPS.filter((s) => s.group === group).map((step) => {
                  const isActive = step.id === currentStep;
                  const isComplete = stepCompletion.get(step.id) || false;
                  return (
                    <button
                      key={step.id}
                      onClick={() => setCurrentStep(step.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                        isActive
                          ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                          : "hover:bg-muted/50"
                      }`}
                      data-testid={`button-step-${step.id}`}
                    >
                      {isComplete ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${
                          isActive
                            ? "bg-blue-500 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                        }`}>
                          {step.id}
                        </div>
                      )}
                      <span className={`flex-1 text-[14px] ${
                        isActive ? "font-semibold text-foreground" : "text-foreground"
                      }`}>
                        {step.label}
                      </span>
                      {isComplete && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400" data-testid={`status-step-done-${step.id}`}>
                          Done
                        </span>
                      )}
                      {isActive && !isComplete && (
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400" data-testid={`status-step-current-${step.id}`}>
                          Current
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t">
          <Button
            className="w-full"
            onClick={() => completeOnboardingMutation.mutate()}
            disabled={completedCount < 3 || completeOnboardingMutation.isPending}
            data-testid="button-complete-setup"
          >
            <Rocket className="h-4 w-4 mr-2" />
            {completeOnboardingMutation.isPending ? "Completing..." : "Complete Setup"}
          </Button>
          {completedCount < 3 && (
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Complete at least 3 steps to continue
            </p>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <activeStep.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[18px] font-bold" data-testid="text-step-title">{activeStep.label}</h1>
                {stepCompletion.get(activeStep.id) && (
                  <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    Complete
                  </Badge>
                )}
              </div>
              <p className="text-[13px] text-muted-foreground">
                Step {activeStep.id} of {STEPS.length} · {activeStep.group}
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="py-8 text-center">
              <activeStep.icon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-[15px] font-semibold mb-2">
                {stepCompletion.get(activeStep.id) ? `${activeStep.label} is configured` : `Configure ${activeStep.label}`}
              </h3>
              <p className="text-[13px] text-muted-foreground max-w-md mx-auto mb-4">
                {getStepDescription(activeStep.id)}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  const configRoutes: Record<number, string> = {
                    1: "/admin/settings",
                    2: "/admin/settings",
                    3: "/admin/programs",
                    4: "/admin/programs",
                    7: "/admin/settings",
                    8: "/admin/users",
                    9: "/admin/team-permissions",
                  };
                  if (configRoutes[activeStep.id]) {
                    window.location.href = configRoutes[activeStep.id];
                  }
                }}
                data-testid="button-step-action"
              >
                {stepCompletion.get(activeStep.id) ? "Review Settings" : "Get Started"}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-between mt-6">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              data-testid="button-step-previous"
            >
              Previous
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep((s) => Math.min(STEPS.length, s + 1))}
                data-testid="button-step-skip"
              >
                Skip
              </Button>
              <Button
                size="sm"
                disabled={currentStep === STEPS.length}
                onClick={() => setCurrentStep((s) => Math.min(STEPS.length, s + 1))}
                data-testid="button-step-next"
              >
                Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStepDescription(stepId: number): string {
  const descriptions: Record<number, string> = {
    1: "Set up your company name, logo, and branding details.",
    2: "Connect email, Google Drive, and other integrations.",
    3: "Create and configure your loan programs (DSCR, RTL, Bridge).",
    4: "Set up pricing tiers, rate adjusters, and compensation.",
    5: "Configure document review requirements and AI analysis settings.",
    6: "Set up the AI agent behavior and automation rules.",
    7: "Configure email templates, notifications, and communication preferences.",
    8: "Invite team members and assign their roles.",
    9: "Define role-based permissions and access levels.",
    10: "Generate magic links for borrower and broker portals.",
  };
  return descriptions[stepId] || "";
}
