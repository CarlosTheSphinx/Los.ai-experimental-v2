import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Bot, FileSearch, Cog, MessageSquare, Mail, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AgentCustomization {
  id?: number;
  userId?: number;
  agentType: string;
  additionalPrompt: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const AGENT_TYPES = [
  {
    type: "document_intelligence",
    label: "Document Intelligence",
    icon: FileSearch,
    description: "Extracts and validates data from uploaded loan documents. Customize to flag specific document types, enforce naming conventions, or add extraction rules unique to your lending operation.",
    placeholder: "e.g., Always flag appraisals older than 6 months. For construction loans, require a detailed budget breakdown in the extraction. Treat all environmental reports as high-priority documents.",
  },
  {
    type: "processor",
    label: "Deal Processor",
    icon: Cog,
    description: "Analyzes deal data, assesses risk, and generates findings. Customize to add your underwriting criteria, risk thresholds, or deal evaluation rules.",
    placeholder: "e.g., Flag any deal with a DSCR below 1.25 as high risk. For multifamily properties, always calculate per-unit loan amount. Our maximum LTV for bridge loans is 75%.",
  },
  {
    type: "communication",
    label: "Communication Draft",
    icon: MessageSquare,
    description: "Drafts professional emails, status updates, and borrower communications. Customize to match your firm's tone, include standard disclaimers, or define communication preferences.",
    placeholder: "e.g., Always include our NMLS number (12345) in email footers. Use a formal but friendly tone. Sign all emails as 'The Lending Team at [Company Name]'. Never promise specific closing dates.",
  },
  {
    type: "email_doc_classifier",
    label: "Email Document Classifier",
    icon: Mail,
    description: "Classifies documents received via email into lending categories. Customize to add your own document types or classification rules.",
    placeholder: "e.g., Treat any PDF from appraisal@company.com as an appraisal report. Documents labeled 'Phase I' or 'ESA' should be classified as environmental reports. Our firm uses 'LOI' for letters of intent.",
  },
];

export default function AICustomizationConfig() {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, AgentCustomization>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Fetch existing customizations
  const { data: customizations, isLoading } = useQuery<AgentCustomization[]>({
    queryKey: ["/api/admin/agents/customizations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/agents/customizations");
      return res.json();
    },
  });

  // Initialize drafts from server data
  useEffect(() => {
    if (customizations) {
      const map: Record<string, AgentCustomization> = {};
      for (const c of customizations) {
        map[c.agentType] = c;
      }
      // Fill in defaults for agent types that don't have customizations yet
      for (const agent of AGENT_TYPES) {
        if (!map[agent.type]) {
          map[agent.type] = {
            agentType: agent.type,
            additionalPrompt: "",
            isActive: true,
          };
        }
      }
      setDrafts(map);
    }
  }, [customizations]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (customization: AgentCustomization) => {
      const res = await apiRequest("PUT", "/api/admin/agents/customizations", {
        agentType: customization.agentType,
        additionalPrompt: customization.additionalPrompt,
        isActive: customization.isActive,
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents/customizations"] });
      toast({
        title: "Saved",
        description: `AI customization for ${AGENT_TYPES.find(a => a.type === variables.agentType)?.label || variables.agentType} saved successfully.`,
      });
      setSaving(null);
    },
    onError: (error: any, variables) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save customization",
        variant: "destructive",
      });
      setSaving(null);
    },
  });

  const handleSave = (agentType: string) => {
    const draft = drafts[agentType];
    if (!draft) return;
    setSaving(agentType);
    saveMutation.mutate(draft);
  };

  const updateDraft = (agentType: string, field: keyof AgentCustomization, value: any) => {
    setDrafts((prev) => ({
      ...prev,
      [agentType]: {
        ...prev[agentType],
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Agent Customization
          </CardTitle>
          <CardDescription>
            Add custom instructions to each AI agent. Your prompts are layered on top of the platform's
            baseline intelligence — they don't replace it, they enhance it. Use this to tailor agent
            behavior to your firm's specific lending criteria, communication style, and operational rules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              These customizations are additive. The platform's master AI configuration handles core
              loan processing logic. Your instructions here tell the agents about your specific
              requirements, preferences, and business rules.
            </p>
          </div>
        </CardContent>
      </Card>

      {AGENT_TYPES.map((agent) => {
        const draft = drafts[agent.type];
        const Icon = agent.icon;
        const hasContent = draft?.additionalPrompt && draft.additionalPrompt.trim().length > 0;

        return (
          <Card key={agent.type}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{agent.label}</CardTitle>
                  {hasContent && draft?.isActive && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                  {hasContent && !draft?.isActive && (
                    <Badge variant="secondary" className="text-xs">Paused</Badge>
                  )}
                </div>
                {hasContent && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`toggle-${agent.type}`} className="text-sm text-muted-foreground">
                      Enabled
                    </Label>
                    <Switch
                      id={`toggle-${agent.type}`}
                      checked={draft?.isActive ?? true}
                      onCheckedChange={(checked) => updateDraft(agent.type, "isActive", checked)}
                    />
                  </div>
                )}
              </div>
              <CardDescription>{agent.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`prompt-${agent.type}`}>Additional Instructions</Label>
                <Textarea
                  id={`prompt-${agent.type}`}
                  placeholder={agent.placeholder}
                  value={draft?.additionalPrompt || ""}
                  onChange={(e) => updateDraft(agent.type, "additionalPrompt", e.target.value)}
                  className="min-h-[120px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Write in plain English. These instructions will be appended to the agent's core prompt when processing your deals.
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave(agent.type)}
                  disabled={saving === agent.type}
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving === agent.type ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
