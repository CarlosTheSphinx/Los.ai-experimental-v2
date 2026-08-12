import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { safeFormat } from "@/lib/utils";

interface SurveyResponse {
  id: number;
  userId: number;
  surveyType: "day7" | "day30" | "day60";
  responses: Record<string, string | number>;
  dismissed: boolean;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
}

const SURVEY_TYPE_LABELS: Record<string, string> = {
  day7: "Day 7",
  day30: "Day 30",
  day60: "Day 60",
};

const QUESTION_LABELS: Record<string, Record<string, string>> = {
  day7: {
    dealExtractionRating: "Extraction Usefulness (1–5)",
    biggestBlocker: "Biggest Blocker",
    payingCustomerReason: "What would make you pay?",
  },
  day30: {
    dealsSubmitted: "Deals Submitted",
    workflowImprovement: "Workflow Improvement (1–5)",
    topChange: "Top Change Requested",
  },
  day60: {
    totalDeals: "Total Deals",
    timeSaved: "Time Saved Per Deal",
    biggestBenefit: "Biggest Benefit",
    biggestFriction: "Biggest Friction",
    npsScore: "NPS Score (0–10)",
  },
};

export default function PilotSurveysPage() {
  const [surveyTypeFilter, setSurveyTypeFilter] = useState<string>("all");

  const { data, isLoading } = useQuery<{ responses: SurveyResponse[] }>({
    queryKey: ["/api/admin/pilot-surveys", surveyTypeFilter],
    queryFn: async () => {
      const params = surveyTypeFilter !== "all" ? `?surveyType=${surveyTypeFilter}` : "";
      const res = await fetch(`/api/admin/pilot-surveys${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const responses = data?.responses ?? [];
  const submitted = responses.filter((r) => !r.dismissed);
  const dismissed = responses.filter((r) => r.dismissed);

  function renderResponseSummary(r: SurveyResponse) {
    const labels = QUESTION_LABELS[r.surveyType] ?? {};
    return Object.entries(r.responses)
      .filter(([, v]) => v !== "" && v !== null && v !== undefined)
      .map(([k, v]) => (
        <div key={k} className="text-xs">
          <span className="text-muted-foreground">{labels[k] ?? k}: </span>
          <span>{String(v)}</span>
        </div>
      ));
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pilot Survey Responses</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Aggregated Day 7, 30, and 60 survey responses from pilot brokers.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="type-filter">Survey</Label>
          <Select value={surveyTypeFilter} onValueChange={setSurveyTypeFilter}>
            <SelectTrigger id="type-filter" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="day7">Day 7</SelectItem>
              <SelectItem value="day30">Day 30</SelectItem>
              <SelectItem value="day60">Day 60</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-4 ml-auto text-sm text-muted-foreground">
          <span>{submitted.length} submitted</span>
          <span>{dismissed.length} skipped</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Responses</CardTitle>
          <CardDescription>Most recent first. Only submitted responses show answers.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : responses.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No responses yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Broker</TableHead>
                  <TableHead>Survey</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Answers</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{r.userName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.userEmail ?? `User #${r.userId}`}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{SURVEY_TYPE_LABELS[r.surveyType] ?? r.surveyType}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.dismissed ? (
                        <Badge variant="secondary">Skipped</Badge>
                      ) : (
                        <Badge variant="default">Submitted</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {r.dismissed ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="space-y-0.5">{renderResponseSummary(r)}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {safeFormat(r.createdAt, "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
