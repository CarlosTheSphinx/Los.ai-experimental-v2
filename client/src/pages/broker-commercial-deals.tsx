import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Building2, DollarSign, MapPin, Clock, Eye, Send, ArrowLeft,
  FileText, Upload, CheckCircle2, AlertTriangle, TrendingUp, RefreshCw,
  ArrowRight, Save, Download, Pencil, X,
} from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

const ASSET_TYPES = ["Multifamily","Office","Retail","Industrial","Hotel","Land","Development","Mixed Use","Self Storage","Mobile Home Park","Healthcare","Student Housing"];
const ENTITY_TYPES = ["Individual","LLC","Corporation","Partnership","Trust"];
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

function statusBadge(status: string) {
  const config: Record<string, { color: string; label: string }> = {
    draft: { color: "bg-slate-500/20 text-slate-400 border-slate-500/30", label: "Draft" },
    submitted: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Submitted" },
    analyzed: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: "Under Review" },
    under_review: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Under Review" },
    approved: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "Approved" },
    conditional: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Conditional" },
    rejected: { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "Rejected" },
    transferred: { color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", label: "In Progress" },
    no_match: { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "No Match" },
  };
  const c = config[status] || { color: "bg-slate-500/20 text-slate-400", label: status };
  return <Badge className={`text-xs ${c.color}`}>{c.label}</Badge>;
}

