import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, RefreshCw, Inbox } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DealInboxCard, type DealInboxItem } from "@/components/DealInboxCard";
import { useToast } from "@/hooks/use-toast";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "email_intake", label: "Email Received" },
  { value: "ai_processing_complete", label: "Docs Requested" },
  { value: "docs_received", label: "Docs Received" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "DECLINED", label: "Declined" },
];

export default function DealInboxPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading, isError, refetch, isFetching } = useQuery<DealInboxItem[]>({
    queryKey: ["/api/email/deal-inbox"],
    queryFn: () => apiRequest("GET", "/api/email/deal-inbox").then(r => r.json()),
    refetchInterval: 30_000,
  });

  const deals = (data ?? []).filter(d => {
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    const matchesSearch =
      !search ||
      d.brokerOrDeveloperName?.toLowerCase().includes(search.toLowerCase()) ||
      d.email?.toLowerCase().includes(search.toLowerCase()) ||
      d.propertyName?.toLowerCase().includes(search.toLowerCase()) ||
      d.propertyAddress?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["/api/email/deal-inbox"] });
    refetch();
    toast({ title: "Refreshed", description: "Deal inbox updated." });
  }

  return (
    <div className="flex flex-col h-full p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deal Inbox</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Email-sourced deal submissions processed by the AI intake agent
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by broker, property, or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center flex-1 py-20 text-center space-y-3">
          <p className="text-destructive font-medium">Failed to load deal inbox.</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Retry
          </Button>
        </div>
      ) : deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-20 text-center space-y-3 text-muted-foreground">
          <Inbox className="w-12 h-12 opacity-30" />
          <p className="font-medium">No deals found</p>
          <p className="text-sm">
            {search || statusFilter !== "all"
              ? "Try adjusting the filters."
              : "Pin email threads to the pipeline to start processing deals here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {deals.map(d => (
            <DealInboxCard key={d.id} deal={d} />
          ))}
        </div>
      )}
    </div>
  );
}
