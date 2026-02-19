import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Building2,
  DollarSign,
  Calendar,
  Activity,
  FileText,
  CheckSquare,
  Upload,
  FolderOpen,
} from "lucide-react";

// ---- Types ----

export interface BorrowerOnboardingConfigType {
  welcomeMessage: string;
  headerTitle: string;
  headerSubtitle: string;
  sections: {
    dealOverview: boolean;
    stageProgress: boolean;
    documents: boolean;
    activityFeed: boolean;
    loanChecklist: boolean;
  };
  fieldVisibility: {
    propertyAddress: boolean;
    loanAmount: boolean;
    interestRate: boolean;
    loanTerm: boolean;
    targetCloseDate: boolean;
  };
}

export const BORROWER_CONFIG_DEFAULTS: BorrowerOnboardingConfigType = {
  welcomeMessage: "Welcome to your loan portal. Here you can track your loan progress, upload documents, and stay updated on your application.",
  headerTitle: "Your Loan Portal",
  headerSubtitle: "Track your application progress",
  sections: {
    dealOverview: true,
    stageProgress: true,
    documents: true,
    activityFeed: true,
    loanChecklist: true,
  },
  fieldVisibility: {
    propertyAddress: true,
    loanAmount: true,
    interestRate: true,
    loanTerm: true,
    targetCloseDate: true,
  },
};

// ---- Component ----

interface Props {
  config: BorrowerOnboardingConfigType;
  updateConfig: (partial: Partial<BorrowerOnboardingConfigType>) => void;
  updateField: <K extends keyof BorrowerOnboardingConfigType>(field: K, value: BorrowerOnboardingConfigType[K]) => void;
}

const SECTION_META = [
  { key: "dealOverview" as const, label: "Deal Overview", description: "Property info, loan amount, status, key dates", icon: Building2 },
  { key: "stageProgress" as const, label: "Stage Progress Tracker", description: "Visual timeline of loan stages", icon: Activity },
  { key: "documents" as const, label: "Documents & Upload", description: "Document list with file upload capability", icon: FileText },
  { key: "activityFeed" as const, label: "Activity Feed", description: "Timeline of deal events and updates", icon: FolderOpen },
  { key: "loanChecklist" as const, label: "Loan Checklist", description: "Required items and their completion status", icon: CheckSquare },
];

const FIELD_META = [
  { key: "propertyAddress" as const, label: "Property Address" },
  { key: "loanAmount" as const, label: "Loan Amount" },
  { key: "interestRate" as const, label: "Interest Rate" },
  { key: "loanTerm" as const, label: "Loan Term" },
  { key: "targetCloseDate" as const, label: "Target Close Date" },
];

