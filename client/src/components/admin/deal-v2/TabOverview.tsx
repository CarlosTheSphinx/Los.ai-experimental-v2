import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign, Percent, TrendingUp, Calculator, Activity,
  Pencil, Building2, User, Settings2, Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

function fmt(amount: number | string | undefined | null): string {
  if (amount === null || amount === undefined || amount === "" || amount === "—") return "—";
  const n = typeof amount === "string" ? parseFloat(amount.replace(/[^0-9.-]/g, "")) : amount;
  if (isNaN(n)) return "—";
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysBetween(start: string | Date | null | undefined): string {
  if (!start) return "—";
  const diff = Math.floor((Date.now() - new Date(start).getTime()) / 86400000);
  return `${diff} days`;
}

function Field({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  const labelEl = tooltip ? (
    <Tooltip>
      <TooltipTrigger className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-dashed border-muted-foreground/40 cursor-help">
        {label} <span className="text-muted-foreground/50">?</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  ) : (
    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
  );
  return (
    <div>
      {labelEl}
      <p className="text-[14px] font-bold mt-0.5">{value}</p>
    </div>
  );
}

function EditField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-[13px] mt-0.5"
        data-testid={`input-edit-${label.toLowerCase().replace(/\s+/g, "-")}`}
      />
    </div>
  );
}

