import { useTenantConfig } from "@/hooks/use-tenant-config";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";
import { Save, Plus, Trash2, DollarSign, Percent, Clock, ShieldCheck, Handshake } from "lucide-react";

interface BaseRate {
  product: string;
  rate: number;
}

interface Adjuster {
  name: string;
  type: string;
  value: number;
  description: string;
}

interface FeeItem {
  name: string;
  type: string;
  value: number;
  description: string;
}

interface LockPeriod {
  days: number;
  adjustment: number;
}

const defaults = {
  baseRates: [
    { product: "DSCR", rate: 7.5 },
    { product: "Fix & Flip - Light Rehab", rate: 9.25 },
    { product: "Fix & Flip - Heavy Rehab", rate: 9.5 },
    { product: "Bridge", rate: 9.25 },
    { product: "Ground Up Construction", rate: 10.0 },
  ] as BaseRate[],
  adjusters: [
    { name: "FICO < 700", type: "rate", value: 0.25, description: "Added when borrower FICO is below 700" },
    { name: "Cash-Out", type: "rate", value: 0.5, description: "Cash-out refinance adjustment" },
    { name: "Multifamily", type: "rate", value: 1.0, description: "5+ unit multifamily properties" },
    { name: "Midstream", type: "rate", value: 0.25, description: "Midstream loan adjustment" },
  ] as Adjuster[],
  feeSchedule: [
    { name: "Origination Fee", type: "percentage", value: 2.0, description: "Points charged at closing" },
    { name: "Underwriting Fee", type: "flat", value: 1500, description: "Flat underwriting fee" },
    { name: "Doc Preparation Fee", type: "flat", value: 750, description: "Document preparation fee" },
    { name: "Processing Fee", type: "flat", value: 500, description: "Loan processing fee" },
  ] as FeeItem[],
  brokerCompRules: "Standard broker compensation: 1-2 points on loan amount. Negotiable based on volume.",
  lockPeriods: [
    { days: 30, adjustment: 0.0 },
    { days: 45, adjustment: 0.125 },
    { days: 60, adjustment: 0.25 },
  ] as LockPeriod[],
  overrideEnabled: true,
  overrideApprovalRequired: true,
};

