import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  Send,
  Trash2,
  Edit,
  Calculator,
  MessageSquare,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DocumentSigningModal } from "@/components/DocumentSigningModal";
import { TermSheetStatus } from "@/components/TermSheetStatus";
import type { SavedQuote } from "@shared/schema";
import { LoanForm } from "@/components/LoanForm";
import { RTLLoanForm } from "@/components/RTLLoanForm";
import { PricingResult } from "@/components/PricingResult";
import { RTLPricingResult } from "@/components/RTLPricingResult";
import { usePricing } from "@/hooks/use-pricing";
import { type LoanPricingFormData, type PricingResponse, type RTLPricingFormData, type RTLPricingResponse } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DocumentInfo {
  id: number;
  status: 'draft' | 'pending' | 'completed' | 'expired';
  createdAt: string;
  vendor?: string;
  pandadocDocumentId?: string;
  signers: Array<{
    id: number;
    name: string;
    email: string;
    status: string;
    tokenExpiresAt?: string;
  }>;
}

interface Signer {
  id: number;
  name: string;
  email: string;
  status: 'pending' | 'sent' | 'viewed' | 'signed';
  signedAt?: string;
  tokenExpiresAt?: string;
}

interface Agreement {
  id: number;
  title: string;
  status: 'draft' | 'pending' | 'sent' | 'in_progress' | 'completed' | 'voided' | 'voided_edited' | 'expired';
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
  voidedAt?: string;
  quoteId?: number;
  totalSigners: number;
  signedCount: number;
  vendor?: 'local' | 'pandadoc';
  externalDocumentId?: string;
  editorUrl?: string;
  signers: Signer[];
}

interface ProgramWithPricing {
  id: number;
  name: string;
  loanType: string;
  description: string | null;
  hasActiveRuleset: boolean;
  activeRulesetId?: number;
  activeRulesetVersion?: number;
}

type FilterTab = 'all' | 'draft' | 'sent' | 'in_progress' | 'completed' | 'voided';

const filterTabs: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'sent', label: 'Sent' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'voided', label: 'Voided' }
];