function DealsList() {
  const [, navigate] = useLocation();

  const { data: deals = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/commercial/deals"],
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6" data-testid="broker-commercial-deals">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white" data-testid="page-title">Commercial Deals</h1>
          <p className="text-sm text-slate-400 mt-1">Submit and track your commercial real estate deals</p>
        </div>
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          onClick={() => navigate("/commercial-deals/new")}
          data-testid="new-deal-button"
        >
          <Plus size={14} className="mr-1" /> Submit New Deal
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><RefreshCw size={20} className="animate-spin text-slate-400" /></div>
      ) : deals.length === 0 ? (
        <Card className="bg-[#1a2038] border-slate-700/50">
          <CardContent className="p-12 text-center">
            <Building2 size={40} className="mx-auto text-slate-500 mb-3" />
            <p className="text-slate-400 mb-4">No deals yet. Submit your first commercial deal.</p>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate("/commercial-deals/new")} data-testid="empty-new-deal">
              <Plus size={14} className="mr-1" /> Submit New Deal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {deals.map((deal: any) => (
            <Card
              key={deal.id}
              className="bg-[#1a2038] border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer"
              onClick={() => navigate(deal.status === "draft" ? `/commercial-deals/${deal.id}/edit` : `/commercial-deals/${deal.id}`)}
              data-testid={`deal-card-${deal.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-white">{deal.dealName || `Deal #${deal.id}`}</h3>
                      {statusBadge(deal.status)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                      {deal.loanAmount && <span className="flex items-center gap-1"><DollarSign size={12} />${(deal.loanAmount / 1000000).toFixed(1)}M</span>}
                      {deal.assetType && <span className="flex items-center gap-1"><Building2 size={12} />{deal.assetType}</span>}
                      {deal.propertyState && <span className="flex items-center gap-1"><MapPin size={12} />{deal.propertyState}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {deal.status === "draft" ? "Last saved" : "Submitted"}: {new Date(deal.submittedAt || deal.updatedAt || deal.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-slate-400" data-testid={`view-deal-${deal.id}`}>
                    <Eye size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface FormFieldConfig {
  id: number;
  fieldKey: string;
  fieldLabel: string;
  section: string;
  fieldType: string;
  isVisible: boolean;
  isRequired: boolean;
  sortOrder: number;
  options: any;
}

function DynamicField({ field, value, onChange, onAddressSelect }: { field: FormFieldConfig; value: any; onChange: (v: any) => void; onAddressSelect?: (data: { formatted: string; city?: string; state?: string; zip?: string }) => void }) {
  const label = `${field.fieldLabel}${field.isRequired ? " *" : ""}`;
  const inputClass = "bg-[#0f1629] border-slate-700 text-white text-sm";

  if (field.fieldType === "select" && field.options?.choices) {
    return (
      <div>
        <Label className="text-xs text-slate-400">{label}</Label>
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger className={inputClass} data-testid={field.fieldKey}>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {field.options.choices.map((c: string) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.fieldType === "radio" && field.options?.choices) {
    return (
      <div>
        <Label className="text-xs text-slate-400 mb-2 block">{label}</Label>
        <RadioGroup value={value ? "yes" : "no"} onValueChange={v => onChange(v === "yes")} className="flex gap-4">
          {field.options.choices.map((c: string) => (
            <div key={c} className="flex items-center gap-1.5">
              <RadioGroupItem value={c.toLowerCase()} id={`${field.fieldKey}-${c}`} />
              <Label htmlFor={`${field.fieldKey}-${c}`} className="text-xs text-slate-400">{c}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    );
  }

  if (field.fieldKey === "propertyAddress") {
    return (
      <div>
        <Label className="text-xs text-slate-400">{label}</Label>
        <AddressAutocomplete
          value={value || ""}
          onChange={(v) => {
            onChange(v);
            onAddressSelect?.({ formatted: v, city: "", state: "", zip: "" });
          }}
          onSelectStructured={(data) => {
            onChange(data.formatted);
            onAddressSelect?.({
              formatted: data.formatted,
              city: data.city || "",
              state: data.state || "",
              zip: data.zip || "",
            });
          }}
          placeholder="Start typing an address..."
          className={inputClass}
          data-testid="propertyAddress"
        />
      </div>
    );
  }

  return (
    <div>
      <Label className="text-xs text-slate-400">{label}</Label>
      <Input
        type={field.fieldType === "number" ? "number" : "text"}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className={inputClass}
        data-testid={field.fieldKey}
      />
    </div>
  );
}

function DealForm({ editDealId }: { editDealId?: number } = {}) {
  const [, navigate] = useLocation();
  const location = useLocation()[0];
  const { toast } = useToast();

  const urlEditId = editDealId || (() => {
    const match = location.match(/\/commercial-deals\/(\d+)\/edit/);
    return match ? parseInt(match[1]) : undefined;
  })();
  const isEditing = !!urlEditId;

  const { data: existingDeal, isLoading: loadingDeal } = useQuery<any>({
    queryKey: ["/api/commercial/deals", urlEditId],
    queryFn: async () => {
      const res = await fetch(`/api/commercial/deals/${urlEditId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load deal");
      return res.json();
    },
    enabled: isEditing,
  });

  const emptyForm: Record<string, any> = {
    dealName: "",
    loanAmount: "",
    assetType: "",
    propertyAddress: "",
    propertyCity: "",
    propertyState: "",
    propertyZip: "",
    propertyValue: "",
    noiAnnual: "",
    occupancyPct: "",
    borrowerName: "",
    borrowerEntityType: "",
    borrowerCreditScore: "",
    hasGuarantor: false,
  };

  const [form, setForm] = useState<Record<string, any>>(emptyForm);
  const [formLoaded, setFormLoaded] = useState(false);

  if (isEditing && existingDeal && !formLoaded) {
    setForm({
      dealName: existingDeal.dealName || "",
      loanAmount: existingDeal.loanAmount?.toString() || "",
      assetType: existingDeal.assetType || "",
      propertyAddress: existingDeal.propertyAddress || "",
      propertyCity: existingDeal.propertyCity || "",
      propertyState: existingDeal.propertyState || "",
      propertyZip: existingDeal.propertyZip || "",
      propertyValue: existingDeal.propertyValue?.toString() || "",
      noiAnnual: existingDeal.noiAnnual?.toString() || "",
      occupancyPct: existingDeal.occupancyPct?.toString() || "",
      borrowerName: existingDeal.borrowerName || "",
      borrowerEntityType: existingDeal.borrowerEntityType || "",
      borrowerCreditScore: existingDeal.borrowerCreditScore?.toString() || "",
      hasGuarantor: existingDeal.hasGuarantor || false,
    });
    setFormLoaded(true);
  }

  const { data: formConfig = [] } = useQuery<FormFieldConfig[]>({
    queryKey: ["/api/commercial/form-config"],
  });

  const loanAmt = parseFloat(form.loanAmount) || 0;
  const propVal = parseFloat(form.propertyValue) || 0;
  const noi = parseFloat(form.noiAnnual) || 0;
  const ltv = propVal > 0 ? ((loanAmt / propVal) * 100).toFixed(2) : "—";
  const dscr = loanAmt > 0 ? (noi / (loanAmt * 0.07)).toFixed(2) : "—";

  const { data: requiredDocs = { requiredDocuments: [], templates: {} } } = useQuery<{ requiredDocuments: string[]; templates: Record<string, { ruleId: number; fileName: string }> }>({
    queryKey: ["/api/commercial/evaluate-document-rules", form.assetType, form.loanAmount, form.propertyState],
    queryFn: async () => {
      if (!form.assetType) return { requiredDocuments: ["Loan Application (1003)", "Bank Statement", "Tax Returns (2 years)", "Purchase Contract"], templates: {} };
      const res = await fetch("/api/commercial/evaluate-document-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          assetType: form.assetType,
          loanAmount: loanAmt || undefined,
          propertyState: form.propertyState || undefined,
        }),
      });
      if (!res.ok) return { requiredDocuments: ["Loan Application (1003)", "Bank Statement", "Tax Returns (2 years)", "Purchase Contract"], templates: {} };
      return res.json();
    },
    enabled: true,
  });

  const existingDocsByType: Record<string, any[]> = {};
  for (const d of (existingDeal?.documents || []).filter((d: any) => d.isCurrent)) {
    if (!existingDocsByType[d.documentType]) existingDocsByType[d.documentType] = [];
    existingDocsByType[d.documentType].push(d);
  }
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, Array<{ file: File; name: string }>>>({});

  const saveMut = useMutation({
    mutationFn: async (submit: boolean) => {
      const body: any = {
        dealName: form.dealName,
        loanAmount: loanAmt || null,
        assetType: form.assetType || null,
        propertyAddress: form.propertyAddress || null,
        propertyCity: form.propertyCity || null,
        propertyState: form.propertyState || null,
        propertyZip: form.propertyZip || null,
        propertyValue: propVal || null,
        noiAnnual: noi || null,
        occupancyPct: form.occupancyPct ? parseInt(form.occupancyPct) : null,
        borrowerName: form.borrowerName || null,
        borrowerEntityType: form.borrowerEntityType || null,
        borrowerCreditScore: form.borrowerCreditScore ? parseInt(form.borrowerCreditScore) : null,
        hasGuarantor: form.hasGuarantor,
      };

      let deal: any;
      if (isEditing && urlEditId) {
        const res = await apiRequest("PATCH", `/api/commercial/deals/${urlEditId}`, body);
        deal = await res.json();
      } else {
        const res = await apiRequest("POST", "/api/commercial/deals", body);
        deal = await res.json();
      }

      for (const [docType, files] of Object.entries(uploadedDocs)) {
        for (const { name } of files) {
          await apiRequest("POST", `/api/commercial/deals/${deal.id}/documents`, {
            documentType: docType,
            fileName: name,
            fileSize: 0,
            mimeType: "application/pdf",
          });
        }
      }

      if (submit) {
        await apiRequest("POST", `/api/commercial/deals/${deal.id}/submit`);
      }

      return deal;
    },
    onSuccess: (_deal, submit) => {
      queryClient.invalidateQueries({ queryKey: ["/api/commercial/deals"] });
      toast({ title: submit ? "Deal submitted for review" : "Draft saved" });
      navigate("/commercial-deals");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleFileSelect = (docType: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).map(f => ({ file: f, name: f.name }));
    setUploadedDocs(prev => ({
      ...prev,
      [docType]: [...(prev[docType] || []), ...newFiles],
    }));
  };

  const removeUploadedFile = (docType: string, index: number) => {
    setUploadedDocs(prev => {
      const updated = [...(prev[docType] || [])];
      updated.splice(index, 1);
      if (updated.length === 0) {
        const { [docType]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [docType]: updated };
    });
  };

  const update = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  if (isEditing && loadingDeal) {
    return <div className="flex justify-center py-12"><RefreshCw size={20} className="animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-3xl" data-testid="deal-form-page">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/commercial-deals")} className="text-slate-400" data-testid="back-button">
          <ArrowLeft size={16} className="mr-1" /> Back
        </Button>
        <h1 className="text-xl font-semibold text-white">{isEditing ? "Edit Draft Deal" : "Submit New Deal"}</h1>
        {isEditing && <Badge className="text-xs bg-slate-500/20 text-slate-400 border-slate-500/30">Draft</Badge>}
      </div>

      {(() => {
        const visibleFields = formConfig.filter(f => f.isVisible);
        const sections = visibleFields.reduce((acc, field) => {
          if (!acc[field.section]) acc[field.section] = [];
          acc[field.section].push(field);
          return acc;
        }, {} as Record<string, FormFieldConfig[]>);
        Object.values(sections).forEach(arr => arr.sort((a, b) => a.sortOrder - b.sortOrder));

        if (Object.keys(sections).length === 0) {
          return (
            <>
              <Card className="bg-[#1a2038] border-slate-700/50">
                <CardHeader className="pb-3"><CardTitle className="text-sm text-slate-300">Deal Basics</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-slate-400">Deal Name *</Label>
                    <Input value={form.dealName} onChange={e => update("dealName", e.target.value)} className="bg-[#0f1629] border-slate-700 text-white text-sm" data-testid="deal-name" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-400">Loan Amount ($) *</Label>
                      <Input type="number" value={form.loanAmount} onChange={e => update("loanAmount", e.target.value)} className="bg-[#0f1629] border-slate-700 text-white text-sm" data-testid="loan-amount" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Asset Type *</Label>
                      <Select value={form.assetType} onValueChange={v => update("assetType", v)}>
                        <SelectTrigger className="bg-[#0f1629] border-slate-700 text-white text-sm" data-testid="asset-type"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          );
        }

        return Object.entries(sections).map(([sectionName, sectionFields]) => (
          <Card key={sectionName} className="bg-[#1a2038] border-slate-700/50">
            <CardHeader className="pb-3"><CardTitle className="text-sm text-slate-300">{sectionName}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sectionFields.map(field => (
                  <DynamicField
                    key={field.id}
                    field={field}
                    value={form[field.fieldKey]}
                    onChange={v => update(field.fieldKey, v)}
                    onAddressSelect={(data) => {
                      update("propertyCity", data.city || "");
                      update("propertyState", data.state || "");
                      update("propertyZip", data.zip || "");
                    }}
                  />
                ))}
              </div>
              {sectionName === "Property Metrics" && (
                <div className="flex gap-6 p-3 rounded bg-[#0f1629] border border-slate-700/50">
                  <div>
                    <p className="text-xs text-slate-500">LTV (auto-calculated)</p>
                    <p className={`text-sm font-medium ${ltv !== "—" && parseFloat(ltv) > 80 ? "text-red-400" : "text-white"}`} data-testid="ltv-display">{ltv}{ltv !== "—" ? "%" : ""}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">DSCR (auto-calculated)</p>
                    <p className={`text-sm font-medium ${dscr !== "—" && parseFloat(dscr) < 1.25 ? "text-amber-400" : "text-white"}`} data-testid="dscr-display">{dscr}{dscr !== "—" ? "x" : ""}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ));
      })()}

      <Card className="bg-[#1a2038] border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-slate-300">Required Documents</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Based on your deal ({form.assetType || "—"}, ${loanAmt ? `${(loanAmt / 1000000).toFixed(1)}M` : "—"}, {form.propertyState || "—"})
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {requiredDocs.requiredDocuments.map((docType: string) => {
            const template = requiredDocs.templates?.[docType];
            const newFiles = uploadedDocs[docType] || [];
            const existingFiles = existingDocsByType[docType] || [];
            const hasFiles = newFiles.length > 0 || existingFiles.length > 0;
            return (
              <div key={docType} className="p-3 rounded bg-[#0f1629] border border-slate-700/50" data-testid={`doc-req-${docType.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                <div className="flex items-center gap-3">
                  {hasFiles ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  ) : (
                    <FileText size={16} className="text-slate-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{docType}</p>
                    {hasFiles && (
                      <p className="text-[10px] text-slate-500">{existingFiles.length + newFiles.length} file{(existingFiles.length + newFiles.length) !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {template && (
                      <a
                        href={`/api/commercial/document-rules/${template.ruleId}/template/${encodeURIComponent(docType)}/download`}
                        className="text-xs px-3 py-1.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                        data-testid={`template-${docType.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                        download
                      >
                        <Download size={12} />
                        Template
                      </a>
                    )}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
                        onChange={e => { handleFileSelect(docType, e.target.files); e.target.value = ""; }}
                      />
                      <span className="text-xs px-3 py-1.5 rounded border transition-colors bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20 flex items-center gap-1" data-testid={`upload-${docType.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                        <Upload size={12} />
                        {hasFiles ? "Add More" : "Upload"}
                      </span>
                    </label>
                  </div>
                </div>
                {(existingFiles.length > 0 || newFiles.length > 0) && (
                  <div className="mt-2 ml-7 space-y-1">
                    {existingFiles.map((doc: any) => (
                      <div key={doc.id} className="flex items-center gap-2 text-xs text-slate-400 py-0.5">
                        <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                        <span className="truncate flex-1">{doc.fileName}</span>
                        <span className="text-slate-600 shrink-0">v{doc.version}</span>
                      </div>
                    ))}
                    {newFiles.map((f, i) => (
                      <div key={`new-${i}`} className="flex items-center gap-2 text-xs text-blue-400 py-0.5">
                        <Plus size={10} className="text-blue-400 shrink-0" />
                        <span className="truncate flex-1">{f.name}</span>
                        <button type="button" onClick={() => removeUploadedFile(docType, i)} className="text-slate-500 hover:text-red-400 shrink-0" data-testid={`remove-file-${docType.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${i}`}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 pb-6">
        <Button
          variant="outline"
          onClick={() => saveMut.mutate(false)}
          disabled={saveMut.isPending}
          className="border-slate-700 text-slate-300"
          data-testid="save-draft-button"
        >
          <Save size={14} className="mr-1" /> {isEditing ? "Update Draft" : "Save as Draft"}
        </Button>
        <div className="flex-1" />
        <Button
          variant="outline"
          onClick={() => navigate("/commercial-deals")}
          className="border-slate-700 text-slate-300"
        >
          Cancel
        </Button>
        <Button
          onClick={() => saveMut.mutate(true)}
          disabled={saveMut.isPending || !form.dealName || !form.loanAmount || !form.assetType}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="submit-deal-button"
        >
          <Send size={14} className="mr-1" /> Submit to Lender
        </Button>
      </div>
    </div>
  );
}

function DealDetail() {
  const params = useLocation()[0].split("/").pop();
  const [, navigate] = useLocation();

  const { data: deal, isLoading } = useQuery<any>({
    queryKey: ["/api/commercial/deals", params],
    queryFn: async () => {
      const res = await fetch(`/api/commercial/deals/${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><RefreshCw size={20} className="animate-spin text-slate-400" /></div>;
  if (!deal) return <div className="p-6"><p className="text-slate-400">Deal not found</p></div>;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-3xl" data-testid="broker-deal-detail">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/commercial-deals")} className="text-slate-400" data-testid="back-button">
          <ArrowLeft size={16} className="mr-1" /> Back
        </Button>
        <h1 className="text-xl font-semibold text-white">{deal.dealName || `Deal #${deal.id}`}</h1>
        {statusBadge(deal.status)}
        {deal.status === "draft" && (
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 ml-auto" onClick={() => navigate(`/commercial-deals/${deal.id}/edit`)} data-testid="edit-draft-button">
            <Pencil size={14} className="mr-1" /> Edit Draft
          </Button>
        )}
      </div>

      <Card className="bg-[#1a2038] border-slate-700/50">
        <CardHeader className="pb-3"><CardTitle className="text-sm text-slate-300">Deal Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div><p className="text-slate-500 text-xs">Loan Amount</p><p className="text-white">${deal.loanAmount ? deal.loanAmount.toLocaleString() : "N/A"}</p></div>
            <div><p className="text-slate-500 text-xs">Asset Type</p><p className="text-white">{deal.assetType || "N/A"}</p></div>
            <div><p className="text-slate-500 text-xs">Property</p><p className="text-white">{deal.propertyAddress || "N/A"}</p></div>
            <div><p className="text-slate-500 text-xs">LTV</p><p className="text-white">{deal.ltvPct != null ? `${deal.ltvPct}%` : "N/A"}</p></div>
            <div><p className="text-slate-500 text-xs">DSCR</p><p className="text-white">{deal.dscr != null ? `${deal.dscr}x` : "N/A"}</p></div>
            <div><p className="text-slate-500 text-xs">Borrower</p><p className="text-white">{deal.borrowerName || "N/A"}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Status Timeline */}
      {deal.statusHistory?.length > 0 && (
        <Card className="bg-[#1a2038] border-slate-700/50">
          <CardHeader className="pb-3"><CardTitle className="text-sm text-slate-300 flex items-center gap-2"><Clock size={16} /> Status Timeline</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deal.statusHistory.map((sh: any, i: number) => (
                <div key={sh.id} className="flex items-start gap-3" data-testid={`timeline-${i}`}>
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${i === 0 ? "bg-blue-500" : "bg-slate-600"}`} />
                    {i < deal.statusHistory.length - 1 && <div className="w-px h-6 bg-slate-700" />}
                  </div>
                  <div>
                    <p className="text-sm text-white">{sh.toStatus.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                    <p className="text-xs text-slate-500">{new Date(sh.createdAt).toLocaleString()}</p>
                    {sh.notes && <p className="text-xs text-slate-400 mt-0.5">{sh.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {deal.documents?.length > 0 && (
        <Card className="bg-[#1a2038] border-slate-700/50">
          <CardHeader className="pb-3"><CardTitle className="text-sm text-slate-300 flex items-center gap-2"><FileText size={16} /> Documents</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deal.documents.filter((d: any) => d.isCurrent).map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-3 p-2 rounded bg-[#0f1629] border border-slate-700/50">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-white">{doc.documentType}</p>
                    <p className="text-xs text-slate-500">{doc.fileName} · v{doc.version} · {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Project */}
      {deal.linkedProjectId && (
        <Card className="bg-[#1a2038] border-cyan-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowRight size={16} className="text-cyan-400" />
            <div>
              <p className="text-sm text-white">This deal has been transferred to the origination pipeline</p>
              <p className="text-xs text-slate-400">Project #{deal.linkedProjectId}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { DealsList, DealForm, DealDetail };
export default DealsList;
