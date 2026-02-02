import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  Plus,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Deal {
  id: number;
  userId: number;
  customerFirstName: string;
  customerLastName: string;
  propertyAddress: string;
  loanData: {
    loanAmount: number;
    propertyValue: number;
    ltv?: string;
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
  stage: string;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
}

interface StageInfo {
  stage: string;
  label: string;
  count: number;
}

interface DealsStats {
  totalDeals: number;
  totalLoanAmount: number;
  totalRevenue: number;
  totalCommission: number;
  loanTypeStats: Record<string, { count: number; amount: number }>;
  stageStats: StageInfo[];
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

function PipelineByStage({ stageStats }: { stageStats: StageInfo[] }) {
  const stageColors: Record<string, string> = {
    "initial-review": "bg-yellow-500",
    "term-sheet": "bg-blue-400",
    "onboarding": "bg-purple-400",
    "processing": "bg-red-500",
    "underwriting": "bg-indigo-500",
    "closing": "bg-teal-500",
    "closed": "bg-green-500",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Pipeline by Stage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
          {stageStats.map((stageInfo, index) => (
            <div key={stageInfo.stage} className="flex flex-col items-center flex-1 min-w-[80px]">
              <span className="text-2xl font-bold">{stageInfo.count}</span>
              <span className="text-xs text-muted-foreground text-center whitespace-nowrap">
                {stageInfo.label}
              </span>
              <div className="flex items-center w-full mt-2 gap-1">
                <div
                  className={cn(
                    "h-2 flex-1 rounded-full",
                    stageColors[stageInfo.stage] || "bg-gray-400"
                  )}
                  style={{ opacity: stageInfo.count > 0 ? 1 : 0.3 }}
                />
                {index < stageStats.length - 1 && (
                  <span className="text-muted-foreground text-xs">→</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function getStageColor(stage: string): string {
  const colors: Record<string, string> = {
    "initial-review": "bg-yellow-100 text-yellow-800",
    "term-sheet": "bg-blue-100 text-blue-800",
    "onboarding": "bg-purple-100 text-purple-800",
    "processing": "bg-red-100 text-red-800",
    "underwriting": "bg-indigo-100 text-indigo-800",
    "closing": "bg-teal-100 text-teal-800",
    "closed": "bg-green-100 text-green-800",
  };
  return colors[stage] || "bg-gray-100 text-gray-800";
}

function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    "initial-review": "Initial Review",
    "term-sheet": "Term Sheet",
    "onboarding": "Onboarding",
    "processing": "Processing",
    "underwriting": "Underwriting",
    "closing": "Closing",
    "closed": "Closed",
  };
  return labels[stage] || stage;
}

function formatCurrency(amount: number) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

export default function AdminDeals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const [newDeal, setNewDeal] = useState({
    customerFirstName: "",
    customerLastName: "",
    propertyAddress: "",
    loanAmount: "",
    propertyValue: "",
    interestRate: "",
    loanType: "fix-and-flip",
    propertyType: "single-family",
    stage: "initial-review",
  });

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

  const createDealMutation = useMutation({
    mutationFn: async (dealData: typeof newDeal) => {
      return apiRequest("POST", "/api/admin/deals", dealData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals"] });
      setIsAddDialogOpen(false);
      setNewDeal({
        customerFirstName: "",
        customerLastName: "",
        propertyAddress: "",
        loanAmount: "",
        propertyValue: "",
        interestRate: "",
        loanType: "fix-and-flip",
        propertyType: "single-family",
        stage: "initial-review",
      });
      toast({
        title: "Deal created",
        description: "The deal has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create deal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateDeal = () => {
    if (!newDeal.customerFirstName || !newDeal.customerLastName || !newDeal.propertyAddress || !newDeal.loanAmount) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createDealMutation.mutate(newDeal);
  };

  const stats = data?.stats;
  const deals = data?.deals || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Deals Dashboard</h1>
          <p className="text-muted-foreground">Overview of all deals submitted by users</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-deal">
              <Plus className="h-4 w-4 mr-2" />
              Add Deal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Deal</DialogTitle>
              <DialogDescription>
                Manually add a new deal to the pipeline
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={newDeal.customerFirstName}
                    onChange={(e) => setNewDeal({ ...newDeal, customerFirstName: e.target.value })}
                    placeholder="John"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={newDeal.customerLastName}
                    onChange={(e) => setNewDeal({ ...newDeal, customerLastName: e.target.value })}
                    placeholder="Smith"
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Property Address *</Label>
                <Input
                  id="address"
                  value={newDeal.propertyAddress}
                  onChange={(e) => setNewDeal({ ...newDeal, propertyAddress: e.target.value })}
                  placeholder="123 Main Street, Los Angeles, CA 90001"
                  data-testid="input-property-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loanAmount">Loan Amount *</Label>
                  <Input
                    id="loanAmount"
                    type="number"
                    value={newDeal.loanAmount}
                    onChange={(e) => setNewDeal({ ...newDeal, loanAmount: e.target.value })}
                    placeholder="680000"
                    data-testid="input-loan-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertyValue">Property Value</Label>
                  <Input
                    id="propertyValue"
                    type="number"
                    value={newDeal.propertyValue}
                    onChange={(e) => setNewDeal({ ...newDeal, propertyValue: e.target.value })}
                    placeholder="850000"
                    data-testid="input-property-value"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Interest Rate</Label>
                  <Input
                    id="interestRate"
                    value={newDeal.interestRate}
                    onChange={(e) => setNewDeal({ ...newDeal, interestRate: e.target.value })}
                    placeholder="11.5%"
                    data-testid="input-interest-rate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loanType">Loan Type</Label>
                  <Select
                    value={newDeal.loanType}
                    onValueChange={(value) => setNewDeal({ ...newDeal, loanType: value })}
                  >
                    <SelectTrigger data-testid="select-loan-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fix-and-flip">Fix and Flip</SelectItem>
                      <SelectItem value="bridge">Bridge</SelectItem>
                      <SelectItem value="ground-up">Ground Up</SelectItem>
                      <SelectItem value="dscr">DSCR</SelectItem>
                      <SelectItem value="rental">Rental</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyType">Property Type</Label>
                  <Select
                    value={newDeal.propertyType}
                    onValueChange={(value) => setNewDeal({ ...newDeal, propertyType: value })}
                  >
                    <SelectTrigger data-testid="select-property-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single-family">Single Family</SelectItem>
                      <SelectItem value="multi-family">Multi-Family</SelectItem>
                      <SelectItem value="condo">Condo</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stage">Initial Stage</Label>
                  <Select
                    value={newDeal.stage}
                    onValueChange={(value) => setNewDeal({ ...newDeal, stage: value })}
                  >
                    <SelectTrigger data-testid="select-stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="initial-review">Initial Review</SelectItem>
                      <SelectItem value="term-sheet">Term Sheet</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="underwriting">Underwriting</SelectItem>
                      <SelectItem value="closing">Closing</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateDeal}
                disabled={createDealMutation.isPending}
                data-testid="button-create-deal"
              >
                {createDealMutation.isPending ? "Creating..." : "Create Deal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

      {stats?.stageStats && stats.stageStats.length > 0 && (
        <PipelineByStage stageStats={stats.stageStats} />
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
                    <TableHead>Borrower</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead className="text-right">Loan Amount</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">LTV</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Stage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => (
                    <TableRow 
                      key={deal.id} 
                      data-testid={`row-deal-${deal.id}`}
                      className="cursor-pointer hover-elevate"
                    >
                      <TableCell>
                        <Link href={`/admin/deals/${deal.id}`} className="block">
                          <span className="font-medium">
                            {deal.customerFirstName} {deal.customerLastName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/deals/${deal.id}`} className="block">
                          <div className="flex flex-col">
                            <span className="max-w-[180px] truncate">{deal.propertyAddress?.split(',')[0]}</span>
                            <span className="text-xs text-muted-foreground">
                              {deal.propertyAddress?.split(',').slice(1).join(',').trim()}
                            </span>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <Link href={`/admin/deals/${deal.id}`} className="block">
                          {formatCurrency(deal.loanData?.loanAmount || 0)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/deals/${deal.id}`} className="block">
                          {deal.interestRate}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/deals/${deal.id}`} className="block">
                          {deal.loanData?.ltv || "N/A"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/deals/${deal.id}`} className="block">
                          <Badge variant="outline">
                            {deal.loanData?.loanType || "N/A"}
                          </Badge>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/deals/${deal.id}`} className="block">
                          <Badge className={cn("text-xs", getStageColor(deal.stage))}>
                            {getStageLabel(deal.stage)}
                          </Badge>
                        </Link>
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
