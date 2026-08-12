import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Building2,
  Mail,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  MessageSquare,
} from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

export interface DealInboxItem {
  id: number;
  propertyName: string;
  propertyAddress: string;
  brokerOrDeveloperName: string;
  email: string;
  status: string;
  requestedLoanAmount: number | null;
  propertyType: string;
  createdAt: string;
  updatedAt: string;
  emailThreadId: number | null;
  documentCount?: number;
  requiredDocCount?: number;
}

type StatusConfig = {
  label: string;
  color: string;
  icon: React.ElementType;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  email_intake: {
    label: "Email Received",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Mail,
  },
  ai_processing: {
    label: "AI Processing",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Loader2,
  },
  ai_processing_complete: {
    label: "Docs Requested",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    icon: FileText,
  },
  email_intake_error: {
    label: "Processing Error",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: AlertCircle,
  },
  docs_received: {
    label: "Docs Received",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  IN_REVIEW: {
    label: "In Review",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: Eye,
  },
  APPROVED: {
    label: "Approved",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  DECLINED: {
    label: "Declined",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: AlertCircle,
  },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: Clock,
  };
  const Icon = cfg.icon;
  const spin = status === "ai_processing";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}
    >
      <Icon className={`w-3 h-3 ${spin ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

function formatCurrency(n: number | null | undefined) {
  if (!n) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

interface DealInboxCardProps {
  deal: DealInboxItem;
}

export function DealInboxCard({ deal }: DealInboxCardProps) {
  const [, navigate] = useLocation();

  const lastActivity = deal.updatedAt
    ? formatDistanceToNow(new Date(deal.updatedAt), { addSuffix: true })
    : "—";

  const docProgress =
    deal.requiredDocCount != null && deal.documentCount != null
      ? `${deal.documentCount} / ${deal.requiredDocCount} docs`
      : deal.documentCount != null
      ? `${deal.documentCount} docs submitted`
      : null;

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow border">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 shrink-0 text-muted-foreground" />
            <span className="font-semibold text-sm leading-tight truncate">
              {deal.propertyName || deal.propertyAddress || "Unnamed Deal"}
            </span>
          </div>
          <StatusPill status={deal.status} />
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 px-4 pb-4">
        <div className="text-xs text-muted-foreground space-y-1">
          {deal.propertyAddress && (
            <p className="truncate">{deal.propertyAddress}</p>
          )}
          <p className="truncate">
            <span className="font-medium text-foreground">
              {deal.brokerOrDeveloperName}
            </span>{" "}
            &bull; {deal.email}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {deal.requestedLoanAmount && (
            <div>
              <p className="text-muted-foreground">Loan Amount</p>
              <p className="font-medium">{formatCurrency(deal.requestedLoanAmount)}</p>
            </div>
          )}
          {deal.propertyType && (
            <div>
              <p className="text-muted-foreground">Property Type</p>
              <p className="font-medium capitalize">{deal.propertyType.replace(/-/g, " ")}</p>
            </div>
          )}
          {docProgress && (
            <div>
              <p className="text-muted-foreground">Documents</p>
              <p className="font-medium">{docProgress}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Last Activity</p>
            <p className="font-medium">{lastActivity}</p>
          </div>
        </div>

        <div className="flex gap-2 mt-auto pt-2">
          {deal.emailThreadId && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-7"
              onClick={() =>
                navigate(`/lender/inbox?threadId=${deal.emailThreadId}`)
              }
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              View Thread
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-7"
            onClick={() =>
              navigate(`/admin/commercial-submissions?id=${deal.id}`)
            }
          >
            <Eye className="w-3 h-3 mr-1" />
            View Submission
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
