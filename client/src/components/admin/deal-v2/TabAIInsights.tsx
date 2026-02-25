import { useQuery } from "@tanstack/react-query";
import { Brain, Loader2, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/phase1/empty-state";
import { apiRequest } from "@/lib/queryClient";

function InsightCard({ insight }: { insight: any }) {
  const getIcon = () => {
    switch (insight.severity || insight.type) {
      case "warning":
      case "risk":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "success":
      case "positive":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="flex items-start gap-3 py-3 px-4 rounded-lg border bg-card">
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium">{insight.title || insight.message}</p>
        {insight.description && (
          <p className="text-[12px] text-muted-foreground mt-1">{insight.description}</p>
        )}
        {insight.recommendation && (
          <p className="text-[12px] text-primary mt-1.5">{insight.recommendation}</p>
        )}
      </div>
      {insight.category && (
        <Badge variant="secondary" className="text-[10px] shrink-0">{insight.category}</Badge>
      )}
    </div>
  );
}

export default function TabAIInsights({
  deal,
  dealId,
}: {
  deal: any;
  dealId: string;
}) {
  const { data: insights, isLoading } = useQuery<any[]>({
    queryKey: [`/api/deals/${dealId}/ai-insights`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/deals/${dealId}/ai-insights`, { credentials: "include" });
        if (!res.ok) return [];
        return res.json();
      } catch {
        return [];
      }
    },
    enabled: !!dealId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-[13px]">Analyzing deal...</span>
      </div>
    );
  }

  const insightsList = Array.isArray(insights) ? insights : [];

  if (insightsList.length === 0) {
    return (
      <EmptyState
        icon={Brain}
        title="No AI insights yet"
        description="AI analysis will generate insights as more deal data becomes available."
      />
    );
  }

  const risks = insightsList.filter((i) => i.severity === "warning" || i.type === "risk");
  const recommendations = insightsList.filter((i) => i.severity !== "warning" && i.type !== "risk");

  return (
    <div className="space-y-5">
      {risks.length > 0 && (
        <div>
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Risk Flags ({risks.length})
          </h4>
          <div className="space-y-2">
            {risks.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>
        </div>
      )}
      {recommendations.length > 0 && (
        <div>
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Recommendations ({recommendations.length})
          </h4>
          <div className="space-y-2">
            {recommendations.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
