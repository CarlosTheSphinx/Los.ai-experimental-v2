import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Building2, Plug, Layers, DollarSign, FileSearch, Bot, MessageSquare,
  Users, Shield, Link, Check, Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useTenantConfig } from "@/hooks/use-tenant-config";
import {
  StepCompanyProfile,
  StepIntegrations,
  StepProgramsWorkflow,
  StepAIAgent,
  StepCommunications,
  StepDocumentReview,
  StepTeamSetup,
  StepRolePermissions,
  StepMagicLinks,
} from "./onboarding-v1";
import { PricingConfiguration } from "@/components/onboarding/PricingConfiguration";

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
  const [hasVisitedStep3, setHasVisitedStep3] = useState(currentStep === 3);

  const { data: googleStatusData } = useQuery<{
    connected: boolean;
    gmail: { connected: boolean; emailAddress: string | null };
    drive: { connected: boolean };
  }>({
    queryKey: ["/api/google/status"],
  });

  const { data: programsData, isLoading: programsLoading } = useQuery<{ programs: any[] }>({
    queryKey: ["/api/programs-with-pricing"],
  });

  const { data: teamData, isLoading: teamLoading } = useQuery<{ users: any[] }>({
    queryKey: ["/api/admin/users"],
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<{ settings: any[] }>({
    queryKey: ["/api/admin/settings"],
  });

  const { data: integrationsData } = useQuery<{ integrations: any }>({
    queryKey: ["/api/admin/integrations/status"],
  });

  const tenantConfig = useTenantConfig("tenant_branding", {
    companyName: "",
    supportEmail: "",
    emailSenderName: "",
    logoLightUrl: "",
    logoDarkUrl: "",
  });

  const emailConnected = googleStatusData?.gmail?.connected || false;
  const resendConnected = integrationsData?.integrations?.resend?.connected || false;
  const hasPrograms = (programsData?.programs?.length || 0) > 0;

  const driveFolderSetting = settingsData?.settings?.find((s: any) => s.settingKey === "google_drive_parent_folder_id");
  const oneDriveFolderSetting = settingsData?.settings?.find((s: any) => s.settingKey === "onedrive_parent_folder_path");

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

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      const next = currentStep + 1;
      if (next === 3) setHasVisitedStep3(true);
      setCurrentStep(next);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prev = currentStep - 1;
      if (prev === 3) setHasVisitedStep3(true);
      setCurrentStep(prev);
    }
  };

  const handleStepClick = (stepId: number) => {
    if (stepId === 3) setHasVisitedStep3(true);
    setCurrentStep(stepId);
  };

  const stepCompletion = useMemo(() => {
    const getSetting = (key: string) =>
      settingsData?.settings?.find((s: any) => s.settingKey === key)?.settingValue;
    const companyName = getSetting("company_name") || getSetting("tenant_branding");

    return new Map<number, boolean>([
      [1, !!companyName],
      [2, emailConnected],
      [3, hasPrograms],
      [4, hasPrograms],
      [5, false],
      [6, false],
      [7, emailConnected],
      [8, (teamData?.users?.length || 0) > 1],
      [9, false],
      [10, false],
    ]);
  }, [googleStatusData, programsData, teamData, settingsData, emailConnected, hasPrograms]);

  const completedCount = Array.from(stepCompletion.values()).filter(Boolean).length;
  const progressPct = Math.round((completedCount / STEPS.length) * 100);
  const activeStep = STEPS.find((s) => s.id === currentStep)!;

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
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
                      onClick={() => handleStepClick(step.id)}
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

          {currentStep === 1 && (
            <StepCompanyProfile
              userName={user?.fullName || user?.firstName || "there"}
              tenantConfig={tenantConfig}
              onNext={handleNext}
            />
          )}
          {currentStep === 2 && (
            <StepIntegrations
              driveFolderId={driveFolderSetting?.settingValue || ""}
              oneDriveFolderPath={oneDriveFolderSetting?.settingValue || ""}
              isSettingsLoading={settingsLoading}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {hasVisitedStep3 && (
            <div style={{ display: currentStep === 3 ? "block" : "none" }}>
              <StepProgramsWorkflow
                hasPrograms={hasPrograms}
                programCount={programsData?.programs?.length || 0}
                isLoading={programsLoading}
                onNext={handleNext}
                onBack={handleBack}
                onNavigate={setLocation}
              />
            </div>
          )}
          {currentStep === 4 && (
            <PricingConfiguration
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 5 && (
            <StepDocumentReview
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 6 && (
            <StepAIAgent
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 7 && (
            <StepCommunications
              emailConnected={emailConnected}
              onNext={handleNext}
              onBack={handleBack}
              onNavigate={setLocation}
            />
          )}
          {currentStep === 8 && (
            <StepTeamSetup
              teamData={teamData?.users || []}
              isLoading={teamLoading}
              emailConnected={resendConnected}
              onNext={handleNext}
              onBack={handleBack}
              onNavigate={setLocation}
            />
          )}
          {currentStep === 9 && (
            <StepRolePermissions
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 10 && (
            <StepMagicLinks
              onboardingCompleted={!!user?.onboardingCompleted}
              onBack={handleBack}
              onNavigate={setLocation}
              onCompleteOnboarding={() => completeOnboardingMutation.mutate()}
              isCompleting={completeOnboardingMutation.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}
