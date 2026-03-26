import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import {
  Search, Building2, DollarSign, MapPin, TrendingUp, Eye, AlertTriangle,
  CheckCircle2, XCircle, Clock, ArrowRight, RefreshCw, Landmark, ChevronRight,
} from "lucide-react";
import { FundManagementContent } from "./fund-management";

type IntakeDeal = {
  id: number;
  dealName: string;
  loanAmount: number;
  assetType: string;
  propertyAddress: string;
  propertyState: string;
  ltvPct: number;
  dscr: number;
  borrowerName: string;
  brokerName: string;
  brokerEmail: string;
  status: string;
  submittedAt: string;
  createdAt: string;
  analysis?: any;
};

function statusBadge(status: string) {
  const config: Record<string, { color: string; label: string }> = {
    draft: { color: "bg-slate-500/20 text-slate-400 border-slate-500/30", label: "Draft" },
    submitted: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Submitted" },
    analyzed: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: "Analyzed" },
    under_review: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Under Review" },
    approved: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "Approved" },
    conditional: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Conditional" },
    rejected: { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "Rejected" },
    transferred: { color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", label: "Transferred" },
    no_match: { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "No Match" },
  };
  const c = config[status] || { color: "bg-slate-500/20 text-slate-400", label: status };
  return <Badge className={`text-xs ${c.color}`}>{c.label}</Badge>;
}

export default function CommercialPipelinePage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const urlParams = new URLSearchParams(window.location.search);
  const initialShowFunds = urlParams.get("tab") === "funds";
  const [showFunds, setShowFunds] = useState(initialShowFunds);
  const [activeTab, setActiveTab] = useState("new");

  const handleShowFunds = () => {
    setShowFunds(true);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "funds");
    window.history.replaceState({}, "", url.toString());
  };

  const handleBackToDeals = () => {
    setShowFunds(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("tab");
    window.history.replaceState({}, "", url.toString());
  };

  const { data: deals = [], isLoading } = useQuery<IntakeDeal[]>({
    queryKey: ["/api/commercial/deals", activeTab],
    queryFn: async () => {
      const res = await fetch(`/api/commercial/deals?status=${activeTab}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deals");
      return res.json();
    },
    enabled: !showFunds,
  });

  const { data: summary } = useQuery({
    queryKey: ["/api/commercial/portfolio-summary"],
  });

  const { data: fundsList = [] } = useQuery<any[]>({
    queryKey: ["/api/commercial/funds"],
  });

  const filtered = deals.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.dealName?.toLowerCase().includes(q) ||
      d.borrowerName?.toLowerCase().includes(q) ||
      d.brokerName?.toLowerCase().includes(q) ||
      d.propertyAddress?.toLowerCase().includes(q)
    );
  });

  const intakeStats = (summary as any)?.intake || {};
  const activeFunds = fundsList.filter((f: any) => f.isActive).length;

  if (showFunds) {
    return (
      <div className="p-6 space-y-6" data-testid="commercial-pipeline-page">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBackToDeals} className="text-slate-400 hover:text-white" data-testid="back-to-deals">
            <ArrowRight size={16} className="mr-1 rotate-180" /> Back to Pipeline
          </Button>
        </div>
        <FundManagementContent />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="commercial-pipeline-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white" data-testid="page-title">Commercial Pipeline</h1>
          <p className="text-sm text-slate-400 mt-1">Review and manage incoming commercial deal submissions</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "New", value: (intakeStats.submitted || 0) + (intakeStats.analyzed || 0) + (intakeStats.no_match || 0), icon: Clock },
          { label: "Under Review", value: intakeStats.under_review || 0, icon: Eye },
          { label: "Approved", value: intakeStats.approved || 0, icon: CheckCircle2 },
          { label: "Conditional", value: intakeStats.conditional || 0, icon: AlertTriangle },
          { label: "Rejected", value: intakeStats.rejected || 0, icon: XCircle },
          { label: "Transferred", value: intakeStats.transferred || 0, icon: ArrowRight },
        ].map(stat => (
          <Card key={stat.label} className="bg-[#1a2038] border-slate-700/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <stat.icon size={14} className="text-slate-400" />
                <span className="text-xs text-slate-400">{stat.label}</span>
              </div>
              <p className="text-xl font-semibold text-white mt-1" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search deals..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#1a2038] border-slate-700 text-white text-sm"
              data-testid="search-deals"
            />
          </div>

          <TabsList className="bg-[#1a2038] border border-slate-700/50">
            <TabsTrigger value="new" className="text-xs" data-testid="tab-new">New Submissions</TabsTrigger>
            <TabsTrigger value="review" className="text-xs" data-testid="tab-review">Under Review</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs" data-testid="tab-completed">Completed</TabsTrigger>
          </TabsList>

          <Card
            className="bg-gradient-to-br from-[#1a2038] to-[#1e2545] border-blue-500/30 hover:border-blue-400/50 transition-all cursor-pointer"
            onClick={handleShowFunds}
            data-testid="funds-card"
          >
            <CardContent className="px-4 py-2 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Landmark size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{fundsList.length} Funds</p>
                <p className="text-[10px] text-blue-400">{activeFunds} active</p>
              </div>
              <ChevronRight size={14} className="text-slate-500" />
            </CardContent>
          </Card>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={20} className="animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="bg-[#1a2038] border-slate-700/50">
              <CardContent className="p-12 text-center">
                <Building2 size={40} className="mx-auto text-slate-500 mb-3" />
                <p className="text-slate-400">No deals in this category</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(deal => (
                <Card
                  key={deal.id}
                  className="bg-[#1a2038] border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/commercial-pipeline/${deal.id}`)}
                  data-testid={`deal-card-${deal.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium text-white truncate" data-testid={`deal-name-${deal.id}`}>
                            {deal.dealName || `Deal #${deal.id}`}
                          </h3>
                          {statusBadge(deal.status)}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                          {deal.loanAmount && (
                            <span className="flex items-center gap-1">
                              <DollarSign size={12} />
                              ${(deal.loanAmount / 1000000).toFixed(1)}M
                            </span>
                          )}
                          {deal.assetType && (
                            <span className="flex items-center gap-1">
                              <Building2 size={12} />
                              {deal.assetType}
                            </span>
                          )}
                          {deal.propertyState && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {deal.propertyState}
                            </span>
                          )}
                          {deal.ltvPct != null && (
                            <span className="flex items-center gap-1">
                              <TrendingUp size={12} />
                              LTV {deal.ltvPct}%
                            </span>
                          )}
                        </div>
                        <div className="flex gap-x-4 text-xs text-slate-500 mt-2">
                          {deal.brokerName && <span>Broker: {deal.brokerName}</span>}
                          {deal.borrowerName && <span>Borrower: {deal.borrowerName}</span>}
                          <span>{deal.submittedAt ? new Date(deal.submittedAt).toLocaleDateString() : new Date(deal.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-white"
                          onClick={e => { e.stopPropagation(); navigate(`/admin/commercial-pipeline/${deal.id}`); }}
                          data-testid={`view-deal-${deal.id}`}
                        >
                          <Eye size={14} className="mr-1" /> View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
