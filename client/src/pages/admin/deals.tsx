import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  DollarSign,
  TrendingUp,
  Wallet,
  Search,
  Building,
  User,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Deal {
  id: number;
  userId: number;
  customerFirstName: string;
  customerLastName: string;
  propertyAddress: string;
  loanData: {
    loanAmount: number;
    propertyValue: number;
    loanType: string;
    loanPurpose: string;
    propertyType: string;
  };
  interestRate: string;
  pointsCharged: number;
  pointsAmount: number;
  tpoPremiumAmount: number;
  totalRevenue: number;
  commission: number;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
}

interface DealsStats {
  totalDeals: number;
  totalLoanAmount: number;
  totalRevenue: number;
  totalCommission: number;
  loanTypeStats: Record<string, { count: number; amount: number }>;
  monthlyStats: { month: string; count: number; amount: number }[];
}

interface DealsResponse {
  deals: Deal[];
  stats: DealsStats;
}

function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold">{value}</span>
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoanTypeTracker({ loanTypeStats }: { loanTypeStats: Record<string, { count: number; amount: number }> }) {
  const types = Object.entries(loanTypeStats);
  const total = types.reduce((sum, [_, data]) => sum + data.count, 0);
  
  const typeColors: Record<string, string> = {
    "DSCR": "bg-blue-500",
    "Fix and Flip": "bg-orange-500",
    "Ground Up": "bg-green-500",
    "Bridge": "bg-purple-500",
    "Unknown": "bg-gray-400",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pipeline by Loan Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {types.map(([type, data], index) => (
            <div key={type} className="flex flex-col items-center min-w-[100px]">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{data.count}</span>
              </div>
              <span className="text-xs text-muted-foreground text-center">{type}</span>
              <div
                className={cn(
                  "h-2 w-full rounded-full mt-2",
                  typeColors[type] || "bg-gray-400"
                )}
                style={{ opacity: data.count > 0 ? 1 : 0.2 }}
              />
              <span className="text-xs text-muted-foreground mt-1">
                ${(data.amount / 1000000).toFixed(1)}M
              </span>
              {index < types.length - 1 && (
                <span className="hidden md:block text-muted-foreground absolute right-0">→</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(amount: number) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

export default function AdminDeals() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery<DealsResponse>({
    queryKey: ["/api/admin/deals", searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      const res = await fetch(`/api/admin/deals?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch deals");
      return res.json();
    },
  });

  const stats = data?.stats;
  const deals = data?.deals || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Deals Dashboard</h1>
        <p className="text-muted-foreground">Overview of all deals submitted by users</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Deals"
            value={stats?.totalDeals || 0}
            subtitle="All time submissions"
            icon={FileText}
          />
          <StatsCard
            title="Total Loan Volume"
            value={formatCurrency(stats?.totalLoanAmount || 0)}
            subtitle="Cumulative loan amount"
            icon={DollarSign}
          />
          <StatsCard
            title="Total Revenue"
            value={formatCurrency(stats?.totalRevenue || 0)}
            subtitle="Points + TPO Premium"
            icon={TrendingUp}
          />
          <StatsCard
            title="Total Commission"
            value={formatCurrency(stats?.totalCommission || 0)}
            subtitle="30% of revenue"
            icon={Wallet}
          />
        </div>
      )}

      {stats?.loanTypeStats && Object.keys(stats.loanTypeStats).length > 0 && (
        <LoanTypeTracker loanTypeStats={stats.loanTypeStats} />
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>All Deals</CardTitle>
            <CardDescription>Quotes submitted by all users</CardDescription>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer, address, or user..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-deals"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No deals found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Try adjusting your search" : "No quotes have been submitted yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Loan Type</TableHead>
                    <TableHead className="text-right">Loan Amount</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => (
                    <TableRow key={deal.id} data-testid={`row-deal-${deal.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {deal.customerFirstName} {deal.customerLastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="max-w-[200px] truncate">{deal.propertyAddress}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {deal.loanData?.loanType || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(deal.loanData?.loanAmount || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {deal.interestRate}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatCurrency(deal.totalRevenue || 0)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {deal.userName || deal.userEmail || "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {deal.createdAt
                          ? new Date(deal.createdAt).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