export function BorrowerOnboardingConfig({ config, updateConfig, updateField }: Props) {
  const toggleSection = (key: keyof BorrowerOnboardingConfigType["sections"]) => {
    updateField("sections", { ...config.sections, [key]: !config.sections[key] });
  };

  const toggleField = (key: keyof BorrowerOnboardingConfigType["fieldVisibility"]) => {
    updateField("fieldVisibility", { ...config.fieldVisibility, [key]: !config.fieldVisibility[key] });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Configuration */}
      <div className="space-y-4">
        {/* Welcome Banner Config */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Welcome Banner</CardTitle>
            <CardDescription>Customize the header and welcome message borrowers see when they arrive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Header Title</Label>
              <Input
                value={config.headerTitle}
                onChange={(e) => updateField("headerTitle", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Header Subtitle</Label>
              <Input
                value={config.headerSubtitle}
                onChange={(e) => updateField("headerSubtitle", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Welcome Message</Label>
              <Textarea
                value={config.welcomeMessage}
                onChange={(e) => updateField("welcomeMessage", e.target.value)}
                className="text-sm min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Portal Sections */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Portal Sections</CardTitle>
            <CardDescription>Choose which sections are visible in the borrower portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {SECTION_META.map(({ key, label, description, icon: Icon }) => (
              <div key={key} className="flex items-center gap-3 p-2 border rounded hover:bg-muted/30">
                <Switch
                  checked={config.sections[key]}
                  onCheckedChange={() => toggleSection(key)}
                />
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <span className="text-sm font-medium">{label}</span>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Badge variant={config.sections[key] ? "default" : "secondary"} className="text-[10px]">
                  {config.sections[key] ? "Visible" : "Hidden"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Field Visibility */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Deal Overview Fields</CardTitle>
            <CardDescription>Control which loan details are visible in the deal overview section.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_META.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2 p-2 border rounded">
                  <Switch
                    checked={config.fieldVisibility[key]}
                    onCheckedChange={() => toggleField(key)}
                  />
                  <span className="text-xs">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Live Preview */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-4 w-4" /> Live Preview
            </CardTitle>
            <CardDescription>This is what borrowers will see in their portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg bg-background overflow-hidden">
              {/* Header */}
              <div className="bg-primary/5 border-b p-4">
                <h2 className="text-lg font-bold">{config.headerTitle || "Your Loan Portal"}</h2>
                <p className="text-sm text-muted-foreground">{config.headerSubtitle}</p>
                {config.welcomeMessage && (
                  <p className="text-xs text-muted-foreground mt-2 bg-background/50 rounded p-2">{config.welcomeMessage}</p>
                )}
              </div>

              <div className="p-4 space-y-4">
                {/* Deal Overview */}
                {config.sections.dealOverview && (
                  <div className="border rounded-lg p-3 space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Deal Overview
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {config.fieldVisibility.propertyAddress && (
                        <div><span className="text-muted-foreground">Property:</span> <span className="font-medium">123 Main St, Miami FL</span></div>
                      )}
                      {config.fieldVisibility.loanAmount && (
                        <div><span className="text-muted-foreground">Loan Amount:</span> <span className="font-medium">$500,000</span></div>
                      )}
                      {config.fieldVisibility.interestRate && (
                        <div><span className="text-muted-foreground">Rate:</span> <span className="font-medium">7.25%</span></div>
                      )}
                      {config.fieldVisibility.loanTerm && (
                        <div><span className="text-muted-foreground">Term:</span> <span className="font-medium">30 years</span></div>
                      )}
                      {config.fieldVisibility.targetCloseDate && (
                        <div><span className="text-muted-foreground">Close Date:</span> <span className="font-medium">Mar 15, 2026</span></div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px]">Active</Badge>
                  </div>
                )}

                {/* Stage Progress */}
                {config.sections.stageProgress && (
                  <div className="border rounded-lg p-3 space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Loan Progress
                    </h3>
                    <div className="flex items-center gap-1">
                      {["Application", "Processing", "Underwriting", "Closing"].map((stage, idx) => (
                        <div key={stage} className="flex-1">
                          <div className={`h-2 rounded-full ${idx <= 1 ? "bg-primary" : "bg-muted"}`} />
                          <span className="text-[10px] text-muted-foreground">{stage}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents */}
                {config.sections.documents && (
                  <div className="border rounded-lg p-3 space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Documents
                    </h3>
                    <div className="space-y-1">
                      {["Bank Statements", "Tax Returns", "ID Verification"].map((doc) => (
                        <div key={doc} className="flex items-center justify-between text-xs p-1.5 bg-muted/30 rounded">
                          <span>{doc}</span>
                          <Badge variant="outline" className="text-[10px]">Required</Badge>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-xs h-7" disabled>
                      <Upload className="h-3 w-3 mr-1" /> Upload Documents
                    </Button>
                  </div>
                )}

                {/* Activity Feed */}
                {config.sections.activityFeed && (
                  <div className="border rounded-lg p-3 space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" /> Recent Activity
                    </h3>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Application submitted — 2 days ago
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Documents requested — 1 day ago
                      </div>
                    </div>
                  </div>
                )}

                {/* Loan Checklist */}
                {config.sections.loanChecklist && (
                  <div className="border rounded-lg p-3 space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" /> Loan Checklist
                    </h3>
                    <div className="space-y-1 text-xs">
                      {[
                        { label: "Complete application", done: true },
                        { label: "Upload bank statements", done: false },
                        { label: "Sign disclosure forms", done: false },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded border ${item.done ? "bg-primary border-primary" : "border-muted-foreground"}`} />
                          <span className={item.done ? "line-through text-muted-foreground" : ""}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No sections message */}
                {!Object.values(config.sections).some(Boolean) && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No sections enabled. Borrowers will see an empty portal.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
