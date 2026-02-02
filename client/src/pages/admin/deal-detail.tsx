import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  DollarSign,
  Building,
  User,
  Calendar,
  FileText,
  CheckSquare,
  Mail,
  Pencil,
} from "lucide-react";
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
    ltv?: string;
    loanType: string;
    loanPurpose: string;
    propertyType: string;
    loanTerm?: string;
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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function parseAddress(address: string) {
  const parts = address.split(",").map((p) => p.trim());
  const street = parts[0] || "";
  const city = parts[1] || "";
  const stateZip = parts[2] || "";
  const [state, zip] = stateZip.split(" ").filter(Boolean);
  return { street, city, state: state || "", zip: zip || "" };
}

export default function AdminDealDetail() {
  const [, params] = useRoute("/admin/deals/:id");
  const dealId = params?.id;

  const { data, isLoading, error } = useQuery<{ deal: Deal }>({
    queryKey: [`/api/admin/deals/${dealId}`],
    enabled: !!dealId,
  });

  const deal = data?.deal;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-96" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="p-6">
        <Link href="/admin/deals">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Deal not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const address = parseAddress(deal.propertyAddress);
  const borrowerName = `${deal.customerFirstName} ${deal.customerLastName}`;
  const borrowerEmail = `${deal.customerFirstName.toLowerCase()}.${deal.customerLastName.toLowerCase()}@email.com`;

  return (
    <div className="p-6 space-y-6">
      <Link href="/admin/deals">
        <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" data-testid="text-borrower-name">{borrowerName}</h1>
            <Badge className={cn("text-sm", getStageColor(deal.stage))} data-testid="badge-deal-stage">
              {getStageLabel(deal.stage)}
            </Badge>
          </div>
          <p className="text-muted-foreground flex items-center gap-1 mt-1" data-testid="text-property-address">
            <Building className="h-4 w-4" />
            {deal.propertyAddress}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-edit-loan">
            <Pencil className="h-4 w-4 mr-2" />
            Edit Loan
          </Button>
          <Button data-testid="button-contact-borrower">
            <Mail className="h-4 w-4 mr-2" />
            Contact Borrower
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full" data-testid="tabs-deal-detail">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="overview" className="flex items-center gap-2" data-testid="tab-overview">
            <DollarSign className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2" data-testid="tab-documents">
            <FileText className="h-4 w-4" />
            Documents
            <Badge variant="secondary" className="ml-1 text-xs" data-testid="badge-documents-count">0</Badge>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2" data-testid="tab-tasks">
            <CheckSquare className="h-4 w-4" />
            Tasks
            <Badge variant="secondary" className="ml-1 text-xs" data-testid="badge-tasks-count">0</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="h-5 w-5" />
                    Loan Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Loan Amount</p>
                      <p className="text-xl font-bold" data-testid="text-loan-amount">{formatCurrency(deal.loanData?.loanAmount || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Interest Rate</p>
                      <p className="text-xl font-bold" data-testid="text-interest-rate">{deal.interestRate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Property Value</p>
                      <p className="text-xl font-bold" data-testid="text-property-value">{formatCurrency(deal.loanData?.propertyValue || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Loan Term</p>
                      <p className="text-xl font-bold" data-testid="text-loan-term">{deal.loanData?.loanTerm || "12 months"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Loan-to-Value (LTV)</p>
                      <p className="text-xl font-bold" data-testid="text-ltv">{deal.loanData?.ltv || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Loan Type</p>
                      <p className="text-xl font-bold" data-testid="text-loan-type">{deal.loanData?.loanType || "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building className="h-5 w-5" />
                    Property Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{address.street}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">City</p>
                      <p className="font-medium">{address.city}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">State</p>
                      <p className="font-medium">{address.state}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ZIP Code</p>
                      <p className="font-medium">{address.zip}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Property Type</p>
                      <p className="font-medium">{deal.loanData?.propertyType || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Appraised Value</p>
                      <p className="font-medium">{formatCurrency(deal.loanData?.propertyValue || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {deal.createdAt
                          ? new Date(deal.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Updated</p>
                      <p className="font-medium">
                        {deal.createdAt
                          ? new Date(deal.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5" />
                    Borrower
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{borrowerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium flex items-center gap-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {borrowerEmail}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Broker</p>
                    <p className="font-medium">{deal.userName || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No documents yet</h3>
              <p className="text-muted-foreground">Documents will appear here once uploaded</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No tasks yet</h3>
              <p className="text-muted-foreground">Tasks will appear here once created</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
