import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  DollarSign,
  Home,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  User,
  Mail,
  Phone,
  FileText,
} from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

interface QuoteFormField {
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  visible: boolean;
  isDefault?: boolean;
  options?: string[];
  conditionalOn?: string;
  conditionalValue?: string;
}

interface PublicProgram {
  id: number;
  name: string;
  description: string | null;
  loanType: string;
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  eligiblePropertyTypes: string[] | null;
  quoteFormFields: QuoteFormField[] | null;
}

function formatCurrency(amount: number | null) {
  if (!amount) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function loanTypeLabel(type: string) {
  const labels: Record<string, string> = {
    dscr: "DSCR",
    rtl: "Fix & Flip / Bridge",
    ground_up: "Ground Up Construction",
    commercial: "Commercial",
  };
  return labels[type] || type.toUpperCase();
}

function loanTypeIcon(type: string) {
  if (type === "rtl" || type === "ground_up") return <Home className="h-5 w-5" />;
  if (type === "commercial") return <Building2 className="h-5 w-5" />;
  return <DollarSign className="h-5 w-5" />;
}

export default function PublicApplyPage() {
  const { toast } = useToast();
  const [selectedProgram, setSelectedProgram] = useState<PublicProgram | null>(null);
  const [step, setStep] = useState<"select" | "form" | "success">("select");
  const [dealIdentifier, setDealIdentifier] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  const { data: brandingData } = useQuery<{ companyName: string; logoUrl?: string }>({
    queryKey: ["/api/settings/branding"],
  });

  const { data: programsData, isLoading: programsLoading } = useQuery<{ programs: PublicProgram[] }>({
    queryKey: ["/api/public/programs"],
    queryFn: async () => {
      const res = await fetch("/api/public/programs");
      if (!res.ok) throw new Error("Failed to fetch programs");
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/public/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setDealIdentifier(data.dealIdentifier || "");
      setStep("success");
    },
    onError: (err: Error) => {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    },
  });

  const programs = programsData?.programs || [];
  const companyName = brandingData?.companyName || "Lendry.AI";

  const quoteFields = (selectedProgram?.quoteFormFields || []).filter(
    (f: QuoteFormField) => f.visible && !f.isDefault
  );

  const visibleQuoteFields = quoteFields.filter((f: QuoteFormField) => {
    if (!f.conditionalOn) return true;
    return customFields[f.conditionalOn] === f.conditionalValue;
  });

  const handleSelectProgram = (program: PublicProgram) => {
    setSelectedProgram(program);
    setCustomFields({});
    setStep("form");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram) return;

    if (!firstName || !lastName || !email || !propertyAddress) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    submitMutation.mutate({
      programId: selectedProgram.id,
      firstName,
      lastName,
      email,
      phone,
      propertyAddress,
      formData: customFields,
    });
  };

  const renderFormField = (field: QuoteFormField) => {
    const value = customFields[field.fieldKey] || "";
    const onChange = (val: string) => setCustomFields({ ...customFields, [field.fieldKey]: val });

    switch (field.fieldType) {
      case "select":
        return (
          <div key={field.fieldKey} className="space-y-1.5" data-testid={`field-${field.fieldKey}`}>
            <Label className="text-sm">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger data-testid={`select-${field.fieldKey}`}>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case "yes-no":
        return (
          <div key={field.fieldKey} className="space-y-1.5" data-testid={`field-${field.fieldKey}`}>
            <Label className="text-sm">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger data-testid={`select-${field.fieldKey}`}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case "currency":
        return (
          <div key={field.fieldKey} className="space-y-1.5" data-testid={`field-${field.fieldKey}`}>
            <Label className="text-sm">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-8"
                placeholder="0"
                required={field.required}
                data-testid={`input-${field.fieldKey}`}
              />
            </div>
          </div>
        );
      case "percentage":
        return (
          <div key={field.fieldKey} className="space-y-1.5" data-testid={`field-${field.fieldKey}`}>
            <Label className="text-sm">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pr-8"
                placeholder="0"
                required={field.required}
                data-testid={`input-${field.fieldKey}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>
        );
      default:
        return (
          <div key={field.fieldKey} className="space-y-1.5" data-testid={`field-${field.fieldKey}`}>
            <Label className="text-sm">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <Input
              type={field.fieldType === "number" ? "number" : field.fieldType === "email" ? "email" : field.fieldType === "phone" ? "tel" : "text"}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              required={field.required}
              data-testid={`input-${field.fieldKey}`}
            />
          </div>
        );
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Application Submitted!</h2>
            <p className="text-muted-foreground">
              Your loan application{dealIdentifier ? ` (${dealIdentifier})` : ""} has been received. Our team will review it and reach out to you shortly.
            </p>
            <p className="text-sm text-muted-foreground">
              A confirmation will be sent to <strong>{email}</strong>.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setStep("select");
                setSelectedProgram(null);
                setFirstName("");
                setLastName("");
                setEmail("");
                setPhone("");
                setPropertyAddress("");
                setCustomFields({});
              }}
              data-testid="button-submit-another"
            >
              Submit Another Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary" data-testid="text-company-name">{companyName}</h1>
          {step === "form" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStep("select"); setSelectedProgram(null); }}
              data-testid="button-back-to-programs"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              All Programs
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {step === "select" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold" data-testid="text-apply-heading">Get Started</h2>
              <p className="text-muted-foreground text-lg">Choose a loan program to begin your application</p>
            </div>

            {programsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : programs.length === 0 ? (
              <Card className="max-w-md mx-auto text-center">
                <CardContent className="py-12">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No loan programs are currently available.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.map((program) => (
                  <Card
                    key={program.id}
                    className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5"
                    onClick={() => handleSelectProgram(program)}
                    data-testid={`card-program-${program.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          {loanTypeIcon(program.loanType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{program.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {loanTypeLabel(program.loanType)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      {program.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{program.description}</p>
                      )}
                      {(program.minLoanAmount || program.maxLoanAmount) && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <DollarSign className="h-3.5 w-3.5" />
                          {formatCurrency(program.minLoanAmount)} – {formatCurrency(program.maxLoanAmount)}
                        </div>
                      )}
                      {program.eligiblePropertyTypes && program.eligiblePropertyTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {program.eligiblePropertyTypes.slice(0, 3).map((pt) => (
                            <Badge key={pt} variant="outline" className="text-[10px]">
                              {pt.replace(/-/g, " ")}
                            </Badge>
                          ))}
                          {program.eligiblePropertyTypes.length > 3 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{program.eligiblePropertyTypes.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                      <Button className="w-full mt-2" size="sm" data-testid={`button-apply-program-${program.id}`}>
                        Apply Now <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "form" && selectedProgram && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-1">
              <Badge variant="secondary">{loanTypeLabel(selectedProgram.loanType)}</Badge>
              <h2 className="text-2xl font-bold" data-testid="text-program-name">{selectedProgram.name}</h2>
              {selectedProgram.description && (
                <p className="text-muted-foreground">{selectedProgram.description}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact Information
                  </CardTitle>
                  <CardDescription>Tell us about yourself</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">First Name <span className="text-red-500">*</span></Label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        required
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Last Name <span className="text-red-500">*</span></Label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        required
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Phone
                    </Label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      data-testid="input-phone"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Property Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Property Address <span className="text-red-500">*</span></Label>
                    <AddressAutocomplete
                      value={propertyAddress}
                      onChange={setPropertyAddress}
                      placeholder="Enter property address"
                      data-testid="input-property-address"
                    />
                  </div>
                </CardContent>
              </Card>

              {visibleQuoteFields.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Loan Details
                    </CardTitle>
                    <CardDescription>Program-specific information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {visibleQuoteFields.map(renderFormField)}
                  </CardContent>
                </Card>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={submitMutation.isPending}
                data-testid="button-submit-application"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Application
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </main>

      <footer className="border-t mt-16 py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
      </footer>
    </div>
  );
}