function QuoteDocumentStatus({ quoteId }: { quoteId: number }) {
  const { toast } = useToast();
  const { branding } = require("@/hooks/use-branding").useBranding();

  const { data, isLoading } = useQuery<{ success: boolean; documents: DocumentInfo[] }>({
    queryKey: ['/api/quotes', quoteId, 'documents'],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/${quoteId}/documents`);
      return res.json();
    }
  });

  const resendMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const res = await apiRequest('POST', `/api/documents/${documentId}/pandadoc/send`, {
        subject: 'Reminder: Please sign this document',
        message: `This is a reminder to review and sign the attached document.`,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes', quoteId, 'documents'] });
      if (data.requiresManualSend && data.editorUrl) {
        toast({ title: "Document Created in PandaDoc", description: "Opening PandaDoc editor to send..." });
        window.open(data.editorUrl, '_blank');
      } else {
        toast({ title: "Resent via PandaDoc", description: "The signing request has been resent via PandaDoc." });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resend signing request",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return null;
  }

  const documents = data?.documents || [];
  const latestDoc = documents.find(d => d.status !== 'draft');

  if (!latestDoc || !latestDoc.signers || latestDoc.signers.length === 0) {
    return null;
  }

  return null;
}

function QuoteEsignStatus({ quoteId }: { quoteId: number }) {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<{ envelopes: any[] }>({
    queryKey: ['/api/esign/envelopes/quote', quoteId],
    queryFn: async () => {
      const res = await fetch(`/api/esign/envelopes/quote/${quoteId}`);
      return res.json();
    }
  });

  const sendPandadocMutation = useMutation({
    mutationFn: async ({ envelopeId }: { envelopeId: number }) => {
      return apiRequest('POST', `/api/esign/pandadoc/documents/${envelopeId}/send`, { sendMethod: 'email' });
    },
    onSuccess: () => {
      toast({ title: "Document Sent", description: "The PandaDoc document has been sent for signing." });
      queryClient.invalidateQueries({ queryKey: ['/api/esign/envelopes/quote', quoteId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send PandaDoc document", variant: "destructive" });
    }
  });

  if (isLoading || !data?.envelopes?.length) {
    return null;
  }

  return null;
}

export default function QuotesUnified() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isBorrower = user?.userType === 'borrower';

  // Quote Creation State
  const [loanProductType, setLoanProductType] = useState<"dscr" | "rtl">("dscr");
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [dscrResult, setDscrResult] = useState<PricingResponse | null>(null);
  const [dscrFormData, setDscrFormData] = useState<LoanPricingFormData | null>(null);
  const [rtlResult, setRtlResult] = useState<RTLPricingResponse | null>(null);
  const [rtlFormData, setRtlFormData] = useState<RTLPricingFormData | null>(null);

  // Term Sheets State
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [signingQuote, setSigningQuote] = useState<SavedQuote | null>(null);

  // Mutations
  const { mutate: getPricing, isPending: dscrPending } = usePricing();

  const rtlPricingMutation = useMutation({
    mutationFn: async (data: RTLPricingFormData) => {
      const res = await apiRequest("POST", "/api/pricing/rtl", data);
      return res.json();
    },
    onSuccess: (data: RTLPricingResponse) => {
      setRtlResult(data);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to calculate RTL pricing", variant: "destructive" });
    },
  });

  // Fetch Quotes
  const { data: quotesData, isLoading: quotesLoading } = useQuery<{ success: boolean; quotes: SavedQuote[] }>({
    queryKey: ['/api/quotes']
  });

  // Fetch Agreements
  const { data: agreementsData, isLoading: agreementsLoading } = useQuery<{ success: boolean; agreements: Agreement[] }>({
    queryKey: ['/api/esignature/agreements']
  });

  // Fetch Programs
  const { data: programsData } = useQuery<{ programs: ProgramWithPricing[] }>({
    queryKey: ["/api/programs-with-pricing"],
  });

  const allActivePrograms = programsData?.programs || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/quotes/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Quote Deleted", description: "The quote has been removed." });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete quote", variant: "destructive" });
    }
  });

  const handleDSCRSubmit = (data: LoanPricingFormData) => {
    setDscrFormData(data);
    getPricing(data, {
      onSuccess: (response) => {
        setDscrResult(response);
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

  const handleEditQuote = (quote: SavedQuote) => {
    const loanData = quote.loanData as Record<string, any>;
    const isRTLQuote = loanData?.asIsValue || loanData?.arv || loanData?.rehabBudget !== undefined;

    sessionStorage.setItem('editQuote', JSON.stringify({
      quoteId: quote.id,
      isRTL: isRTLQuote,
      loanData: loanData,
      programId: quote.programId,
      customerFirstName: quote.customerFirstName,
      customerLastName: quote.customerLastName,
      propertyAddress: quote.propertyAddress,
      pointsCharged: quote.pointsCharged
    }));

    navigate('/');
  };

  const quotes = quotesData?.quotes || [];
  const agreements = agreementsData?.agreements || [];

  const filteredAgreements = agreements.filter(a => {
    const matchesFilter = activeFilter === 'all' ||
      (activeFilter === 'voided' && (a.status === 'voided' || a.status === 'voided_edited')) ||
      (activeFilter === 'sent' && (a.status === 'sent' || a.status === 'pending')) ||
      a.status === activeFilter;

    const matchesSearch = searchQuery === '' ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.signers.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const getFilterCount = (filter: FilterTab) => {
    if (filter === 'all') return agreements.length;
    if (filter === 'voided') return agreements.filter(a => a.status === 'voided' || a.status === 'voided_edited').length;
    if (filter === 'sent') return agreements.filter(a => a.status === 'sent' || a.status === 'pending').length;
    return agreements.filter(a => a.status === filter).length;
  };

  const hasResult = (loanProductType === "dscr" && dscrResult) || (loanProductType === "rtl" && rtlResult);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold">Quotes</h1>
          <p className="text-[16px] text-muted-foreground mt-0.5">
            Manage quotes and term sheets.
          </p>
        </div>
      </div>

      <div>
        <Tabs defaultValue={isBorrower ? "create" : "saved"} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-5">
            <TabsTrigger value="create" className="text-[16px]" data-testid="tab-create-quote">
              <Calculator className="w-4 h-4 mr-2" />
              Create Quote
            </TabsTrigger>
            <TabsTrigger value="saved" className="text-[16px]" data-testid="tab-saved-quotes">
              <FileText className="w-4 h-4 mr-2" />
              Saved Quotes
            </TabsTrigger>
            <TabsTrigger value="term-sheets" className="text-[16px]" data-testid="tab-term-sheets">
              <FileText className="w-4 h-4 mr-2" />
              Term Sheets
            </TabsTrigger>
          </TabsList>

          {/* CREATE QUOTE TAB */}
          <TabsContent value="create" className="space-y-5">
            {!hasResult ? (
              <>
                <div className="bg-card border rounded-[10px] shadow-sm overflow-hidden px-5 py-4">
                  <h3 className="text-[16px] font-semibold mb-1">Loan Program</h3>
                  <p className="text-[13px] text-muted-foreground mb-3">Select the loan program to price</p>
                  <div>
                    {allActivePrograms.length > 0 ? (
                      <Select
                        value={selectedProgramId?.toString() || ""}
                        onValueChange={(v) => {
                          const prog = allActivePrograms.find(p => p.id === parseInt(v));
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
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11.5px] font-medium bg-gray-100 text-gray-600">
                                  {program.loanType.toUpperCase()}
                                </span>
                                <span className="text-[16px]">{program.name}</span>
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
                  </div>
                </div>

                {selectedProgramId && (
                <div className="max-w-4xl mx-auto">
                  {loanProductType === "dscr" ? (
                    <LoanForm
                      onSubmit={handleDSCRSubmit}
                      isLoading={dscrPending}
                      defaultData={dscrFormData}
                      visibleFields={allActivePrograms.find(p => p.id === selectedProgramId)?.quoteFormFields as any}
                    />
                  ) : (
                    <RTLLoanForm
                      onSubmit={handleRTLSubmit}
                      isLoading={rtlPricingMutation.isPending}
                      defaultData={rtlFormData}
                      visibleFields={allActivePrograms.find(p => p.id === selectedProgramId)?.quoteFormFields as any}
                    />
                  )}
                </div>
                )}

                {!selectedProgramId && (
                  <div className="bg-card border rounded-[10px] shadow-sm overflow-hidden">
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Calculator className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-[15px] font-semibold text-foreground mb-1">Select a loan program above to get started</h3>
                      <p className="text-[13px] text-muted-foreground max-w-sm">The form fields will appear based on the program you choose</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="max-w-2xl mx-auto space-y-6">
                {loanProductType === "dscr" && dscrResult && (
                  <PricingResult
                    result={dscrResult}
                    formData={dscrFormData}
                    onReset={handleReset}
                    programId={selectedProgramId}
                  />
                )}

                {loanProductType === "rtl" && rtlResult && (
                  <RTLPricingResult
                    result={rtlResult}
                    formData={rtlFormData}
                    onReset={handleReset}
                    programId={selectedProgramId}
                  />
                )}
              </div>
            )}
          </TabsContent>

          {/* SAVED QUOTES TAB */}
          <TabsContent value="saved" className="space-y-5">
            {quotesLoading ? (
              <div className="bg-card border rounded-[10px] shadow-sm overflow-hidden p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 w-full bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : quotes.length === 0 ? (
              <div className="bg-card border rounded-[10px] shadow-sm overflow-hidden">
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-foreground mb-1">No Saved Quotes</h3>
                  <p className="text-[13px] text-muted-foreground max-w-sm">Generate a loan pricing quote and save it to see it here.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {quotes.map((quote) => {
                  const loanData = quote.loanData as Record<string, any>;
                  const createdAt = quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : 'N/A';

                  const isRTLQuote = loanData?.asIsValue || loanData?.arv || loanData?.rehabBudget !== undefined;

                  const asIsValue = loanData?.asIsValue || 0;
                  const arv = loanData?.arv || 0;
                  const rehabBudget = loanData?.rehabBudget || 0;
                  const totalCost = asIsValue + rehabBudget;

                  const additionalPoints = Math.max(0, (quote.pointsCharged || 0) - 2);
                  const rtlCommission = (totalCost * additionalPoints) / 100;

                  const dscrAdditionalPoints = Math.max(0, (quote.pointsCharged || 0) - 1);
                  const dscrLoanAmount = loanData?.loanAmount || 0;
                  const dscrCommission = (dscrLoanAmount * dscrAdditionalPoints) / 100;

                  const displayLoanAmount = isRTLQuote ? totalCost : loanData?.loanAmount;
                  const displayProgram = isRTLQuote
                    ? loanData?.loanType?.replace(/_/g, ' ').toUpperCase()
                    : loanData?.loanType;

                  return (
                    <div key={quote.id} className="bg-card border rounded-[10px] shadow-sm overflow-hidden" data-testid={`card-quote-${quote.id}`}>
                      <div className="px-5 py-4 border-b border-border/50">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="h-8 w-8 rounded-md bg-blue-100 flex items-center justify-center text-[13px] font-semibold text-blue-600 shrink-0">
                              {(quote.customerFirstName?.[0] || '').toUpperCase()}{(quote.customerLastName?.[0] || '').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[16px] font-medium truncate">
                                {quote.customerFirstName} {quote.customerLastName}
                              </div>
                              <div className="text-[13px] text-muted-foreground truncate">
                                {quote.propertyAddress}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[13px] text-muted-foreground">{createdAt}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => deleteMutation.mutate(quote.id)}
                              disabled={deleteMutation.isPending}
                              className="text-destructive h-8 w-8"
                              data-testid={`button-delete-quote-${quote.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="px-5 py-4">
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div>
                            <div className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Interest Rate</div>
                            <div className="text-[26px] font-bold text-foreground">{quote.interestRate}</div>
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{isRTLQuote ? 'Total Cost' : 'Loan Amount'}</div>
                            <div className="text-[16px] font-semibold">${displayLoanAmount?.toLocaleString() || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Points</div>
                            <div className="text-[16px] font-semibold">
                              {quote.pointsCharged?.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Program</div>
                            <div className="text-[16px] font-semibold">{displayProgram || 'N/A'}</div>
                          </div>
                        </div>

                        <div className="bg-slate-50/80 rounded-[10px] p-4 border border-border/50 mb-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-between text-[16px]">
                              <span className="text-muted-foreground">
                                {isRTLQuote ? 'Total Project Cost' : 'Loan Amount'}
                              </span>
                              <span className="font-semibold">
                                ${(isRTLQuote ? totalCost : dscrLoanAmount).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[16px]">
                              <span className="text-muted-foreground">Your Commission</span>
                              <span className="font-semibold text-emerald-600">
                                ${isRTLQuote
                                  ? rtlCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                  : dscrCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-3">
                          <Button
                            variant="outline"
                            onClick={() => handleEditQuote(quote)}
                            className="text-[16px] [--button-outline:rgba(156,163,175,0.30)] border-[0.5px]"
                            data-testid={`button-edit-quote-${quote.id}`}
                          >
                            <Edit className="h-4 w-4 mr-1.5" />
                            Edit Quote
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/messages?dealId=${quote.id}&new=true`)}
                            className="text-[16px] [--button-outline:rgba(156,163,175,0.30)] border-[0.5px]"
                            data-testid={`button-message-quote-${quote.id}`}
                            title="Message about this deal"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <TermSheetStatus quoteId={quote.id} />
                          <Button
                            onClick={() => setSigningQuote(quote)}
                            className="text-[16px] shadow-md"
                            data-testid={`button-send-signature-${quote.id}`}
                          >
                            <Send className="h-4 w-4 mr-1.5" />
                            Send Term Sheet
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TERM SHEETS TAB */}
          <TabsContent value="term-sheets" className="space-y-5">
            <div className="bg-card border rounded-[10px] shadow-sm overflow-hidden">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative max-w-[320px] w-[320px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search term sheets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-[16px]"
                        data-testid="input-search-term-sheets"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {filterTabs.map(tab => (
                      <button
                        key={tab.value}
                        onClick={() => setActiveFilter(tab.value)}
                        className={`h-9 px-3 text-[16px] font-medium border rounded-md transition-colors ${
                          activeFilter === tab.value
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-500 border-border"
                        }`}
                        data-testid={`button-filter-${tab.value}`}
                      >
                        {tab.label} ({getFilterCount(tab.value)})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {agreementsLoading ? (
              <div className="bg-card border rounded-[10px] shadow-sm overflow-hidden p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 w-full bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : filteredAgreements.length === 0 ? (
              <div className="bg-card border rounded-[10px] shadow-sm overflow-hidden">
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-foreground mb-1">No Term Sheets Found</h3>
                  <p className="text-[13px] text-muted-foreground max-w-sm">
                    {activeFilter === 'all'
                      ? "Create a quote and send it for signature to get started."
                      : `No term sheets with status "${activeFilter}".`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-card border rounded-[10px] shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2">
                      <th className="text-left px-3 py-2.5 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Title</th>
                      <th className="text-left px-3 py-2.5 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="text-left px-3 py-2.5 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="text-left px-3 py-2.5 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Signers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgreements.map((agreement) => (
                      <tr key={agreement.id} className="border-b border-border/50 transition-colors hover:bg-blue-50/50" data-testid={`row-agreement-${agreement.id}`}>
                        <td className="px-3 py-3">
                          <div className="text-[16px] font-medium">{agreement.title}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium ${
                            agreement.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                            agreement.status === 'draft' ? 'bg-gray-100 text-gray-500' :
                            agreement.status === 'voided' || agreement.status === 'voided_edited' ? 'bg-red-50 text-red-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              agreement.status === 'completed' ? 'bg-emerald-500' :
                              agreement.status === 'draft' ? 'bg-gray-400' :
                              agreement.status === 'voided' || agreement.status === 'voided_edited' ? 'bg-red-500' :
                              'bg-amber-500'
                            }`} />
                            {agreement.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[16px]">
                          {agreement.sentAt ? new Date(agreement.sentAt).toLocaleDateString() : new Date(agreement.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-3 text-[16px]">
                          {agreement.totalSigners > 0 ? `${agreement.signedCount}/${agreement.totalSigners} signed` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t text-[14px] text-muted-foreground flex items-center justify-between">
                  <span>Showing {filteredAgreements.length} of {agreements.length} term sheets</span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {signingQuote && (
        <DocumentSigningModal
          open={!!signingQuote}
          onClose={() => {
            setSigningQuote(null);
            queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
          }}
          quote={signingQuote}
        />
      )}
    </div>
  );
}
