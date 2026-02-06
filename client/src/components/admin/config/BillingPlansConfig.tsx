import { useTenantConfig } from "@/hooks/use-tenant-config";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useEffect } from "react";
import { Save, CreditCard, Users, ToggleRight } from "lucide-react";

const defaults = {
  maxSeats: 0,
  maxQuotesPerMonth: 0,
  maxDocumentsPerMonth: 0,
  maxStorageGb: 0,
  featuresEnabled: {
    pricingEngine: true,
    documentSigning: true,
    borrowerPortal: true,
    messaging: true,
    apiAccess: false,
    customBranding: false,
    advancedReporting: false,
    multiLocation: false,
  },
  planName: "",
  planNotes: "",
};

const featureLabels: Record<string, string> = {
  pricingEngine: "Pricing Engine",
  documentSigning: "Document Signing",
  borrowerPortal: "Borrower Portal",
  messaging: "Messaging",
  apiAccess: "API Access",
  customBranding: "Custom Branding",
  advancedReporting: "Advanced Reporting",
  multiLocation: "Multi-Location",
};

export default function BillingPlansConfig() {
  const { config, isLoading, hasChanges, updateField, updateConfig, save, isPending, isSuccess } =
    useTenantConfig("tenant_billing", defaults);
  const { toast } = useToast();

  useEffect(() => {
    if (isSuccess) {
      toast({ title: "Billing settings saved", description: "Your billing and plan configuration has been updated." });
    }
  }, [isSuccess]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="text-billing-title">Billing & Plans</CardTitle>
        <CardDescription data-testid="text-billing-description">
          Manage plan limits, seat caps, and feature gating for this tenant.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Plan Info</h3>
          </div>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="planName">Plan Name</Label>
              <Input
                id="planName"
                data-testid="input-plan-name"
                value={config.planName}
                onChange={(e) => updateField("planName", e.target.value)}
                placeholder="e.g. Professional, Enterprise"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planNotes">Plan Notes</Label>
              <Textarea
                id="planNotes"
                data-testid="input-plan-notes"
                value={config.planNotes}
                onChange={(e) => updateField("planNotes", e.target.value)}
                placeholder="Internal notes about this plan..."
                rows={3}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Seat & Usage Limits</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              { key: "maxSeats" as const, label: "Max Seats" },
              { key: "maxQuotesPerMonth" as const, label: "Max Quotes / Month" },
              { key: "maxDocumentsPerMonth" as const, label: "Max Documents / Month" },
              { key: "maxStorageGb" as const, label: "Max Storage (GB)" },
            ]).map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  data-testid={`input-${key}`}
                  type="number"
                  min={0}
                  value={config[key]}
                  onChange={(e) => updateField(key, parseInt(e.target.value) || 0)}
                />
                <p className="text-sm text-muted-foreground">0 = Unlimited</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ToggleRight className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Feature Gating</h3>
          </div>
          <div className="grid gap-4">
            {Object.entries(featureLabels).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <Label htmlFor={`feature-${key}`}>{label}</Label>
                <Switch
                  id={`feature-${key}`}
                  data-testid={`switch-feature-${key}`}
                  checked={config.featuresEnabled[key as keyof typeof config.featuresEnabled]}
                  onCheckedChange={(checked) =>
                    updateConfig({
                      featuresEnabled: { ...config.featuresEnabled, [key]: checked },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </section>

        <Button
          data-testid="button-save-billing"
          onClick={save}
          disabled={!hasChanges || isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
