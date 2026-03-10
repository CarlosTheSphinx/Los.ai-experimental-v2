import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, Download, Send, CheckCircle2, Loader2, FileSignature } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentSigningModal } from "@/components/DocumentSigningModal";
import type { SavedQuote } from "@shared/schema";

function safeNumber(value: any): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[$,%\s]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

export default function QuoteDocuments() {
  const [, params] = useRoute("/quotes/:id/documents");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const quoteId = params?.id ? parseInt(params.id) : null;
  const [downloadingTemplateId, setDownloadingTemplateId] = useState<number | null>(null);
  const [showSigningModal, setShowSigningModal] = useState(false);

  const { data: quoteData, isLoading: quoteLoading } = useQuery<{ success: boolean; quote: SavedQuote }>({
    queryKey: ['/api/quotes', quoteId],
    enabled: !!quoteId,
  });

  const { data: templates, isLoading: templatesLoading } = useQuery<any[]>({
    queryKey: ['/api/quote-pdf-templates'],
  });

  const quote = quoteData?.quote;
  const loanData = quote?.loanData as Record<string, any> | null;

  const handleDownloadPdf = async (templateId?: number) => {
    if (!quoteId) return;
    setDownloadingTemplateId(templateId ?? -1);
    try {
      const url = templateId
        ? `/api/quotes/${quoteId}/pdf?templateId=${templateId}`
        : `/api/quotes/${quoteId}/pdf`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Quote-${quoteId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to download PDF",
        variant: "destructive",
      });
    } finally {
      setDownloadingTemplateId(null);
    }
  };

  if (quoteLoading || templatesLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center space-y-4">
        <p className="text-muted-foreground">Quote not found.</p>
        <Button variant="outline" onClick={() => setLocation('/quotes')} data-testid="button-back-quotes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Quotes
        </Button>
      </div>
    );
  }

  const loanAmount = safeNumber(loanData?.loanAmount || loanData?.requestedLoanAmount || loanData?.loanamount);
  const borrowerName = [quote.customerFirstName, quote.customerLastName].filter(Boolean).join(' ') || 'N/A';
  const propertyAddress = quote.propertyAddress || 'N/A';

  const availableTemplates = templates || [];
  const summaryTemplates = availableTemplates.filter((t: any) => !t.config?.templateType || t.config?.templateType === 'summary');
  const loiTemplates = availableTemplates.filter((t: any) => t.config?.templateType === 'loi');

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground" data-testid="text-page-title">
            Select Document
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a document to generate or send for this quote.</p>
        </div>
        <Button variant="outline" onClick={() => setLocation('/quotes')} data-testid="button-back-quotes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quotes
        </Button>
      </div>

      <Card className="border-primary/10" data-testid="card-quote-summary">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground">Quote #{quote.id}</span>
                <span className="text-2xl font-bold text-primary">{quote.interestRate || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground block">Loan Amount</span>
                  <span className="font-medium">${loanAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Borrower</span>
                  <span className="font-medium truncate" data-testid="text-borrower-name">{borrowerName}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block">Property</span>
                  <span className="font-medium truncate">{propertyAddress}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold font-display text-foreground">Document Templates</h2>

        {availableTemplates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                No PDF templates configured yet. You can still download the default quote PDF or send for signature.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => handleDownloadPdf()}
                  disabled={downloadingTemplateId !== null}
                  variant="outline"
                  data-testid="button-download-default"
                >
                  {downloadingTemplateId === -1 ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download Default PDF
                </Button>
                <Button
                  onClick={() => setShowSigningModal(true)}
                  className="bg-gradient-to-r from-primary to-primary"
                  data-testid="button-send-signature"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send for Signature
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {summaryTemplates.map((template: any) => (
              <Card key={template.id} className="hover:border-primary/30 transition-colors" data-testid={`card-template-${template.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{template.name}</p>
                        <p className="text-xs text-muted-foreground">Summary Template</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPdf(template.id)}
                        disabled={downloadingTemplateId !== null}
                        data-testid={`button-download-${template.id}`}
                      >
                        {downloadingTemplateId === template.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowSigningModal(true)}
                        className="bg-gradient-to-r from-primary to-primary"
                        data-testid={`button-sign-${template.id}`}
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Send
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {loiTemplates.map((template: any) => (
              <Card key={template.id} className="hover:border-primary/30 transition-colors" data-testid={`card-template-${template.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <FileSignature className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{template.name}</p>
                        <p className="text-xs text-muted-foreground">Letter of Intent</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPdf(template.id)}
                        disabled={downloadingTemplateId !== null}
                        data-testid={`button-download-${template.id}`}
                      >
                        {downloadingTemplateId === template.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowSigningModal(true)}
                        className="bg-gradient-to-r from-primary to-primary"
                        data-testid={`button-sign-${template.id}`}
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Send
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/quotes')}
          className="text-muted-foreground"
          data-testid="button-skip-to-quotes"
        >
          Skip — Go to Quotes
        </Button>
      </div>

      {quote && (
        <DocumentSigningModal
          open={showSigningModal}
          onClose={() => setShowSigningModal(false)}
          quote={quote}
        />
      )}
    </div>
  );
}
