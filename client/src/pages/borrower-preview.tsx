import { useQuery } from "@tanstack/react-query";
import { Eye, Loader2, FolderOpen } from "lucide-react";
import BorrowerPortal from "@/pages/borrower-portal";

interface PreviewDeal {
  id: number;
  dealName: string;
  borrowerPortalToken: string;
  borrowerName: string | null;
}

export default function BorrowerPreview() {
  const { data, isLoading, error } = useQuery<{ deals: PreviewDeal[] }>({
    queryKey: ["/api/admin/portal-preview-deals"],
  });

  const deals = data?.deals || [];
  const firstToken = deals[0]?.borrowerPortalToken;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-blue-600/10 border-b border-blue-600/20 px-4 py-2.5 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600/15 border border-blue-600/25">
            <Eye className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-[13px] font-semibold text-blue-600 uppercase tracking-wider" data-testid="text-preview-mode">Preview Mode</span>
          </div>
          <span className="text-[14px] text-blue-600/80">
            This is what your borrowers see when they access their portal.
          </span>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (error || deals.length === 0) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3 max-w-md px-4">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <h3 className="text-lg font-medium" data-testid="text-no-deals">No Deals Available</h3>
            <p className="text-sm text-muted-foreground">
              There are no deals with borrower portal access yet. Create a deal first to preview the borrower experience.
            </p>
          </div>
        </div>
      )}

      {firstToken && (
        <div className="flex-1" data-testid="portal-preview-container">
          <BorrowerPortal key={firstToken} token={firstToken} isPreview={true} />
        </div>
      )}
    </div>
  );
}
