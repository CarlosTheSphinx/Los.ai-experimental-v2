import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  GripVertical,
  Eye,
  FileText,
  Shield,
  UserPlus,
  CheckCircle2,
  Rocket,
  BarChart3,
  MessageSquare,
  Zap,
  BookOpen,
  Target,
  FolderKanban,
  Plus,
  Trash2,
} from "lucide-react";

// ---- Types ----

interface StepContent {
  title: string;
  subtitle?: string;
  description?: string;
  url?: string;
  skipEnabled?: boolean;
  // Agreement-specific
  body?: string;
  checkboxLabel?: string;
  required?: boolean;
  // Tour-specific
  cards?: TourCard[];
  // Completion-specific
  message?: string;
}

interface TourCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
}

interface OnboardingStep {
  id: number;
  name: string;
  label: string;
  enabled: boolean;
  order: number;
  content: StepContent;
}

export interface BrokerOnboardingConfigType {
  steps: OnboardingStep[];
}

const DEFAULT_TOUR_CARDS: TourCard[] = [
  { id: "dashboard", icon: "BarChart3", title: "Dashboard", description: "Track all your deals, pipeline metrics, and performance in one place.", enabled: true },
  { id: "pipeline", icon: "FolderKanban", title: "Pipeline", description: "Monitor deal progress through automated stages from application to closing.", enabled: true },
  { id: "ai-review", icon: "Zap", title: "AI Document Review", description: "Upload documents and let AI extract data, flag issues, and verify compliance.", enabled: true },
  { id: "assistant", icon: "MessageSquare", title: "AI Assistant", description: "Ask questions, get status updates, and automate tasks with your AI assistant.", enabled: true },
  { id: "messages", icon: "MessageSquare", title: "Messages", description: "Communicate with your team and borrowers in a centralized message hub.", enabled: true },
  { id: "prospect", icon: "Target", title: "Smart Prospect", description: "Find and engage new clients with AI-powered outreach and lead tracking.", enabled: true },
];

export const BROKER_CONFIG_DEFAULTS: BrokerOnboardingConfigType = {
  steps: [
    {
      id: 1, name: "welcome", label: "Welcome", enabled: true, order: 1,
      content: {
        title: "Welcome to Lendry",
        subtitle: "Let's get you set up",
        description: "We're excited to have you on board. Let's walk through a quick setup to get you started.",
      },
    },
    {
      id: 2, name: "account", label: "Account", enabled: true, order: 2,
      content: {
        title: "Create Your Account",
        description: "Sign in or create an account to save your progress and receive updates.",
      },
    },
    {
      id: 3, name: "agreement", label: "Agreement", enabled: true, order: 3,
      content: {
        title: "Partnership Agreement",
        body: "By signing this agreement, you acknowledge that you have read and agree to the terms and conditions of our partnership program.",
        checkboxLabel: "I have read and agree to the partnership agreement",
        required: true,
      },
    },
    {
      id: 4, name: "tour", label: "Tour", enabled: true, order: 4,
      content: {
        title: "Platform Features",
        description: "Here's what you can do with Lendry:",
        cards: DEFAULT_TOUR_CARDS,
      },
    },
    {
      id: 5, name: "start", label: "Start", enabled: true, order: 5,
      content: {
        title: "You're All Set!",
        message: "Your account is ready. Head to your dashboard to start submitting deals.",
      },
    },
  ],
};

// ---- Icon mapping ----
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3, FolderKanban, Zap, MessageSquare, Target, BookOpen, Shield, FileText,
};

function getIcon(iconName: string) {
  return ICON_MAP[iconName] || BarChart3;
}

// ---- Step name icons ----
const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  welcome: CheckCircle2,
  account: UserPlus,
  agreement: Shield,
  tour: BookOpen,
  start: Rocket,
};

// ---- Component ----

