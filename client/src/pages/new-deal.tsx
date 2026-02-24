import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Plus, User, DollarSign, Building2, Briefcase, Loader2, ClipboardList } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPhoneNumber, getPhoneError, getEmailError } from "@/lib/validation";

interface QuoteField {
  fieldKey: string;
  label: string;
  required: boolean;
  visible: boolean;
}

function formatNumberWithCommas(value: string): string {
  const num = value.replace(/[^0-9]/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('en-US');
}

function stripCommas(value: string): string {
  return value.replace(/,/g, '');
}

export default function NewDeal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState<Record<string, string>>({
    borrowerName: "",
    borrowerEmail: "",
    borrowerPhone: "",
    loanAmount: "",
    interestRate: "",
    loanTermMonths: "",
    loanType: "",
    programId: "",
    propertyAddress: "",
    propertyType: "",
    targetCloseDate: "",
    notes: "",
  });

  const { data: programsData, isLoading: programsLoading } = useQuery<{ programs: Array<{ id: number; name: string; loanType: string; isActive: boolean }> }>({
    queryKey: ['/api/programs-with-pricing'],
  });

  const programs = programsData?.programs || [];

  const { data: fieldsData, isLoading: fieldsLoading } = useQuery<{ quoteFormFields: QuoteField[] }>({
    queryKey: [`/api/programs/${formData.programId}/quote-fields`],
    enabled: !!formData.programId,
  });

  const programFields = fieldsData?.quoteFormFields?.filter(f => f.visible) || [];

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const payload: Record<string, any> = {
        borrowerName: data.borrowerName,
        borrowerEmail: data.borrowerEmail,
        borrowerPhone: data.borrowerPhone,
        loanAmount: data.loanAmount ? parseFloat(stripCommas(data.loanAmount)) : null,
        interestRate: data.interestRate ? parseFloat(data.interestRate) : null,
        loanTermMonths: data.loanTermMonths ? parseInt(data.loanTermMonths) : null,
        loanType: data.loanType || null,
        programId: data.programId ? parseInt(data.programId) : null,
        propertyAddress: data.propertyAddress || null,
        propertyType: data.propertyType || null,
        targetCloseDate: data.targetCloseDate || null,
        notes: data.notes || null,
      };
      if (programFields.length > 0) {
        for (const field of programFields) {
          const val = data[field.fieldKey];
          if (val !== undefined && val !== '') {
            const key = field.fieldKey;
            if (key === 'loanAmount') {
              payload.loanAmount = parseFloat(stripCommas(val));
            } else if (key === 'propertyType') {
              payload.propertyType = val;
            } else if (key === 'loanType' || key === 'loanPurpose' || key === 'purpose') {
              payload.loanType = val;
            } else {
              if (!payload.programFieldData) payload.programFieldData = {};
              payload.programFieldData[key] = isCurrencyField(key) ? parseFloat(stripCommas(val)) : val;
            }
          }
        }
      }
      return apiRequest('POST', '/api/deals', payload);
    },
    onSuccess: async (res) => {
      const { project } = await res.json();
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      toast({ title: "Deal created successfully" });
      setLocation(`/deals/${project.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create deal", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.borrowerName || !formData.borrowerEmail) {
      toast({ title: "Please fill in borrower name and email", variant: "destructive" });
      return;
    }
    const missingRequired = programFields
      .filter(f => f.required)
      .filter(f => !formData[f.fieldKey]);
    if (missingRequired.length > 0) {
      toast({
        title: "Missing required fields",
        description: missingRequired.map(f => f.label).join(', '),
        variant: "destructive"
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLoanAmountChange = (value: string) => {
    const raw = value.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, loanAmount: raw ? formatNumberWithCommas(raw) : '' }));
  };

  const isCurrencyField = (key: string) =>
    ['loanAmount', 'propertyValue', 'asIsValue', 'arv', 'rehabBudget', 'appraisalValue', 'annualTaxes', 'annualInsurance', 'grossMonthlyRent'].includes(key);

  const renderProgramField = (field: QuoteField) => {
    const key = field.fieldKey;
    const label = `${field.label}${field.required ? ' *' : ''}`;

    if (key === 'loanType' || key === 'loanPurpose' || key === 'purpose') {
      return (
        <div key={key} className="space-y-2">
          <Label>{label}</Label>
          <Select value={formData[key] || ''} onValueChange={(v) => updateField(key, v)}>
            <SelectTrigger data-testid={`select-${key}`}>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="refinance">Refinance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (key === 'propertyType') {
      return (
        <div key={key} className="space-y-2">
          <Label>{label}</Label>
          <Select value={formData[key] || ''} onValueChange={(v) => updateField(key, v)}>
            <SelectTrigger data-testid={`select-${key}`}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single-family-residence">Single Family Residence</SelectItem>
              <SelectItem value="2-4-unit">2-4 Unit</SelectItem>
              <SelectItem value="multifamily-5-plus">Multifamily (5+ Units)</SelectItem>
              <SelectItem value="rental-portfolio">Rental Portfolio</SelectItem>
              <SelectItem value="mixed-use">Mixed-Use</SelectItem>
              <SelectItem value="infill-lot">Infill Lot</SelectItem>
              <SelectItem value="land">Land</SelectItem>
              <SelectItem value="office">Office</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="hospitality">Hospitality</SelectItem>
              <SelectItem value="industrial">Industrial</SelectItem>
              <SelectItem value="medical">Medical</SelectItem>
              <SelectItem value="agricultural">Agricultural</SelectItem>
              <SelectItem value="special-purpose">Special Purpose</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (key === 'interestOnly' || key === 'isMidstream' || key === 'hasFullGuaranty') {
      return (
        <div key={key} className="space-y-2">
          <Label>{label}</Label>
          <Select value={formData[key] || ''} onValueChange={(v) => updateField(key, v)}>
            <SelectTrigger data-testid={`select-${key}`}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (key === 'borrowingEntityType') {
      return (
        <div key={key} className="space-y-2">
          <Label>{label}</Label>
          <Select value={formData[key] || ''} onValueChange={(v) => updateField(key, v)}>
            <SelectTrigger data-testid={`select-${key}`}>
              <SelectValue placeholder="Select entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="llc">LLC</SelectItem>
              <SelectItem value="corporation">Corporation</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="trust">Trust</SelectItem>
              <SelectItem value="partnership">Partnership</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (key === 'exitStrategy') {
      return (
        <div key={key} className="space-y-2">
          <Label>{label}</Label>
          <Select value={formData[key] || ''} onValueChange={(v) => updateField(key, v)}>
            <SelectTrigger data-testid={`select-${key}`}>
              <SelectValue placeholder="Select exit strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sell">Sell</SelectItem>
              <SelectItem value="refinance">Refinance</SelectItem>
              <SelectItem value="hold">Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (key === 'prepaymentPenalty') {
      return (
        <div key={key} className="space-y-2">
          <Label>{label}</Label>
          <Select value={formData[key] || ''} onValueChange={(v) => updateField(key, v)}>
            <SelectTrigger data-testid={`select-${key}`}>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
              <SelectItem value="2year">2 Years</SelectItem>
              <SelectItem value="3year">3 Years</SelectItem>
              <SelectItem value="5year">5 Years</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (isCurrencyField(key)) {
      return (
        <div key={key} className="space-y-2">
          <Label>{label}</Label>
          <Input
            value={formData[key] || ''}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, '');
              updateField(key, raw ? formatNumberWithCommas(raw) : '');
            }}
            placeholder=""
            data-testid={`input-${key}`}
          />
        </div>
      );
    }

    return (
      <div key={key} className="space-y-2">
        <Label>{label}</Label>
        <Input
          value={formData[key] || ''}
          onChange={(e) => updateField(key, e.target.value)}
          placeholder=""
          data-testid={`input-${key}`}
        />
      </div>
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/deals">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">New Deal</h1>
          <p className="text-sm text-muted-foreground">Create a new loan deal</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Loan Program
            </CardTitle>
            <CardDescription>Select the loan program for this deal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="programId">Program</Label>
              <Select value={formData.programId} onValueChange={(v) => updateField("programId", v)}>
                <SelectTrigger data-testid="select-program">
                  <SelectValue placeholder={programsLoading ? "Loading programs..." : "Select a loan program"} />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={String(program.id)}>
                      {program.name}
                    </SelectItem>
                  ))}
                  {programs.length === 0 && !programsLoading && (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No loan programs available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Borrower Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="borrowerName">Full Name *</Label>
                <Input
                  id="borrowerName"
                  value={formData.borrowerName}
                  onChange={(e) => updateField("borrowerName", e.target.value)}
                  placeholder="John Smith"
                  data-testid="input-borrower-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="borrowerEmail">Email *</Label>
                <Input
                  id="borrowerEmail"
                  type="email"
                  value={formData.borrowerEmail}
                  onChange={(e) => updateField("borrowerEmail", e.target.value)}
                  onBlur={() => {}}
                  placeholder="john@example.com"
                  data-testid="input-borrower-email"
                />
                {getEmailError(formData.borrowerEmail) && <p className="text-xs text-destructive mt-1">{getEmailError(formData.borrowerEmail)}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="borrowerPhone">Phone</Label>
              <Input
                id="borrowerPhone"
                type="tel"
                value={formData.borrowerPhone}
                onChange={(e) => updateField("borrowerPhone", formatPhoneNumber(e.target.value))}
                placeholder="(555) 123-4567"
                data-testid="input-borrower-phone"
              />
              {getPhoneError(formData.borrowerPhone) && <p className="text-xs text-destructive mt-1">{getPhoneError(formData.borrowerPhone)}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="propertyAddress">Property Address</Label>
              <AddressAutocomplete
                value={formData.propertyAddress}
                onChange={(val) => updateField("propertyAddress", val)}
                placeholder="123 Main St, City, State 12345"
              />
            </div>
          </CardContent>
        </Card>

        {formData.programId && programFields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Program Requirements
              </CardTitle>
              <CardDescription>
                Fields based on the selected loan program
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fieldsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {programFields.map(renderProgramField)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!formData.programId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Loan Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loanAmount">Loan Amount</Label>
                  <Input
                    id="loanAmount"
                    value={formData.loanAmount}
                    onChange={(e) => handleLoanAmountChange(e.target.value)}
                    placeholder=""
                    data-testid="input-loan-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Interest Rate (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.01"
                    value={formData.interestRate}
                    onChange={(e) => updateField("interestRate", e.target.value)}
                    placeholder=""
                    data-testid="input-interest-rate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loanTermMonths">Term (months)</Label>
                  <Input
                    id="loanTermMonths"
                    type="number"
                    value={formData.loanTermMonths}
                    onChange={(e) => updateField("loanTermMonths", e.target.value)}
                    placeholder=""
                    data-testid="input-loan-term"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="loanType">Loan Type</Label>
                <Select value={formData.loanType} onValueChange={(v) => updateField("loanType", v)}>
                  <SelectTrigger data-testid="select-loan-type">
                    <SelectValue placeholder="Select loan type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="refinance">Refinance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyType">Property Type</Label>
                  <Select value={formData.propertyType} onValueChange={(v) => updateField("propertyType", v)}>
                    <SelectTrigger data-testid="select-property-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single-family-residence">Single Family Residence</SelectItem>
                      <SelectItem value="2-4-unit">2-4 Unit</SelectItem>
                      <SelectItem value="multifamily-5-plus">Multifamily (5+ Units)</SelectItem>
                      <SelectItem value="rental-portfolio">Rental Portfolio</SelectItem>
                      <SelectItem value="mixed-use">Mixed-Use</SelectItem>
                      <SelectItem value="infill-lot">Infill Lot</SelectItem>
                      <SelectItem value="land">Land</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="hospitality">Hospitality</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="medical">Medical</SelectItem>
                      <SelectItem value="agricultural">Agricultural</SelectItem>
                      <SelectItem value="special-purpose">Special Purpose</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetCloseDate">Target Close Date</Label>
                  <Input
                    id="targetCloseDate"
                    type="date"
                    value={formData.targetCloseDate}
                    onChange={(e) => updateField("targetCloseDate", e.target.value)}
                    data-testid="input-target-close-date"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
            <CardDescription>Any additional notes about this deal (visible to borrower)</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Enter any notes..."
              rows={4}
              data-testid="input-notes"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/deals">
            <Button type="button" variant="outline" data-testid="button-cancel">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-create">
            {createMutation.isPending ? (
              "Creating..."
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Deal
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