export default function PricingEngineConfig() {
  const { config, isLoading, hasChanges, updateField, save, isPending, isSuccess } =
    useTenantConfig("tenant_pricing_engine", defaults);
  const { toast } = useToast();

  useEffect(() => {
    if (isSuccess) {
      toast({ title: "Pricing engine saved", description: "Your pricing engine configuration has been updated." });
    }
  }, [isSuccess]);

  const updateBaseRate = (index: number, field: keyof BaseRate, value: any) => {
    const updated = [...config.baseRates];
    updated[index] = { ...updated[index], [field]: value };
    updateField("baseRates", updated);
  };

  const addBaseRate = () => {
    updateField("baseRates", [...config.baseRates, { product: "", rate: 0 }]);
  };

  const removeBaseRate = (index: number) => {
    updateField("baseRates", config.baseRates.filter((_: BaseRate, i: number) => i !== index));
  };

  const updateAdjuster = (index: number, field: keyof Adjuster, value: any) => {
    const updated = [...config.adjusters];
    updated[index] = { ...updated[index], [field]: value };
    updateField("adjusters", updated);
  };

  const addAdjuster = () => {
    updateField("adjusters", [...config.adjusters, { name: "", type: "rate", value: 0, description: "" }]);
  };

  const removeAdjuster = (index: number) => {
    updateField("adjusters", config.adjusters.filter((_: Adjuster, i: number) => i !== index));
  };

  const updateFee = (index: number, field: keyof FeeItem, value: any) => {
    const updated = [...config.feeSchedule];
    updated[index] = { ...updated[index], [field]: value };
    updateField("feeSchedule", updated);
  };

  const addFee = () => {
    updateField("feeSchedule", [...config.feeSchedule, { name: "", type: "flat", value: 0, description: "" }]);
  };

  const removeFee = (index: number) => {
    updateField("feeSchedule", config.feeSchedule.filter((_: FeeItem, i: number) => i !== index));
  };

  const updateLockPeriod = (index: number, field: keyof LockPeriod, value: any) => {
    const updated = [...config.lockPeriods];
    updated[index] = { ...updated[index], [field]: value };
    updateField("lockPeriods", updated);
  };

  const addLockPeriod = () => {
    updateField("lockPeriods", [...config.lockPeriods, { days: 0, adjustment: 0 }]);
  };

  const removeLockPeriod = (index: number) => {
    updateField("lockPeriods", config.lockPeriods.filter((_: LockPeriod, i: number) => i !== index));
  };

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
        <CardTitle data-testid="text-pricing-engine-title">Pricing Engine Configuration</CardTitle>
        <CardDescription data-testid="text-pricing-engine-description">
          Configure base rates, adjusters, fees, lock periods, and override settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Base Rates</h3>
          </div>
          <div className="space-y-2">
            {config.baseRates.map((rate: BaseRate, index: number) => (
              <div key={index} className="flex items-center gap-2 flex-wrap">
                <Input
                  data-testid={`input-base-rate-product-${index}`}
                  className="flex-1 min-w-[160px]"
                  value={rate.product}
                  onChange={(e) => updateBaseRate(index, "product", e.target.value)}
                  placeholder="Product name"
                />
                <Input
                  data-testid={`input-base-rate-value-${index}`}
                  className="w-28"
                  type="number"
                  step="0.125"
                  value={rate.rate}
                  onChange={(e) => updateBaseRate(index, "rate", parseFloat(e.target.value) || 0)}
                  placeholder="Rate %"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  data-testid={`button-remove-base-rate-${index}`}
                  onClick={() => removeBaseRate(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" data-testid="button-add-base-rate" onClick={addBaseRate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Rate
          </Button>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Rate Adjusters</h3>
          </div>
          <div className="space-y-3">
            {config.adjusters.map((adj: Adjuster, index: number) => (
              <div key={index} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    data-testid={`input-adjuster-name-${index}`}
                    className="flex-1 min-w-[140px]"
                    value={adj.name}
                    onChange={(e) => updateAdjuster(index, "name", e.target.value)}
                    placeholder="Adjuster name"
                  />
                  <Select
                    value={adj.type}
                    onValueChange={(val) => updateAdjuster(index, "type", val)}
                  >
                    <SelectTrigger className="w-28" data-testid={`select-adjuster-type-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rate">Rate</SelectItem>
                      <SelectItem value="points">Points</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    data-testid={`input-adjuster-value-${index}`}
                    className="w-24"
                    type="number"
                    step="0.125"
                    value={adj.value}
                    onChange={(e) => updateAdjuster(index, "value", parseFloat(e.target.value) || 0)}
                    placeholder="Value"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    data-testid={`button-remove-adjuster-${index}`}
                    onClick={() => removeAdjuster(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  data-testid={`input-adjuster-desc-${index}`}
                  value={adj.description}
                  onChange={(e) => updateAdjuster(index, "description", e.target.value)}
                  placeholder="Description"
                />
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" data-testid="button-add-adjuster" onClick={addAdjuster}>
            <Plus className="mr-2 h-4 w-4" />
            Add Adjuster
          </Button>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Fee Schedule</h3>
          </div>
          <div className="space-y-3">
            {config.feeSchedule.map((fee: FeeItem, index: number) => (
              <div key={index} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    data-testid={`input-fee-name-${index}`}
                    className="flex-1 min-w-[140px]"
                    value={fee.name}
                    onChange={(e) => updateFee(index, "name", e.target.value)}
                    placeholder="Fee name"
                  />
                  <Select
                    value={fee.type}
                    onValueChange={(val) => updateFee(index, "type", val)}
                  >
                    <SelectTrigger className="w-32" data-testid={`select-fee-type-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="flat">Flat</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    data-testid={`input-fee-value-${index}`}
                    className="w-28"
                    type="number"
                    step="0.01"
                    value={fee.value}
                    onChange={(e) => updateFee(index, "value", parseFloat(e.target.value) || 0)}
                    placeholder="Value"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    data-testid={`button-remove-fee-${index}`}
                    onClick={() => removeFee(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  data-testid={`input-fee-desc-${index}`}
                  value={fee.description}
                  onChange={(e) => updateFee(index, "description", e.target.value)}
                  placeholder="Description"
                />
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" data-testid="button-add-fee" onClick={addFee}>
            <Plus className="mr-2 h-4 w-4" />
            Add Fee
          </Button>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Handshake className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Broker Compensation</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brokerCompRules">Compensation Rules</Label>
            <Textarea
              id="brokerCompRules"
              data-testid="input-broker-comp-rules"
              value={config.brokerCompRules}
              onChange={(e) => updateField("brokerCompRules", e.target.value)}
              placeholder="Describe broker compensation rules..."
              rows={3}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Lock Periods</h3>
          </div>
          <div className="space-y-2">
            {config.lockPeriods.map((lp: LockPeriod, index: number) => (
              <div key={index} className="flex items-center gap-2 flex-wrap">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Days</Label>
                  <Input
                    data-testid={`input-lock-days-${index}`}
                    className="w-24"
                    type="number"
                    min={0}
                    value={lp.days}
                    onChange={(e) => updateLockPeriod(index, "days", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Adjustment %</Label>
                  <Input
                    data-testid={`input-lock-adjustment-${index}`}
                    className="w-28"
                    type="number"
                    step="0.125"
                    value={lp.adjustment}
                    onChange={(e) => updateLockPeriod(index, "adjustment", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground invisible">Remove</Label>
                  <Button
                    size="icon"
                    variant="ghost"
                    data-testid={`button-remove-lock-${index}`}
                    onClick={() => removeLockPeriod(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" data-testid="button-add-lock-period" onClick={addLockPeriod}>
            <Plus className="mr-2 h-4 w-4" />
            Add Lock Period
          </Button>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Override Settings</h3>
          </div>
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="overrideEnabled">Allow Rate Overrides</Label>
                <p className="text-sm text-muted-foreground">Permit manual rate overrides on individual deals</p>
              </div>
              <Switch
                id="overrideEnabled"
                data-testid="switch-override-enabled"
                checked={config.overrideEnabled}
                onCheckedChange={(checked) => updateField("overrideEnabled", checked)}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="overrideApprovalRequired">Require Approval for Overrides</Label>
                <p className="text-sm text-muted-foreground">Overrides must be approved by a manager</p>
              </div>
              <Switch
                id="overrideApprovalRequired"
                data-testid="switch-override-approval"
                checked={config.overrideApprovalRequired}
                onCheckedChange={(checked) => updateField("overrideApprovalRequired", checked)}
              />
            </div>
          </div>
        </section>

        <Button
          data-testid="button-save-pricing-engine"
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
