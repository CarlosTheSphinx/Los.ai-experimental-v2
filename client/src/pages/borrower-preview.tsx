import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Building2, Loader2, FolderOpen } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BorrowerPortal from "@/pages/borrower-portal";

interface PreviewDeal {
  id: number;
  dealName: string;
  propertyAddress: string | null;
  loanAmount: string | null;
  status: string;
  loanNumber: string | null;
  borrowerPortalToken: string;
  borrowerName: string | null;
}

export default function BorrowerPreview() {
  const [selectedToken, setSelectedToken] = useState<string>("");

  const { data, isLoading, error } = useQuery<{ deals: PreviewDeal[] }>({
    queryKey: ["/api/admin/portal-preview-deals"],
  });

  const deals = data?.deals || [];
  const selectedDeal = deals.find(d => d.borrowerPortalToken === selectedToken);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-blue-600/10 border-b border-blue-600/20 px-4 py-2.5 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600/15 border border-blue-600/25">
            <Eye className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-[13px] font-semibold text-blue-600 uppercase tracking-wider" data-testid="text-preview-mode">Preview Mode</span>
          </div>
          <span className="text-[14px] text-blue-600/80">
            This is what your borrowers see when they access their portal.
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[13px] text-muted-foreground">Viewing as:</span>
            <Select value={selectedToken} onValueChange={setSelectedToken}>
              <SelectTrigger className="w-[280px] h-8 text-xs" data-testid="select-preview-deal">
                <SelectValue placeholder="Select a deal to preview..." />
              </SelectTrigger>
              <SelectContent>
                {deals.map((deal) => (
                  <SelectItem key={deal.borrowerPortalToken} value={deal.borrowerPortalToken} data-testid={`option-deal-${deal.id}`}>
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {deal.loanNumber ? `${deal.loanNumber} — ` : ""}{deal.borrowerName || deal.dealName}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3 max-w-md px-4">
            <FolderOpen className="h-12 w-12 text-destructive/50 mx-auto" />
            <h3 className="text-lg font-medium">Failed to Load Deals</h3>
            <p className="text-sm text-muted-foreground">
              Could not fetch deals for preview. Please try refreshing the page.
            </p>
          </div>
        </div>
      )}

      {!isLoading && !error && deals.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3 max-w-md px-4">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <h3 className="text-lg font-medium" data-testid="text-no-deals">No Deals Available</h3>
            <p className="text-sm text-muted-foreground">
              There are no deals with borrower portal access yet. Once a deal is created with a borrower portal token, you'll be able to preview the borrower's experience here.
            </p>
          </div>
        </div>
      )}

      {!isLoading && !error && deals.length > 0 && !selectedToken && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3 max-w-md px-4">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <h3 className="text-lg font-medium" data-testid="text-select-deal">Select a Deal</h3>
            <p className="text-sm text-muted-foreground">
              Choose a deal from the dropdown above to preview the borrower portal experience.
            </p>
          </div>
        </div>
      )}

      {selectedToken && (
        <div className="flex-1" data-testid="portal-preview-container">
          <BorrowerPortal key={selectedToken} token={selectedToken} isPreview={true} />
        </div>
      )}
    </div>
  );
}