function KpiCard({
  label, value, subtitle, tooltip, icon: Icon, valueColor,
}: {
  label: string; value: string; subtitle?: string; tooltip?: string; icon: any; valueColor?: string;
}) {
  const labelEl = tooltip ? (
    <Tooltip>
      <TooltipTrigger className="flex items-center gap-1 border-b border-dashed border-muted-foreground/40 cursor-help text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label} <span className="text-muted-foreground/60">?</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  ) : (
    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
  );
  return (
    <div className="bg-card border rounded-[10px] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {labelEl}
      </div>
      <div className={`text-2xl font-bold ${valueColor || ""}`}>{value}</div>
      {subtitle && <p className="text-[12px] text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

export default function TabOverview({
  deal,
  properties,
  dealId,
}: {
  deal: any;
  properties: any[];
  dealId: string;
}) {
  const { toast } = useToast();
  const apiBase = "/api/admin";

  const propertyValue = deal.propertyValue || deal.loanData?.propertyValue;
  const loanAmount = deal.loanAmount || deal.loanData?.loanAmount;
  const ltv = deal.ltv || deal.loanData?.ltv;
  const dscr = deal.dscr || deal.loanData?.dscr;
  const interestRate = deal.interestRate;
  const termMonths = deal.termMonths || deal.loanTermMonths || deal.loanData?.loanTerm;
  const purpose = deal.loanPurpose || deal.loanData?.loanPurpose || deal.loanType;
  const progress = deal.progressPercentage || deal.completionPercentage || 0;
  const totalDocs = deal.totalDocuments || 0;
  const completedDocs = deal.completedDocuments || 0;
  const totalTasks = deal.totalTasks || 0;
  const completedTasks = deal.completedTasks || 0;
  const totalItems = totalDocs + totalTasks;
  const completedItems = completedDocs + completedTasks;
  const ltvSubtitle = propertyValue ? `of ${fmt(propertyValue)}` : undefined;
  const dscrValue = dscr ? `${dscr}` : "—";
  const dscrSubtitle = dscr ? (parseFloat(dscr) >= 1.2 ? "Above threshold (1.20)" : "Below threshold (1.20)") : "Pending";
  const rateDisplay = interestRate && interestRate !== "—" ? (String(interestRate).includes("%") ? interestRate : `${interestRate}%`) : "—";
  const termLabel = termMonths
    ? (typeof termMonths === "string" && termMonths.includes("month")
        ? (parseInt(termMonths) >= 12 ? `${Math.round(parseInt(termMonths) / 12)}-year` : termMonths)
        : (Number(termMonths) >= 12 ? `${Math.round(Number(termMonths) / 12)}-year` : `${termMonths} months`))
    : "";
  const rateSubtitle = termLabel ? `${termLabel} fixed` : undefined;
  const purposeLabel = purpose ? purpose.charAt(0).toUpperCase() + purpose.slice(1).replace(/_/g, " ") : undefined;

  const primaryProp = properties.find((p: any) => p.isPrimary) || properties[0];

  const [editLoan, setEditLoan] = useState(false);
  const [loanForm, setLoanForm] = useState<Record<string, string>>({});

  const [editBorrower, setEditBorrower] = useState(false);
  const [borrowerForm, setBorrowerForm] = useState<Record<string, string>>({});

  const [editProperty, setEditProperty] = useState(false);
  const [propForm, setPropForm] = useState<Record<string, string>>({});

  const invalidateDeal = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/deals", dealId] });
  };

  const saveLoanMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest("PATCH", `${apiBase}/projects/${deal.projectId || deal.id}`, data);
    },
    onSuccess: () => {
      setEditLoan(false);
      invalidateDeal();
      toast({ title: "Loan details updated" });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const saveBorrowerMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest("PATCH", `${apiBase}/deals/${dealId}/people`, data);
    },
    onSuccess: () => {
      setEditBorrower(false);
      invalidateDeal();
      toast({ title: "Borrower details updated" });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const savePropertyMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      if (primaryProp?.id) {
        return apiRequest("PATCH", `${apiBase}/deals/${dealId}/properties/${primaryProp.id}`, data);
      }
      return apiRequest("POST", `${apiBase}/deals/${dealId}/properties`, { ...data, isPrimary: true });
    },
    onSuccess: () => {
      setEditProperty(false);
      invalidateDeal();
      toast({ title: "Property details updated" });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const saveControlMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest("PATCH", `${apiBase}/projects/${deal.projectId || deal.id}`, data);
    },
    onSuccess: () => {
      invalidateDeal();
      toast({ title: "Deal updated" });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const { data: programsData } = useQuery<any[]>({
    queryKey: ["/api/admin/programs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/programs", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      return d.programs || d || [];
    },
  });
  const programs = Array.isArray(programsData) ? programsData : [];

  const rateNum = interestRate && interestRate !== "—" ? String(interestRate).replace("%", "") : "";
  const termNum = termMonths ? (typeof termMonths === "string" ? termMonths.replace(/[^0-9]/g, "") : String(termMonths)) : "";
  const appData = deal.applicationData || {};

  const startEditLoan = () => {
    setLoanForm({
      loanAmount: String(loanAmount || ""),
      propertyValue: String(propertyValue || ""),
      ltv: String(ltv || ""),
      dscr: String(dscr || ""),
      interestRate: rateNum,
      loanTermMonths: termNum,
      originationPoints: String(appData.originationPoints || ""),
      ysp: String(appData.ysp || appData.yspAmount || ""),
      targetCloseDate: deal.targetCloseDate ? new Date(deal.targetCloseDate).toISOString().split("T")[0] : "",
    });
    setEditLoan(true);
  };

  const startEditBorrower = () => {
    const nameParts = (deal.borrowerName || deal.customerFirstName || "").split(" ");
    setBorrowerForm({
      fullName: deal.borrowerName || `${deal.customerFirstName || ""} ${deal.customerLastName || ""}`.trim(),
      email: deal.borrowerEmail || deal.customerEmail || "",
      phone: deal.borrowerPhone || deal.customerPhone || "",
      employer: appData.employer || appData.employerName || "",
      title: appData.title || appData.borrowerTitle || "",
      annualIncome: String(appData.annualIncome || ""),
      entityName: appData.entityName || "",
      entityType: appData.entityType || "",
    });
    setEditBorrower(true);
  };

  const startEditProperty = () => {
    setPropForm({
      address: primaryProp?.address || deal.propertyAddress || "",
      city: primaryProp?.city || "",
      state: primaryProp?.state || "",
      propertyType: primaryProp?.propertyType || deal.propertyType || "",
      units: String(primaryProp?.units || ""),
      monthlyRent: String(primaryProp?.monthlyRent || ""),
      annualTaxes: String(primaryProp?.annualTaxes || ""),
      annualInsurance: String(primaryProp?.annualInsurance || ""),
      estimatedValue: String(primaryProp?.estimatedValue || ""),
    });
    setEditProperty(true);
  };

  const noi = primaryProp
    ? ((primaryProp.monthlyRent || 0) * 12 - (primaryProp.annualTaxes || 0) - (primaryProp.annualInsurance || 0))
    : null;

  const stageOptions = [
    { value: "application", label: "Application" },
    { value: "intake", label: "Intake" },
    { value: "processing", label: "Processing" },
    { value: "underwriting", label: "Underwriting" },
    { value: "approval", label: "Approval" },
    { value: "closing", label: "Closing" },
    { value: "funded", label: "Funded" },
    { value: "documentation", label: "Documentation" },
  ];

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "on_hold", label: "On Hold" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "funded", label: "Funded" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard icon={DollarSign} label="Loan Amount" value={fmt(loanAmount)} subtitle={purposeLabel} />
        <KpiCard icon={Percent} label="LTV" value={ltv ? `${ltv}%` : "—"} subtitle={ltvSubtitle} tooltip="Loan-to-Value — the loan amount as a percentage of the property's appraised value." />
        <KpiCard icon={TrendingUp} label="DSCR" value={dscrValue} subtitle={dscrSubtitle} tooltip="Debt Service Coverage Ratio — net operating income divided by total debt service. Above 1.0 means the property generates enough income to cover the loan." />
        <KpiCard icon={Calculator} label="Interest Rate" value={rateDisplay} subtitle={rateSubtitle} />
        <KpiCard icon={Activity} label="Progress" value={`${progress}%`} subtitle={totalItems > 0 ? `${completedItems} of ${totalItems} items` : undefined} valueColor={progress >= 70 ? "text-green-600" : progress >= 40 ? "text-blue-600" : ""} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Loan Details */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[14px] flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Loan Details
            </CardTitle>
            {!editLoan ? (
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7" onClick={startEditLoan} data-testid="button-edit-loan">
                <Pencil className="h-3 w-3" /> Edit
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditLoan(false)} data-testid="button-cancel-loan">Cancel</Button>
                <Button size="sm" className="text-xs h-7" disabled={saveLoanMutation.isPending} data-testid="button-save-loan" onClick={() => {
                  saveLoanMutation.mutate({
                    loanAmount: loanForm.loanAmount ? Number(loanForm.loanAmount) : null,
                    interestRate: loanForm.interestRate ? Number(loanForm.interestRate) : null,
                    loanTermMonths: loanForm.loanTermMonths ? Number(loanForm.loanTermMonths) : null,
                    targetCloseDate: loanForm.targetCloseDate || null,
                  });
                }}>
                  {saveLoanMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!editLoan ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Loan Amount" value={fmt(loanAmount)} />
                <Field label="Property Value" value={fmt(propertyValue)} />
                <Field label="LTV" value={ltv ? `${ltv}%` : "—"} tooltip="Loan-to-Value ratio" />
                <Field label="DSCR" value={dscrValue} tooltip="Debt Service Coverage Ratio" />
                <Field label="Interest Rate" value={rateDisplay} />
                <Field label="Loan Term" value={termLabel || termMonths || "—"} />
                <Field label="Origination Points" value={appData.originationPoints ? String(appData.originationPoints) : "—"} />
                <Field label="YSP" value={appData.ysp || appData.yspAmount ? `${appData.ysp || appData.yspAmount}%` : "—"} tooltip="Yield Spread Premium" />
                <Field label="Target Close" value={fmtDate(deal.targetCloseDate)} />
                <Field label="Days in Stage" value={daysBetween(deal.createdAt)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <EditField label="Loan Amount" value={loanForm.loanAmount} onChange={(v) => setLoanForm({ ...loanForm, loanAmount: v })} type="number" />
                <Field label="Property Value" value={fmt(propertyValue)} />
                <Field label="LTV" value={ltv ? `${ltv}%` : "—"} tooltip="Loan-to-Value ratio" />
                <Field label="DSCR" value={dscrValue} tooltip="Debt Service Coverage Ratio" />
                <EditField label="Interest Rate %" value={loanForm.interestRate} onChange={(v) => setLoanForm({ ...loanForm, interestRate: v })} type="number" />
                <EditField label="Loan Term (months)" value={loanForm.loanTermMonths} onChange={(v) => setLoanForm({ ...loanForm, loanTermMonths: v })} type="number" />
                <Field label="Origination Points" value={appData.originationPoints ? String(appData.originationPoints) : "—"} />
                <Field label="YSP" value={appData.ysp || appData.yspAmount ? `${appData.ysp || appData.yspAmount}%` : "—"} tooltip="Yield Spread Premium" />
                <EditField label="Target Close" value={loanForm.targetCloseDate} onChange={(v) => setLoanForm({ ...loanForm, targetCloseDate: v })} type="date" />
                <Field label="Days in Stage" value={daysBetween(deal.createdAt)} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Details */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[14px] flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Property Details
            </CardTitle>
            <div className="flex gap-1">
              {!editProperty ? (
                <>
                  <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7" onClick={startEditProperty} data-testid="button-edit-property">
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7" data-testid="button-add-property">
                    <Plus className="h-3 w-3" /> Add Property
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditProperty(false)} data-testid="button-cancel-property">Cancel</Button>
                  <Button size="sm" className="text-xs h-7" disabled={savePropertyMutation.isPending} data-testid="button-save-property" onClick={() => {
                    savePropertyMutation.mutate({
                      address: propForm.address,
                      city: propForm.city,
                      state: propForm.state,
                      propertyType: propForm.propertyType,
                      units: propForm.units ? Number(propForm.units) : null,
                      monthlyRent: propForm.monthlyRent ? Number(propForm.monthlyRent) : null,
                      annualTaxes: propForm.annualTaxes ? Number(propForm.annualTaxes) : null,
                      annualInsurance: propForm.annualInsurance ? Number(propForm.annualInsurance) : null,
                      estimatedValue: propForm.estimatedValue ? Number(propForm.estimatedValue) : null,
                    });
                  }}>
                    {savePropertyMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!editProperty ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Address" value={primaryProp?.address || deal.propertyAddress || "—"} />
                <Field label="City / State" value={
                  primaryProp
                    ? [primaryProp.city, primaryProp.state].filter(Boolean).join(", ") || "—"
                    : "—"
                } />
                <Field label="Property Type" value={primaryProp?.propertyType || deal.propertyType || "—"} />
                <Field label="Units" value={primaryProp?.units ? String(primaryProp.units) : "—"} />
                <Field label="Monthly Rent" value={fmt(primaryProp?.monthlyRent)} />
                <Field label="Annual Taxes" value={fmt(primaryProp?.annualTaxes)} />
                <Field label="Annual Insurance" value={fmt(primaryProp?.annualInsurance)} />
                <Field label="NOI" value={noi !== null && noi !== 0 ? fmt(noi) : "—"} tooltip="Net Operating Income" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <EditField label="Address" value={propForm.address} onChange={(v) => setPropForm({ ...propForm, address: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <EditField label="City" value={propForm.city} onChange={(v) => setPropForm({ ...propForm, city: v })} />
                  <EditField label="State" value={propForm.state} onChange={(v) => setPropForm({ ...propForm, state: v })} />
                </div>
                <EditField label="Property Type" value={propForm.propertyType} onChange={(v) => setPropForm({ ...propForm, propertyType: v })} />
                <EditField label="Units" value={propForm.units} onChange={(v) => setPropForm({ ...propForm, units: v })} type="number" />
                <EditField label="Monthly Rent" value={propForm.monthlyRent} onChange={(v) => setPropForm({ ...propForm, monthlyRent: v })} type="number" />
                <EditField label="Annual Taxes" value={propForm.annualTaxes} onChange={(v) => setPropForm({ ...propForm, annualTaxes: v })} type="number" />
                <EditField label="Annual Insurance" value={propForm.annualInsurance} onChange={(v) => setPropForm({ ...propForm, annualInsurance: v })} type="number" />
                <EditField label="Estimated Value" value={propForm.estimatedValue} onChange={(v) => setPropForm({ ...propForm, estimatedValue: v })} type="number" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Borrower Details */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[14px] flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Borrower Details
            </CardTitle>
            {!editBorrower ? (
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7" onClick={startEditBorrower} data-testid="button-edit-borrower">
                <Pencil className="h-3 w-3" /> Edit
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditBorrower(false)} data-testid="button-cancel-borrower">Cancel</Button>
                <Button size="sm" className="text-xs h-7" disabled={saveBorrowerMutation.isPending} data-testid="button-save-borrower" onClick={() => {
                  saveBorrowerMutation.mutate({
                    borrowerName: borrowerForm.fullName,
                    borrowerEmail: borrowerForm.email,
                    borrowerPhone: borrowerForm.phone,
                  });
                }}>
                  {saveBorrowerMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!editBorrower ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Full Name" value={deal.borrowerName || `${deal.customerFirstName || ""} ${deal.customerLastName || ""}`.trim() || "—"} />
                <Field label="Email" value={deal.borrowerEmail || deal.customerEmail || "—"} />
                <Field label="Phone" value={deal.borrowerPhone || deal.customerPhone || "—"} />
                <Field label="Employer" value={appData.employer || appData.employerName || "—"} />
                <Field label="Title" value={appData.title || appData.borrowerTitle || "—"} />
                <Field label="Annual Income" value={appData.annualIncome ? fmt(appData.annualIncome) : "—"} />
                <Field label="Entity Name" value={appData.entityName || "—"} />
                <Field label="Entity Type" value={appData.entityType || "—"} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <EditField label="Full Name" value={borrowerForm.fullName} onChange={(v) => setBorrowerForm({ ...borrowerForm, fullName: v })} />
                <EditField label="Email" value={borrowerForm.email} onChange={(v) => setBorrowerForm({ ...borrowerForm, email: v })} type="email" />
                <EditField label="Phone" value={borrowerForm.phone} onChange={(v) => setBorrowerForm({ ...borrowerForm, phone: v })} type="tel" />
                <Field label="Employer" value={appData.employer || appData.employerName || "—"} />
                <Field label="Title" value={appData.title || appData.borrowerTitle || "—"} />
                <Field label="Annual Income" value={appData.annualIncome ? fmt(appData.annualIncome) : "—"} />
                <Field label="Entity Name" value={appData.entityName || "—"} />
                <Field label="Entity Type" value={appData.entityType || "—"} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deal Controls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              Deal Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Deal Status</span>
                <Select
                  value={deal.projectStatus || deal.status || "active"}
                  onValueChange={(v) => saveControlMutation.mutate({ status: v })}
                >
                  <SelectTrigger className="h-9 mt-1 text-[13px]" data-testid="select-deal-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Current Stage</span>
                <Select
                  value={deal.stage || deal.currentStage || "application"}
                  onValueChange={(v) => saveControlMutation.mutate({ currentStage: v })}
                >
                  <SelectTrigger className="h-9 mt-1 text-[13px]" data-testid="select-current-stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stageOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Loan Program</span>
                <Select
                  value={deal.programId ? String(deal.programId) : "none"}
                  onValueChange={(v) => saveControlMutation.mutate({ programId: v === "none" ? null : Number(v) })}
                >
                  <SelectTrigger className="h-9 mt-1 text-[13px]" data-testid="select-loan-program">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Program</SelectItem>
                    {programs.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Created</span>
                <p className="text-[14px] font-bold mt-2.5">{fmtDate(deal.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
