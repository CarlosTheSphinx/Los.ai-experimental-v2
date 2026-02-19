import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, RotateCcw, Users, UserCheck, Eye } from "lucide-react";
import { BrokerOnboardingConfig, BROKER_CONFIG_DEFAULTS, type BrokerOnboardingConfigType } from "@/components/admin/config/BrokerOnboardingConfig";
import { BorrowerOnboardingConfig, BORROWER_CONFIG_DEFAULTS, type BorrowerOnboardingConfigType } from "@/components/admin/config/BorrowerOnboardingConfig";
import { useTenantConfig } from "@/hooks/use-tenant-config";

export default function OnboardingConfigPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("broker");

  const brokerConfig = useTenantConfig<BrokerOnboardingConfigType>(
    "onboarding_broker_config",
    BROKER_CONFIG_DEFAULTS
  );

  const borrowerConfig = useTenantConfig<BorrowerOnboardingConfigType>(
    "onboarding_borrower_config",
    BORROWER_CONFIG_DEFAULTS
  );

  const handleSave = () => {
    if (activeTab === "broker" && brokerConfig.hasChanges) {
      brokerConfig.save();
      toast({ title: "Broker onboarding configuration saved" });
    } else if (activeTab === "borrower" && borrowerConfig.hasChanges) {
      borrowerConfig.save();
      toast({ title: "Borrower onboarding configuration saved" });
    }
  };

  const handleReset = () => {
    if (activeTab === "broker") {
      brokerConfig.updateConfig(BROKER_CONFIG_DEFAULTS);
    } else {
      borrowerConfig.updateConfig(BORROWER_CONFIG_DEFAULTS);
    }
    toast({ title: "Reset to defaults", description: "Save to apply changes." });
  };

  const hasChanges = activeTab === "broker" ? brokerConfig.hasChanges : borrowerConfig.hasChanges;
  const isPending = activeTab === "broker" ? brokerConfig.isPending : borrowerConfig.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Onboarding Process</h1>
          <p className="text-muted-foreground mt-1">
            Configure what brokers and borrowers see when they first arrive at their portal links.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              Unsaved changes
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} disabled={isPending}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || isPending}>
            <Save className="h-4 w-4 mr-1" />
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="broker" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Broker Onboarding
          </TabsTrigger>
          <TabsTrigger value="borrower" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Borrower Onboarding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="broker" className="mt-6">
          <BrokerOnboardingConfig
            config={brokerConfig.config}
            updateConfig={brokerConfig.updateConfig}
            updateField={brokerConfig.updateField}
          />
        </TabsContent>

        <TabsContent value="borrower" className="mt-6">
          <BorrowerOnboardingConfig
            config={borrowerConfig.config}
            updateConfig={borrowerConfig.updateConfig}
            updateField={borrowerConfig.updateField}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
