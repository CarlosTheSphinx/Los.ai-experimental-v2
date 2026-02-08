import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { LoanForm } from "@/components/LoanForm";
import { RTLLoanForm } from "@/components/RTLLoanForm";
import { usePricing } from "@/hooks/use-pricing";
import { type LoanPricingFormData, type PricingResponse, type RTLPricingFormData, type RTLPricingResponse } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calculator, CheckCircle2, AlertCircle, Loader2, RotateCcw, Save, MapPin } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

interface ProgramWithPricing {
  id: number;
  name: string;
  loanType: string;
  description: string | null;
  hasActiveRuleset: boolean;
  activeRulesetId?: number;
  activeRulesetVersion?: number;
}

export default function BorrowerQuote() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [loanProductType, setLoanProductType] = useState<"dscr" | "rtl">("dscr");
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);

  const [dscrResult, setDscrResult] = useState<PricingResponse | null>(null);
  const [dscrFormData, setDscrFormData] = useState<LoanPricingFormData | null>(null);

  const [rtlResult, setRtlResult] = useState<RTLPricingResponse | null>(null);
  const [rtlFormData, setRtlFormData] = useState<RTLPricingFormData | null>(null);

  const [propertyAddress, setPropertyAddress] = useState("");

  const { mutate: getPricing, isPending: dscrPending } = usePricing();

  const rtlPricingMutation = useMutation({
    mutationFn: async (data: RTLPricingFormData) => {
      const res = await apiRequest("POST", "/api/pricing/rtl", data);
      return res.json();
    },
    onSuccess: (data: RTLPricingResponse) => {
      setRtlResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to calculate RTL pricing", variant: "destructive" });
    },
  });

  const { data: programsData } = useQuery<{ programs: ProgramWithPricing[] }>({
    queryKey: ["/api/programs-with-pricing"],
  });

  const allActivePrograms = programsData?.programs || [];

  const handleDSCRSubmit = (data: LoanPricingFormData) => {
    setDscrFormData(data);
    getPricing(data, {
      onSuccess: (response) => {
        setDscrResult(response);
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    });
  };

  const handleRTLSubmit = (data: RTLPricingFormData) => {
    setRtlFormData(data);
    rtlPricingMutation.mutate(data);
  };

  const handleReset = () => {
    setDscrResult(null);
    setRtlResult(null);
  };

  const saveQuoteMutation = useMutation({
    mutationFn: async () => {
      let formattedRate = "N/A";
      let formData: LoanPricingFormData | RTLPricingFormData | null = null;
      let pointsCharged = 1;

      if (loanProductType === "dscr" && dscrResult) {
        const rate = dscrResult.interestRate;
        formattedRate = typeof rate === "string" ? rate : rate ? `${rate.toFixed(3)}%` : "N/A";
        formData = dscrFormData;
        pointsCharged = 1;
      } else if (loanProductType === "rtl" && rtlResult) {
        formattedRate = rtlResult.finalRate ? `${rtlResult.finalRate.toFixed(3)}%` : "N/A";
        formData = rtlFormData;
        pointsCharged = 2;
      }

      return apiRequest("POST", "/api/quotes", {
        customerFirstName: user?.firstName || "",
        customerLastName: user?.lastName || "",
        customerCompanyName: "",
        propertyAddress,
        loanData: formData,
        interestRate: formattedRate,
        pointsCharged,
        programId: selectedProgramId || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Quote Saved!", description: "Your quote has been saved successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setLocation("/borrower-quotes");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save quote",
        variant: "destructive",
      });
    },
  });

  const handleSaveQuote = () => {
    if (!propertyAddress.trim()) {
      toast({ title: "Missing Information", description: "Please enter a property address.", variant: "destructive" });
      return;
    }
    saveQuoteMutation.mutate();
  };

  const hasResult = (loanProductType === "dscr" && dscrResult) || (loanProductType === "rtl" && rtlResult);
  const isLoading = dscrPending || rtlPricingMutation.isPending;

  return (
    <div className="min-h-screen">
      <header className="bg-white/80 dark:bg-background/80 backdrop-blur-md border-b border-primary/10 sticky top-0 z-40">
        <div className="px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <Calculator className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-primary truncate" data-testid="text-page-title">
                Get a Quote
              </h1>
              <p className="text-xs md:text-sm text-slate-500 hidden sm:block">
                Get instant loan pricing
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6">
        {!hasResult && (
          <>
            <Card className="mb-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Loan Program</CardTitle>
                <CardDescription>Select the loan program to price</CardDescription>
              </CardHeader>
              <CardContent>
                {allActivePrograms.length > 0 ? (
                  <Select
                    value={selectedProgramId?.toString() || ""}
                    onValueChange={(v) => {
                      const prog = allActivePrograms.find((p) => p.id === parseInt(v));
                      if (prog) {
                        setSelectedProgramId(prog.id);
                        const derivedType = (prog.loanType === "dscr" ? "dscr" : "rtl") as "dscr" | "rtl";
                        setLoanProductType(derivedType);
                        setDscrResult(null);
                        setRtlResult(null);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full md:w-96" data-testid="select-loan-program">
                      <SelectValue placeholder="Select a loan program" />
                    </SelectTrigger>
                    <SelectContent>
                      {allActivePrograms.map((program) => (
                        <SelectItem key={program.id} value={program.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {program.loanType.toUpperCase()}
                            </Badge>
                            {program.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={loanProductType}
                    onValueChange={(v: "dscr" | "rtl") => {
                      setLoanProductType(v);
                      setSelectedProgramId(null);
                      setDscrResult(null);
                      setRtlResult(null);
                    }}
                  >
                    <SelectTrigger className="w-full md:w-80" data-testid="select-loan-product-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dscr">DSCR</SelectItem>
                      <SelectItem value="rtl">Fix and Flip/Ground Up Construction</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            <div className="max-w-4xl mx-auto">
              {loanProductType === "dscr" ? (
                <LoanForm onSubmit={handleDSCRSubmit} isLoading={dscrPending} defaultData={dscrFormData} />
              ) : (
                <RTLLoanForm onSubmit={handleRTLSubmit} isLoading={rtlPricingMutation.isPending} defaultData={rtlFormData} />
              )}
            </div>
          </>
        )}

        {hasResult && (
          <div className="max-w-2xl mx-auto space-y-6">
            {loanProductType === "dscr" && dscrResult && (
              <BorrowerDSCRResult
                result={dscrResult}
                formData={dscrFormData}
                onReset={handleReset}
              />
            )}

            {loanProductType === "rtl" && rtlResult && (
              <BorrowerRTLResult
                result={rtlResult}
                formData={rtlFormData}
                onReset={handleReset}
              />
            )}

            {((loanProductType === "dscr" && dscrResult?.success) ||
              (loanProductType === "rtl" && rtlResult?.eligible)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Save className="h-5 w-5" />
                    Save This Quote
                  </CardTitle>
                  <CardDescription>
                    Save this quote for your records. Your name will be auto-filled from your profile.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">First Name</Label>
                      <p className="font-medium" data-testid="text-borrower-first-name">
                        {user?.firstName || "—"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Last Name</Label>
                      <p className="font-medium" data-testid="text-borrower-last-name">
                        {user?.lastName || "—"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="property-address">Property Address</Label>
                    <AddressAutocomplete
                      value={propertyAddress}
                      onChange={setPropertyAddress}
                      placeholder="Enter the property address"
                      id="property-address"
                      data-testid="input-property-address"
                    />
                  </div>
                  <Button
                    onClick={handleSaveQuote}
                    disabled={saveQuoteMutation.isPending}
                    className="w-full"
                    data-testid="button-save-quote"
                  >
                    {saveQuoteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Quote
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BorrowerDSCRResult({
  result,
  formData,
  onReset,
}: {
  result: PricingResponse;
  formData: LoanPricingFormData | null;
  onReset: () => void;
}) {
  if (result.error || !result.success) {
    return (
      <Card className="border-red-100 bg-red-50/50">
        <CardHeader className="text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            <CardTitle>Pricing Error</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4" data-testid="text-pricing-error">
            {result.message || result.error || "An unknown error occurred."}
          </p>
        </CardContent>
        <div className="p-6 pt-0">
          <Button onClick={onReset} variant="outline" className="w-full" data-testid="button-try-again">
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  const rate = result.interestRate;
  const formattedRate = typeof rate === "string" ? rate : rate ? `${rate.toFixed(3)}%` : "N/A";
  const loanAmount = formData?.loanAmount || 0;
  const originationFee = (loanAmount * 1) / 100;

  return (
    <div className="space-y-4">
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-6 h-6" />
            <CardTitle>Your Qualified Rate</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-green-700 dark:text-green-400" data-testid="text-interest-rate">
              {formattedRate}
            </p>
            <p className="text-sm text-muted-foreground mt-2">Interest Rate</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Loan Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Loan Amount</p>
              <p className="font-medium" data-testid="text-loan-amount">
                ${Number(formData?.loanAmount || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Property Value</p>
              <p className="font-medium" data-testid="text-property-value">
                ${Number(formData?.propertyValue || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">LTV</p>
              <p className="font-medium" data-testid="text-ltv">{formData?.ltv || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">FICO</p>
              <p className="font-medium" data-testid="text-fico">{formData?.ficoScore || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Loan Type</p>
              <p className="font-medium" data-testid="text-loan-type">{formData?.loanType || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Property Type</p>
              <p className="font-medium" data-testid="text-property-type">{formData?.propertyType || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Total Estimated Fees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 py-2 border-b">
            <span className="text-muted-foreground">Origination Fee (1 point)</span>
            <span className="font-medium" data-testid="text-origination-fee">
              ${originationFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 py-2 font-semibold">
            <span>Total Estimated Fees</span>
            <span data-testid="text-total-fees">
              ${originationFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onReset} variant="outline" className="w-full" data-testid="button-new-quote">
        <RotateCcw className="h-4 w-4 mr-2" />
        Get Another Quote
      </Button>
    </div>
  );
}

function BorrowerRTLResult({
  result,
  formData,
  onReset,
}: {
  result: RTLPricingResponse;
  formData: RTLPricingFormData | null;
  onReset: () => void;
}) {
  if (!result.eligible) {
    return (
      <Card className="border-red-100 bg-red-50/50">
        <CardHeader className="text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            <CardTitle>Not Eligible</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {result.disqualifiers && result.disqualifiers.length > 0 && (
            <ul className="text-sm text-red-600 list-disc list-inside space-y-1" data-testid="text-disqualifiers">
              {result.disqualifiers.map((d, i) => (
                <li key={i}>{d.reason}</li>
              ))}
            </ul>
          )}
        </CardContent>
        <div className="p-6 pt-0">
          <Button onClick={onReset} variant="outline" className="w-full" data-testid="button-try-again">
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  const formattedRate = result.finalRate ? `${result.finalRate.toFixed(3)}%` : "N/A";
  const asIsValue = formData?.asIsValue || 0;
  const rehabBudget = formData?.rehabBudget || 0;
  const totalCost = asIsValue + rehabBudget;
  const maxLTC = result.caps?.maxLTC || 0;
  const maxLoanByLTC = (totalCost * maxLTC) / 100;
  const originationFee = (maxLoanByLTC * 2) / 100;

  return (
    <div className="space-y-4">
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-6 h-6" />
            <CardTitle>Your Qualified Rate</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-green-700 dark:text-green-400" data-testid="text-interest-rate">
              {formattedRate}
            </p>
            <p className="text-sm text-muted-foreground mt-2">Interest Rate</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Loan Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">As-Is Value</p>
              <p className="font-medium" data-testid="text-as-is-value">
                ${asIsValue.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rehab Budget</p>
              <p className="font-medium" data-testid="text-rehab-budget">
                ${rehabBudget.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max LTC</p>
              <p className="font-medium" data-testid="text-max-ltc">{maxLTC}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Loan</p>
              <p className="font-medium" data-testid="text-max-loan">
                ${maxLoanByLTC.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">FICO</p>
              <p className="font-medium" data-testid="text-fico">{formData?.fico || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Property Type</p>
              <p className="font-medium" data-testid="text-property-type">{formData?.propertyType || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Loan Type</p>
              <p className="font-medium" data-testid="text-loan-type">{formData?.loanType || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Purpose</p>
              <p className="font-medium" data-testid="text-purpose">{formData?.purpose || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Total Estimated Fees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 py-2 border-b">
            <span className="text-muted-foreground">Origination Fee (2 points)</span>
            <span className="font-medium" data-testid="text-origination-fee">
              ${originationFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 py-2 font-semibold">
            <span>Total Estimated Fees</span>
            <span data-testid="text-total-fees">
              ${originationFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onReset} variant="outline" className="w-full" data-testid="button-new-quote">
        <RotateCcw className="h-4 w-4 mr-2" />
        Get Another Quote
      </Button>
    </div>
  );
}
