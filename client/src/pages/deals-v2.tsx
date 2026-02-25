import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DollarSign, FolderOpen, Clock, CheckCircle2, Search, ChevronRight, Plus,
  Building2, User, FileText, ExternalLink, Copy, MoreHorizontal
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SummaryCard, SummaryStrip } from "@/components/ui/phase1/summary-card";
import { StatusBadge } from "@/components/ui/phase1/status-badge";
import { EmptyState } from "@/components/ui/phase1/empty-state";
import { ExpandableRow } from "@/components/ui/phase1/expandable-row";
import { Skeleton } from "@/components/ui/skeleton";

interface Deal {
  id: number;
  dealNumber?: string;
  borrowerName?: string;
  borrowerEmail?: string;
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  loanAmount?: number;
  programName?: string;
  loanType?: string;
  status?: string;
  stage?: string;
  ltv?: number;
  interestRate?: number;
  documents?: any[];
  tasks?: any[];
  createdAt?: string;
  updatedAt?: string;
  completionPercentage?: number;
}

function formatCurrency(amount: number | undefined): string {
  if (!amount) return "$0";
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function getStatusVariant(status?: string): "active" | "pending" | "closed" | "inactive" {
  switch (status?.toLowerCase()) {
    case "active":
    case "in_progress":
      return "active";
    case "pending":
    case "submitted":
    case "review":
      return "pending";
    case "closed":
    case "funded":
    case "completed":
      return "closed";
    default:
      return "inactive";
  }
}

export default function DealsV2() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: dealsData, isLoading } = useQuery<{ projects: Deal[] }>({
    queryKey: ["/api/deals"],
    queryFn: async () => {
      const res = await fetch("/api/deals", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deals");
      return res.json();
    },
    refetchInterval: 15000,
  });
  const deals = dealsData?.projects ?? [];

  // Compute summary metrics
  const metrics = useMemo(() => {
    const total = deals.length;
    const active = deals.filter((d) => ["active", "in_progress"].includes(d.status?.toLowerCase() || "")).length;
    const pending = deals.filter((d) => ["pending", "submitted", "review"].includes(d.status?.toLowerCase() || "")).length;
    const closed = deals.filter((d) => ["closed", "funded", "completed"].includes(d.status?.toLowerCase() || "")).length;
    const totalValue = deals.reduce((sum, d) => sum + (d.loanAmount || 0), 0);
    return { total, active, pending, closed, totalValue };
  }, [deals]);

  // Filter deals
  const filteredDeals = useMemo(() => {
    let result = [...deals];

    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.borrowerName?.toLowerCase().includes(q) ||
          d.dealNumber?.toLowerCase().includes(q) ||
          d.propertyAddress?.toLowerCase().includes(q) ||
          d.programName?.toLowerCase().includes(q)
      );
    }

    // Summary card filter
    if (activeFilter === "active") result = result.filter((d) => ["active", "in_progress"].includes(d.status?.toLowerCase() || ""));
    if (activeFilter === "pending") result = result.filter((d) => ["pending", "submitted", "review"].includes(d.status?.toLowerCase() || ""));
    if (activeFilter === "closed") result = result.filter((d) => ["closed", "funded", "completed"].includes(d.status?.toLowerCase() || ""));

    // Type filter
    if (typeFilter !== "all") result = result.filter((d) => d.loanType?.toLowerCase() === typeFilter.toLowerCase());

    // Status filter
    if (statusFilter !== "all") result = result.filter((d) => d.status?.toLowerCase() === statusFilter.toLowerCase());

    return result;
  }, [deals, searchQuery, activeFilter, typeFilter, statusFilter]);

  const isAdmin = user?.role && ["admin", "staff", "super_admin"].includes(user.role);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold">Pipeline</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Track and manage your loan deals.
          </p>
        </div>
        {isAdmin && (
          <Link href="/deals/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Deal
            </Button>
          </Link>
        )}
      </div>

      {/* Summary Strip — Level 1 */}
      <SummaryStrip>
        <SummaryCard
          icon={FolderOpen}
          label="Total Deals"
          value={metrics.total}
          subtitle={formatCurrency(metrics.totalValue) + " pipeline value"}
          isActive={activeFilter === "all"}
          onClick={() => setActiveFilter("all")}
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Active"
          value={metrics.active}
          subtitle="In progress"
          isActive={activeFilter === "active"}
          onClick={() => setActiveFilter("active")}
        />
        <SummaryCard
          icon={Clock}
          label="Pending Review"
          value={metrics.pending}
          subtitle="Awaiting action"
          isActive={activeFilter === "pending"}
          onClick={() => setActiveFilter("pending")}
        />
        <SummaryCard
          icon={DollarSign}
          label="Closed"
          value={metrics.closed}
          subtitle="Funded deals"
          isActive={activeFilter === "closed"}
          onClick={() => setActiveFilter("closed")}
        />
      </SummaryStrip>

      {/* Table Card */}
      <div className="bg-card border rounded-[10px] shadow-sm overflow-hidden">
        {/* Search & Filters — Level 2 */}
        <div className="px-4 py-3 border-b flex items-center gap-3">
          <div className="relative flex-1 max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-[13px]"
            />
          </div>
          <select
            className="h-8 px-3 text-[13px] border rounded-md bg-white text-foreground"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Programs</option>
            <option value="dscr">DSCR</option>
            <option value="rtl">RTL</option>
            <option value="bridge">Bridge</option>
          </select>
          <select
            className="h-8 px-3 text-[13px] border rounded-md bg-white text-foreground"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredDeals.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No deals found"
            description={searchQuery ? "Try adjusting your search or filters." : "Create your first deal to get started."}
            actionLabel={isAdmin ? "+ New Deal" : undefined}
            onAction={isAdmin ? () => (window.location.href = "/deals/new") : undefined}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b-2">
                <th className="w-8" />
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Loan #
                </th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Borrower
                </th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Property
                </th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Program
                </th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Amount
                </th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map((deal) => (
                <ExpandableRow
                  key={deal.id}
                  columns={7}
                  isExpanded={expandedId === deal.id}
                  onToggle={(expanded) => setExpandedId(expanded ? deal.id : null)}
                  summary={
                    <>
                      <td className="px-3 py-3 text-[13px] font-medium text-primary">
                        {deal.dealNumber || `#${deal.id}`}
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-[13px] font-medium">{deal.borrowerName || "—"}</div>
                        <div className="text-[11px] text-muted-foreground">{deal.borrowerEmail || ""}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-[13px]">{deal.propertyAddress || "—"}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {[deal.propertyCity, deal.propertyState].filter(Boolean).join(", ")}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" className="text-[11px] font-medium">
                          {deal.programName || deal.loanType || "—"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-[13px] font-semibold">
                        {formatCurrency(deal.loanAmount)}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge variant={getStatusVariant(deal.status)} label={deal.status || "Unknown"} />
                      </td>
                      <td className="px-3 py-3 w-[120px]">
                        <div className="flex items-center gap-2">
                          <Progress value={deal.completionPercentage || 0} className="h-1.5 flex-1" />
                          <span className="text-[11px] text-muted-foreground w-8 text-right">
                            {deal.completionPercentage || 0}%
                          </span>
                        </div>
                      </td>
                    </>
                  }
                  details={
                    <div className="grid grid-cols-3 gap-6">
                      {/* Col 1: Key Metrics */}
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase text-muted-foreground mb-2">Key Metrics</h4>
                        <div className="grid grid-cols-2 gap-y-2 text-[12px]">
                          <span className="text-muted-foreground">Stage</span>
                          <span className="font-medium">{deal.stage || "—"}</span>
                          <span className="text-muted-foreground">
                            <Tooltip>
                              <TooltipTrigger className="border-b border-dashed border-muted-foreground cursor-help">LTV</TooltipTrigger>
                              <TooltipContent>Loan-to-Value ratio</TooltipContent>
                            </Tooltip>
                          </span>
                          <span className="font-medium">{deal.ltv ? `${deal.ltv}%` : "—"}</span>
                          <span className="text-muted-foreground">Rate</span>
                          <span className="font-medium">{deal.interestRate ? `${deal.interestRate}%` : "—"}</span>
                        </div>
                      </div>
                      {/* Col 2: Property */}
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase text-muted-foreground mb-2">Property</h4>
                        <div className="text-[12px]">
                          <p className="font-medium">{deal.propertyAddress || "No address"}</p>
                          <p className="text-muted-foreground">
                            {[deal.propertyCity, deal.propertyState].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      </div>
                      {/* Col 3: Quick Actions */}
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase text-muted-foreground mb-2">Quick Actions</h4>
                        <div className="flex flex-col gap-1.5">
                          <Link href={isAdmin ? `/admin/deals/${deal.id}` : `/deals/${deal.id}`}>
                            <Button variant="outline" size="sm" className="w-full justify-start text-[12px]">
                              <ExternalLink className="h-3 w-3 mr-2" /> View Deal
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm" className="w-full justify-start text-[12px]">
                            <FileText className="h-3 w-3 mr-2" /> Documents ({deal.documents?.length || 0})
                          </Button>
                        </div>
                      </div>
                    </div>
                  }
                />
              ))}
            </tbody>
          </table>
        )}

        {/* Footer */}
        {filteredDeals.length > 0 && (
          <div className="px-4 py-3 border-t text-[12px] text-muted-foreground flex items-center justify-between">
            <span>
              Showing {filteredDeals.length} of {deals.length} deals
            </span>
            <span className="text-[11px]">⌘K to search</span>
          </div>
        )}
      </div>
    </div>
  );
}
