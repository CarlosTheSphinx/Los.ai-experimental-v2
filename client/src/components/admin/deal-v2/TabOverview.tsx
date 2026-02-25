import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Building2, DollarSign, Percent, TrendingUp, Calculator } from "lucide-react";

function formatCurrency(amount: number | undefined): string {
  if (!amount) return "—";
  return "$" + amount.toLocaleString();
}

function KpiCard({ label, value, tooltip, icon: Icon }: { label: string; value: string; tooltip?: string; icon: any }) {
  const labelEl = tooltip ? (
    <Tooltip>
      <TooltipTrigger className="border-b border-dashed border-muted-foreground/40 cursor-help text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  ) : (
    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
  );

  return (
    <div className="bg-card border rounded-[10px] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {labelEl}
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

export default function TabOverview({ deal }: { deal: any }) {
  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} label="Loan Amount" value={formatCurrency(deal.loanAmount)} />
        <KpiCard
          icon={Percent}
          label="LTV"
          value={deal.ltv ? `${deal.ltv}%` : "—"}
          tooltip="Loan-to-Value — the loan amount as a percentage of the property's appraised value."
        />
        <KpiCard
          icon={TrendingUp}
          label="DSCR"
          value={deal.dscr ? `${deal.dscr}x` : "—"}
          tooltip="Debt Service Coverage Ratio — net operating income divided by total debt service. Above 1.0 means the property generates enough income to cover the loan."
        />
        <KpiCard
          icon={Calculator}
          label="Rate"
          value={deal.interestRate ? `${deal.interestRate}%` : "—"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Borrower Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] flex items-center gap-2">
              <User className="h-4 w-4" /> Borrower
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[13px]">
            <div className="grid grid-cols-[100px_1fr] gap-y-1.5">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{deal.borrowerName || "—"}</span>
              <span className="text-muted-foreground">Email</span>
              <span>{deal.borrowerEmail || "—"}</span>
              <span className="text-muted-foreground">Phone</span>
              <span>{deal.borrowerPhone || "—"}</span>
              <span className="text-muted-foreground">Entity</span>
              <span>{deal.entityName || "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Property Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Property
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[13px]">
            <div className="grid grid-cols-[100px_1fr] gap-y-1.5">
              <span className="text-muted-foreground">Address</span>
              <span className="font-medium">{deal.propertyAddress || "—"}</span>
              <span className="text-muted-foreground">City/State</span>
              <span>{[deal.propertyCity, deal.propertyState].filter(Boolean).join(", ") || "—"}</span>
              <span className="text-muted-foreground">Type</span>
              <span>{deal.propertyType || "—"}</span>
              <span className="text-muted-foreground">Value</span>
              <span>{formatCurrency(deal.propertyValue)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loan Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[14px]">Loan Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
            <div>
              <span className="text-muted-foreground text-[11px] uppercase font-semibold tracking-wider">Program</span>
              <p className="font-medium mt-0.5">{deal.programName || deal.loanType || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px] uppercase font-semibold tracking-wider">Term</span>
              <p className="font-medium mt-0.5">{deal.termMonths ? `${deal.termMonths} months` : "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px] uppercase font-semibold tracking-wider">Purpose</span>
              <p className="font-medium mt-0.5">{deal.loanPurpose || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px] uppercase font-semibold tracking-wider">Created</span>
              <p className="font-medium mt-0.5">
                {deal.createdAt ? new Date(deal.createdAt).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
