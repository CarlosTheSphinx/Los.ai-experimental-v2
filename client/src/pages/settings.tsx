import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  User,
  Mail,
  Phone,
  Building2,
  Lock,
  Bell,
  Shield,
  Loader2,
  Check,
  Eye,
  EyeOff,
  MapPin,
  Briefcase,
  DollarSign,
  CreditCard,
  FileText,
  Calendar,
  AlertCircle,
  Star,
  ExternalLink,
} from "lucide-react";

const BILLING_TIERS = {
  starter: { name: "Starter", monthly: 99, annual: 79 },
  pro: { name: "Pro", monthly: 199, annual: 159 },
  team: { name: "Team", monthly: 399, annual: 319 },
} as const;

type BillingTier = keyof typeof BILLING_TIERS;

interface SubscriptionState {
  subscriptionStatus: string | null;
  subscriptionTier: string | null;
  billingPeriod: string | null;
  foundingBroker: boolean;
  foundingDiscountRate: number | null;
  trialEndsAt: string | null;
  convertedAt: string | null;
  pilotActivatedAt: string | null;
}

function BillingTab() {
  const { toast } = useToast();
  const [checkoutPeriod, setCheckoutPeriod] = useState<"monthly" | "annual">("monthly");

  const { data: subscription, isLoading } = useQuery<SubscriptionState>({
    queryKey: ["/api/billing/subscription"],
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/portal");
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast({ title: "Failed to open billing portal", variant: "destructive" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ tier, period }: { tier: string; period: string }) => {
      const res = await apiRequest("POST", "/api/billing/checkout", { tier, period });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Checkout failed");
      }
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const status = subscription?.subscriptionStatus;
  const tier = subscription?.subscriptionTier as BillingTier | null;
  const period = subscription?.billingPeriod;
  const isFoundingBroker = subscription?.foundingBroker ?? false;
  const trialEndsAt = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null;

  const tierData = tier && BILLING_TIERS[tier] ? BILLING_TIERS[tier] : null;
  const priceKey = period === "annual" ? "annual" : "monthly";
  const basePrice = tierData ? tierData[priceKey] : null;
  const effectivePrice = basePrice && isFoundingBroker ? Math.round(basePrice * 0.8) : basePrice;

  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000))
    : null;

  const statusBadge = () => {
    if (status === "trialing") return <Badge variant="secondary">Trial</Badge>;
    if (status === "active") return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
    if (status === "past_due") return <Badge variant="destructive">Past Due</Badge>;
    if (status === "canceled") return <Badge variant="outline">Canceled</Badge>;
    return <Badge variant="outline">Free Trial</Badge>;
  };

  return (
    <div className="space-y-4">
      {status === "past_due" && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-4 pb-4 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Payment failed — update your payment method to keep your account active.</p>
              <Button
                size="sm"
                variant="destructive"
                className="mt-2"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
              >
                {portalMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Update Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Current Plan</CardTitle>
            {statusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "trialing" && daysLeft !== null && (
            <div className="p-3 bg-muted rounded-md text-sm">
              <p className="font-medium">{daysLeft} days remaining in your free trial</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You'll be invited to subscribe when your pilot reaches Day 75.
              </p>
            </div>
          )}

          {tierData ? (
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold">{tierData.name}</p>
                {isFoundingBroker && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Star className="h-3 w-3" />
                    Founding Broker
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {period === "annual" ? "Annual" : "Monthly"} billing
                {effectivePrice !== null && (
                  <>
                    {" · "}
                    <span className="font-medium text-foreground">${effectivePrice}/mo</span>
                    {isFoundingBroker && basePrice !== null && basePrice !== effectivePrice && (
                      <span className="ml-1 line-through text-muted-foreground">${basePrice}/mo</span>
                    )}
                  </>
                )}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {status === "canceled"
                ? "Your subscription has been canceled. Resubscribe to regain access."
                : "You're on a free trial."}
            </p>
          )}

          <Button
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
            variant={status === "canceled" ? "default" : "outline"}
            size="sm"
          >
            {portalMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            {status === "canceled" ? "Resubscribe" : "Manage Billing"}
          </Button>
          <p className="text-xs text-muted-foreground">Manage payment methods and invoices in the Stripe billing portal.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">Plans</CardTitle>
              <CardDescription className="mt-0.5">
                All plans include AI deal intake, broker inbox, and deal pipeline.
                {status !== "trialing" && " Upgrade or downgrade anytime via the billing portal."}
              </CardDescription>
            </div>
            {status === "trialing" && (
              <div className="flex items-center rounded-md border p-0.5 bg-muted text-sm">
                <button
                  className={`px-3 py-1 rounded-sm transition-colors ${checkoutPeriod === "monthly" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
                  onClick={() => setCheckoutPeriod("monthly")}
                >
                  Monthly
                </button>
                <button
                  className={`px-3 py-1 rounded-sm transition-colors ${checkoutPeriod === "annual" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
                  onClick={() => setCheckoutPeriod("annual")}
                >
                  Annual <span className="text-xs text-green-600 font-medium">−20%</span>
                </button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.entries(BILLING_TIERS) as [BillingTier, { name: string; monthly: number; annual: number }][]).map(
              ([key, t]) => {
                const effMonthly = isFoundingBroker ? Math.round(t.monthly * 0.8) : t.monthly;
                const effAnnual = isFoundingBroker ? Math.round(t.annual * 0.8) : t.annual;
                const displayPrice = checkoutPeriod === "annual" ? effAnnual : effMonthly;
                const isCurrent = tier === key;
                const isCheckingOut = checkoutMutation.isPending && (checkoutMutation.variables as any)?.tier === key;
                return (
                  <div
                    key={key}
                    className={`p-3 rounded-lg border ${isCurrent ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-lg font-bold mt-1">
                      ${displayPrice}
                      <span className="text-xs font-normal text-muted-foreground">/mo</span>
                    </p>
                    {checkoutPeriod === "annual" ? (
                      <p className="text-xs text-muted-foreground">billed annually</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">or ${effAnnual}/mo billed annually</p>
                    )}
                    {isCurrent ? (
                      <Badge className="mt-2 text-xs" variant="secondary">
                        Current plan
                      </Badge>
                    ) : status === "trialing" ? (
                      <Button
                        size="sm"
                        className="mt-2 w-full text-xs h-7"
                        onClick={() => checkoutMutation.mutate({ tier: key, period: checkoutPeriod })}
                        disabled={checkoutMutation.isPending}
                        data-testid={`button-subscribe-${key}`}
                      >
                        {isCheckingOut && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        Subscribe
                      </Button>
                    ) : null}
                  </div>
                );
              }
            )}
          </div>
          {isFoundingBroker && (
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <Star className="h-3 w-3" />
              Founding Broker 20% discount applied — locked in permanently.
            </p>
          )}
          {status !== "trialing" && (
            <p className="text-xs text-muted-foreground">Annual billing saves 20%. To change plans, use the billing portal above.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BorrowerProfileTab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ["/api/borrower/profile"],
    enabled: user?.role === "borrower",
  });

  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        phone: profile.phone || "",
        dateOfBirth: profile.dateOfBirth || "",
        streetAddress: profile.streetAddress || "",
        city: profile.city || "",
        state: profile.state || "",
        zipCode: profile.zipCode || "",
        ssnLast4: profile.ssnLast4 || "",
        idType: profile.idType || "",
        idNumber: profile.idNumber || "",
        idExpirationDate: profile.idExpirationDate || "",
        employerName: profile.employerName || "",
        employmentTitle: profile.employmentTitle || "",
        annualIncome: profile.annualIncome || "",
        employmentType: profile.employmentType || "",
        entityName: profile.entityName || "",
        entityType: profile.entityType || "",
        einNumber: profile.einNumber || "",
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data };
      const stringFields = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'streetAddress', 'city', 'state', 'zipCode', 'ssnLast4', 'idType', 'idNumber', 'idExpirationDate', 'employerName', 'employmentTitle', 'employmentType', 'entityName', 'entityType', 'einNumber'];
      for (const key of stringFields) {
        if (payload[key] === '') payload[key] = null;
      }
      if (payload.annualIncome !== '' && payload.annualIncome != null) {
        const parsed = parseFloat(payload.annualIncome);
        payload.annualIncome = Number.isNaN(parsed) ? null : parsed;
      } else {
        payload.annualIncome = null;
      }
      return await apiRequest("PUT", "/api/borrower/profile", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/borrower/profile"] });
      toast({ title: "Profile saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save profile", variant: "destructive" });
    },
  });

  const updateField = (key: string, value: string) => {
    setForm((prev: Record<string, any>) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-xl font-semibold shrink-0">
              {(form.firstName || user?.email || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-lg">{form.firstName} {form.lastName}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
              <Badge variant="outline" className="text-xs mt-1 capitalize">Borrower</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Information
          </CardTitle>
          <CardDescription>This information will carry over to all your future loans</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">First Name</Label>
              <Input value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} data-testid="input-bp-firstname" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Last Name</Label>
              <Input value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} data-testid="input-bp-lastname" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> Phone
              </Label>
              <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="(555) 123-4567" data-testid="input-bp-phone" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Date of Birth
              </Label>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} data-testid="input-bp-dob" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Home Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Street Address</Label>
            <Input value={form.streetAddress} onChange={(e) => updateField("streetAddress", e.target.value)} placeholder="123 Main St, Apt 4B" data-testid="input-bp-street" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">City</Label>
              <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} data-testid="input-bp-city" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">State</Label>
              <Input value={form.state} onChange={(e) => updateField("state", e.target.value)} placeholder="FL" data-testid="input-bp-state" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Zip Code</Label>
              <Input value={form.zipCode} onChange={(e) => updateField("zipCode", e.target.value)} placeholder="33131" data-testid="input-bp-zip" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Identification
          </CardTitle>
          <CardDescription>Securely stored — used to verify your identity on loan applications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">SSN (last 4 digits)</Label>
              <Input value={form.ssnLast4} onChange={(e) => updateField("ssnLast4", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" maxLength={4} data-testid="input-bp-ssn4" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ID Type</Label>
              <Select value={form.idType || "none"} onValueChange={(v) => updateField("idType", v === "none" ? "" : v)}>
                <SelectTrigger data-testid="select-bp-idtype">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select type</SelectItem>
                  <SelectItem value="drivers_license">Driver's License</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="state_id">State ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ID Number</Label>
              <Input value={form.idNumber} onChange={(e) => updateField("idNumber", e.target.value)} data-testid="input-bp-idnumber" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ID Expiration Date</Label>
              <Input type="date" value={form.idExpirationDate} onChange={(e) => updateField("idExpirationDate", e.target.value)} data-testid="input-bp-idexpiry" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Employment & Income
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Employment Type</Label>
              <Select value={form.employmentType || "none"} onValueChange={(v) => updateField("employmentType", v === "none" ? "" : v)}>
                <SelectTrigger data-testid="select-bp-emptype">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select type</SelectItem>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="self_employed">Self-Employed</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Employer Name</Label>
              <Input value={form.employerName} onChange={(e) => updateField("employerName", e.target.value)} data-testid="input-bp-employer" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Title / Position</Label>
              <Input value={form.employmentTitle} onChange={(e) => updateField("employmentTitle", e.target.value)} data-testid="input-bp-title" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3 w-3" /> Annual Income
              </Label>
              <Input type="number" value={form.annualIncome} onChange={(e) => updateField("annualIncome", e.target.value)} placeholder="0.00" data-testid="input-bp-income" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Entity Information
          </CardTitle>
          <CardDescription>If you invest through an LLC, corporation, or trust</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Entity Name</Label>
              <Input value={form.entityName} onChange={(e) => updateField("entityName", e.target.value)} placeholder="ABC Holdings LLC" data-testid="input-bp-entityname" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Entity Type</Label>
              <Select value={form.entityType || "none"} onValueChange={(v) => updateField("entityType", v === "none" ? "" : v)}>
                <SelectTrigger data-testid="select-bp-entitytype">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select type</SelectItem>
                  <SelectItem value="llc">LLC</SelectItem>
                  <SelectItem value="corp">Corporation</SelectItem>
                  <SelectItem value="trust">Trust</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">EIN Number</Label>
              <Input value={form.einNumber} onChange={(e) => updateField("einNumber", e.target.value)} placeholder="XX-XXXXXXX" data-testid="input-bp-ein" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-4">
        <Button
          onClick={() => updateMutation.mutate(form)}
          disabled={updateMutation.isPending}
          size="lg"
          data-testid="button-save-borrower-profile"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Save Profile
        </Button>
      </div>
    </div>
  );
}

function BrokerProfileTab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: (user as any)?.phone || "",
    companyName: (user as any)?.companyName || "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      return await apiRequest("PATCH", "/api/auth/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile updated" });
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Personal Information</CardTitle>
        <CardDescription>Update your personal details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-xl font-semibold shrink-0">
            {(user?.fullName || user?.email || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-lg">{user?.fullName || "—"}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs capitalize">{user?.role || "broker"}</Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <User className="h-3 w-3" /> Full Name
            </Label>
            <Input
              value={profileForm.fullName}
              onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
              data-testid="input-settings-fullname"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3 w-3" /> Email
            </Label>
            <Input
              value={profileForm.email}
              disabled
              className="bg-muted"
              data-testid="input-settings-email"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3 w-3" /> Phone
            </Label>
            <Input
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              placeholder="(555) 123-4567"
              data-testid="input-settings-phone"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3 w-3" /> Company
            </Label>
            <Input
              value={profileForm.companyName}
              onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
              placeholder="Company name"
              data-testid="input-settings-company"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            onClick={() => updateProfileMutation.mutate(profileForm)}
            disabled={updateProfileMutation.isPending}
            data-testid="button-save-profile"
          >
            {updateProfileMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const initialTab = new URLSearchParams(window.location.search).get("tab") ?? "profile";
  const [activeTab, setActiveTab] = useState(initialTab);
  const isBorrower = user?.role === "borrower";

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return await apiRequest("POST", "/api/auth/change-password", data);
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password changed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to change password", variant: "destructive" });
    },
  });

  const handlePasswordChange = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isBorrower ? "Manage your profile — this information carries over to all your loans" : "Manage your account and preferences"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-settings">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="h-3.5 w-3.5 mr-1.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Lock className="h-3.5 w-3.5 mr-1.5" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            Notifications
          </TabsTrigger>
          {user?.role === "broker" && (
            <TabsTrigger value="billing" data-testid="tab-billing">
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Billing
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          {isBorrower ? <BorrowerProfileTab /> : <BrokerProfileTab />}
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Current Password</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPw ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    data-testid="input-current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                  >
                    {showCurrentPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">New Password</Label>
                <div className="relative">
                  <Input
                    type={showNewPw ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    data-testid="input-new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowNewPw(!showNewPw)}
                  >
                    {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  data-testid="input-confirm-password"
                />
              </div>
              <div className="pt-2">
                <Button
                  onClick={handlePasswordChange}
                  disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword}
                  data-testid="button-change-password"
                >
                  {changePasswordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role === "broker" && (
          <TabsContent value="billing" className="mt-4 space-y-4">
            <BillingTab />
          </TabsContent>
        )}

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
              <CardDescription>Choose how you'd like to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive updates about your loans and quotes via email</p>
                </div>
                <Switch defaultChecked data-testid="switch-email-notifications" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">New Message Alerts</p>
                  <p className="text-xs text-muted-foreground">Get notified when you receive new messages</p>
                </div>
                <Switch defaultChecked data-testid="switch-message-notifications" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Deal Status Updates</p>
                  <p className="text-xs text-muted-foreground">Get notified when your deals change status</p>
                </div>
                <Switch defaultChecked data-testid="switch-deal-notifications" />
              </div>
              {!isBorrower && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Commission Alerts</p>
                    <p className="text-xs text-muted-foreground">Get notified about commission payments and updates</p>
                  </div>
                  <Switch defaultChecked data-testid="switch-commission-notifications" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