interface Props {
  config: BrokerOnboardingConfigType;
  updateConfig: (partial: Partial<BrokerOnboardingConfigType>) => void;
  updateField: <K extends keyof BrokerOnboardingConfigType>(field: K, value: BrokerOnboardingConfigType[K]) => void;
}

export function BrokerOnboardingConfig({ config, updateConfig, updateField }: Props) {
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [previewStep, setPreviewStep] = useState(0);

  const enabledSteps = config.steps.filter(s => s.enabled).sort((a, b) => a.order - b.order);

  const updateStep = (stepId: number, updates: Partial<OnboardingStep>) => {
    const newSteps = config.steps.map(s =>
      s.id === stepId ? { ...s, ...updates } : s
    );
    updateField("steps", newSteps);
  };

  const updateStepContent = (stepId: number, contentUpdates: Partial<StepContent>) => {
    const step = config.steps.find(s => s.id === stepId);
    if (!step) return;
    updateStep(stepId, { content: { ...step.content, ...contentUpdates } });
  };

  const updateTourCard = (stepId: number, cardId: string, updates: Partial<TourCard>) => {
    const step = config.steps.find(s => s.id === stepId);
    if (!step?.content.cards) return;
    const newCards = step.content.cards.map(c =>
      c.id === cardId ? { ...c, ...updates } : c
    );
    updateStepContent(stepId, { cards: newCards });
  };

  const addTourCard = (stepId: number) => {
    const step = config.steps.find(s => s.id === stepId);
    if (!step?.content.cards) return;
    const newCard: TourCard = {
      id: `card-${Date.now()}`,
      icon: "BarChart3",
      title: "New Feature",
      description: "Describe this feature.",
      enabled: true,
    };
    updateStepContent(stepId, { cards: [...step.content.cards, newCard] });
  };

  const removeTourCard = (stepId: number, cardId: string) => {
    const step = config.steps.find(s => s.id === stepId);
    if (!step?.content.cards) return;
    updateStepContent(stepId, { cards: step.content.cards.filter(c => c.id !== cardId) });
  };

  const moveStep = (stepId: number, direction: "up" | "down") => {
    const sorted = [...config.steps].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(s => s.id === stepId);
    if (direction === "up" && idx > 0) {
      const prev = sorted[idx - 1];
      const curr = sorted[idx];
      const newSteps = config.steps.map(s => {
        if (s.id === curr.id) return { ...s, order: prev.order };
        if (s.id === prev.id) return { ...s, order: curr.order };
        return s;
      });
      updateField("steps", newSteps);
    } else if (direction === "down" && idx < sorted.length - 1) {
      const next = sorted[idx + 1];
      const curr = sorted[idx];
      const newSteps = config.steps.map(s => {
        if (s.id === curr.id) return { ...s, order: next.order };
        if (s.id === next.id) return { ...s, order: curr.order };
        return s;
      });
      updateField("steps", newSteps);
    }
  };

  const currentPreviewStep = enabledSteps[previewStep] || enabledSteps[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Configuration */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Onboarding Steps</CardTitle>
            <CardDescription>
              Configure the steps brokers see when they first sign up. Toggle steps on/off and customize content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...config.steps].sort((a, b) => a.order - b.order).map((step, idx) => {
              const StepIcon = STEP_ICONS[step.name] || CheckCircle2;
              const isExpanded = expandedStep === step.id;

              return (
                <div key={step.id} className="border rounded-lg">
                  {/* Step Header */}
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <StepIcon className="h-4 w-4 text-primary" />
                    <span className="font-medium flex-1">{step.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); moveStep(step.id, "up"); }}
                          disabled={idx === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); moveStep(step.id, "down"); }}
                          disabled={idx === config.steps.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <Switch
                        checked={step.enabled}
                        onCheckedChange={(checked) => updateStep(step.id, { enabled: checked })}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t pt-3">
                      {/* Common fields */}
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs">Step Label</Label>
                          <Input
                            value={step.label}
                            onChange={(e) => updateStep(step.id, { label: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Title</Label>
                          <Input
                            value={step.content.title}
                            onChange={(e) => updateStepContent(step.id, { title: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                        {step.content.description !== undefined && (
                          <div>
                            <Label className="text-xs">Description</Label>
                            <Textarea
                              value={step.content.description || ""}
                              onChange={(e) => updateStepContent(step.id, { description: e.target.value })}
                              className="text-sm min-h-[60px]"
                            />
                          </div>
                        )}
                        {step.content.subtitle !== undefined && (
                          <div>
                            <Label className="text-xs">Subtitle</Label>
                            <Input
                              value={step.content.subtitle || ""}
                              onChange={(e) => updateStepContent(step.id, { subtitle: e.target.value })}
                              className="h-8 text-sm"
                            />
                          </div>
                        )}
                      </div>

                      {/* Account-specific */}
                      {step.name === "account" && (
                        <div className="space-y-2">
                          <Separator />
                          <p className="text-xs text-muted-foreground">
                            This step shows a sign-in / registration form with Google sign-in option. Users must create an account or log in before proceeding.
                          </p>
                        </div>
                      )}

                      {/* Agreement-specific */}
                      {step.name === "agreement" && (
                        <div className="space-y-2">
                          <Separator />
                          <div>
                            <Label className="text-xs">Agreement Body</Label>
                            <Textarea
                              value={step.content.body || ""}
                              onChange={(e) => updateStepContent(step.id, { body: e.target.value })}
                              className="text-sm min-h-[100px]"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Checkbox Label</Label>
                            <Input
                              value={step.content.checkboxLabel || ""}
                              onChange={(e) => updateStepContent(step.id, { checkboxLabel: e.target.value })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={step.content.required ?? true}
                              onCheckedChange={(checked) => updateStepContent(step.id, { required: checked })}
                            />
                            <Label className="text-xs">Signature required to continue</Label>
                          </div>
                        </div>
                      )}

                      {/* Tour-specific */}
                      {step.name === "tour" && step.content.cards && (
                        <div className="space-y-2">
                          <Separator />
                          <Label className="text-xs font-medium">Feature Cards</Label>
                          {step.content.cards.map((card) => (
                            <div key={card.id} className="flex items-start gap-2 p-2 border rounded bg-muted/30">
                              <Switch
                                checked={card.enabled}
                                onCheckedChange={(checked) => updateTourCard(step.id, card.id, { enabled: checked })}
                                className="mt-1"
                              />
                              <div className="flex-1 space-y-1">
                                <Input
                                  value={card.title}
                                  onChange={(e) => updateTourCard(step.id, card.id, { title: e.target.value })}
                                  className="h-7 text-xs font-medium"
                                />
                                <Input
                                  value={card.description}
                                  onChange={(e) => updateTourCard(step.id, card.id, { description: e.target.value })}
                                  className="h-7 text-xs"
                                />
                              </div>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                onClick={() => removeTourCard(step.id, card.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline" size="sm" className="w-full"
                            onClick={() => addTourCard(step.id)}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add Feature Card
                          </Button>
                        </div>
                      )}

                      {/* Completion-specific */}
                      {step.name === "start" && (
                        <div className="space-y-2">
                          <Separator />
                          <div>
                            <Label className="text-xs">Completion Message</Label>
                            <Textarea
                              value={step.content.message || ""}
                              onChange={(e) => updateStepContent(step.id, { message: e.target.value })}
                              className="text-sm min-h-[60px]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Right: Live Preview */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Live Preview
                </CardTitle>
                <CardDescription>
                  This is what brokers will see during onboarding.
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => setPreviewStep(Math.max(0, previewStep - 1))}
                  disabled={previewStep === 0}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  {previewStep + 1} / {enabledSteps.length}
                </span>
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => setPreviewStep(Math.min(enabledSteps.length - 1, previewStep + 1))}
                  disabled={previewStep >= enabledSteps.length - 1}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {enabledSteps.map((step, idx) => (
                <button
                  key={step.id}
                  onClick={() => setPreviewStep(idx)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                    idx === previewStep
                      ? "bg-primary text-primary-foreground"
                      : idx < previewStep
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span>{idx + 1}</span>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              ))}
            </div>

            {/* Preview content */}
            {currentPreviewStep && (
              <div className="border rounded-lg p-6 bg-background min-h-[400px]">
                {/* Welcome preview */}
                {currentPreviewStep.name === "welcome" && (
                  <div className="text-center space-y-4 py-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">{currentPreviewStep.content.title}</h2>
                    {currentPreviewStep.content.subtitle && (
                      <p className="text-lg text-muted-foreground">{currentPreviewStep.content.subtitle}</p>
                    )}
                    {currentPreviewStep.content.description && (
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">{currentPreviewStep.content.description}</p>
                    )}
                    <Button className="mt-4" disabled>Continue</Button>
                  </div>
                )}

                {/* Account preview */}
                {currentPreviewStep.name === "account" && (
                  <div className="text-center space-y-4 py-4">
                    <h2 className="text-xl font-bold">{currentPreviewStep.content.title}</h2>
                    {currentPreviewStep.content.description && (
                      <p className="text-sm text-muted-foreground">{currentPreviewStep.content.description}</p>
                    )}
                    <div className="max-w-sm mx-auto space-y-3">
                      <Button variant="outline" className="w-full" disabled>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Continue with Google
                      </Button>
                      <div className="relative">
                        <Separator />
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">or</span>
                      </div>
                      <div className="space-y-2 text-left">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="h-8 bg-muted rounded border text-xs flex items-center px-2 text-muted-foreground">First Name</div>
                          <div className="h-8 bg-muted rounded border text-xs flex items-center px-2 text-muted-foreground">Last Name</div>
                        </div>
                        <div className="h-8 bg-muted rounded border text-xs flex items-center px-2 text-muted-foreground">Email</div>
                        <div className="h-8 bg-muted rounded border text-xs flex items-center px-2 text-muted-foreground">Password</div>
                      </div>
                      <Button className="w-full" disabled>Create Account</Button>
                    </div>
                  </div>
                )}

                {/* Agreement preview */}
                {currentPreviewStep.name === "agreement" && (
                  <div className="space-y-4 py-4">
                    <h2 className="text-xl font-bold text-center">{currentPreviewStep.content.title}</h2>
                    <div className="border rounded p-4 bg-muted/30 max-h-[200px] overflow-y-auto text-sm">
                      {currentPreviewStep.content.body || "No agreement text configured."}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border rounded" />
                      <span className="text-sm">{currentPreviewStep.content.checkboxLabel || "I agree"}</span>
                    </div>
                    <Button disabled className="w-full">
                      {currentPreviewStep.content.required ? "Sign & Continue" : "Continue"}
                    </Button>
                  </div>
                )}

                {/* Tour preview */}
                {currentPreviewStep.name === "tour" && (
                  <div className="space-y-4 py-4">
                    <h2 className="text-xl font-bold text-center">{currentPreviewStep.content.title}</h2>
                    {currentPreviewStep.content.description && (
                      <p className="text-sm text-muted-foreground text-center">{currentPreviewStep.content.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {currentPreviewStep.content.cards?.filter(c => c.enabled).map((card) => {
                        const Icon = getIcon(card.icon);
                        return (
                          <div key={card.id} className="border rounded-lg p-3 space-y-1">
                            <Icon className="h-5 w-5 text-primary" />
                            <h4 className="font-medium text-sm">{card.title}</h4>
                            <p className="text-xs text-muted-foreground">{card.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Completion preview */}
                {currentPreviewStep.name === "start" && (
                  <div className="text-center space-y-4 py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Rocket className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold">{currentPreviewStep.content.title}</h2>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {currentPreviewStep.content.message}
                    </p>
                    <Button disabled>Go to Dashboard</Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
