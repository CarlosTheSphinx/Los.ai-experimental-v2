import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PendingSurvey {
  notificationId: number;
  surveyType: "day7" | "day30" | "day60";
  title: string;
  message: string;
  createdAt: string;
}

type QuestionType = "rating" | "text" | "number" | "dropdown" | "nps";

interface SurveyQuestion {
  key: string;
  label: string;
  type: QuestionType;
  optional?: boolean;
  options?: string[];
}

const SURVEY_QUESTIONS: Record<string, SurveyQuestion[]> = {
  day7: [
    { key: "dealExtractionRating", label: "How useful has deal extraction been? (1 = not useful, 5 = very useful)", type: "rating" },
    { key: "biggestBlocker", label: "What's the #1 thing getting in your way?", type: "text" },
    { key: "payingCustomerReason", label: "What would make you a paying customer?", type: "text" },
  ],
  day30: [
    { key: "dealsSubmitted", label: "How many deals have you submitted through Brokr.AI so far?", type: "number" },
    { key: "workflowImprovement", label: "On a scale of 1–5, how much has Brokr.AI improved your deal intake workflow?", type: "rating" },
    { key: "topChange", label: "What's the #1 thing you'd change or improve?", type: "text", optional: true },
  ],
  day60: [
    { key: "totalDeals", label: "How many deals did you submit total?", type: "number" },
    { key: "timeSaved", label: "How much time did Brokr.AI save you per deal?", type: "dropdown", options: ["Less than 30 min", "30–60 min", "1–2 hours", "More than 2 hours", "None"] },
    { key: "biggestBenefit", label: "Single biggest benefit?", type: "text" },
    { key: "biggestFriction", label: "Single biggest friction point?", type: "text" },
    { key: "npsScore", label: "Would you recommend Brokr.AI to a fellow broker? (0 = not at all, 10 = definitely)", type: "nps" },
  ],
};

export function PilotSurveyModal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [responses, setResponses] = useState<Record<string, string | number>>({});
  const [dismissed, setDismissed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ surveys: PendingSurvey[] }>({
    queryKey: ["/api/pilot/surveys/pending"],
    enabled: user?.role === "broker",
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  const respondMutation = useMutation({
    mutationFn: (payload: { surveyType: string; notificationId: number; responses: Record<string, string | number>; dismissed: boolean }) =>
      apiRequest("POST", "/api/pilot/surveys/respond", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pilot/surveys/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      setResponses({});
      setDismissed(false);
    },
  });

  if (isLoading || !data?.surveys?.length || dismissed) return null;

  const survey = data.surveys[0];
  const questions = SURVEY_QUESTIONS[survey.surveyType] ?? [];

  function handleSubmit() {
    const requiredKeys = questions.filter((q) => !q.optional).map((q) => q.key);
    const allFilled = requiredKeys.every(
      (k) => responses[k] !== undefined && responses[k] !== ""
    );
    if (!allFilled) {
      setValidationError("Please answer all required questions before submitting.");
      return;
    }
    setValidationError(null);
    respondMutation.mutate({
      surveyType: survey.surveyType,
      notificationId: survey.notificationId,
      responses,
      dismissed: false,
    });
  }

  function handleDismiss() {
    respondMutation.mutate({
      surveyType: survey.surveyType,
      notificationId: survey.notificationId,
      responses: {},
      dismissed: true,
    });
  }

  function renderQuestion(q: SurveyQuestion) {
    if (q.type === "rating") {
      return (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setResponses((prev) => ({ ...prev, [q.key]: n }))}
              className={`w-10 h-10 rounded-full border text-sm font-medium transition-colors ${
                responses[q.key] === n
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    if (q.type === "nps") {
      return (
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setResponses((prev) => ({ ...prev, [q.key]: n }))}
              className={`w-9 h-9 rounded border text-sm font-medium transition-colors ${
                responses[q.key] === n
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    if (q.type === "number") {
      return (
        <Input
          type="number"
          min={0}
          placeholder="0"
          value={(responses[q.key] as number) ?? ""}
          onChange={(e) => setResponses((prev) => ({ ...prev, [q.key]: parseInt(e.target.value, 10) || 0 }))}
          className="w-32"
        />
      );
    }

    if (q.type === "dropdown" && q.options) {
      return (
        <Select
          value={(responses[q.key] as string) ?? ""}
          onValueChange={(val) => setResponses((prev) => ({ ...prev, [q.key]: val }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an option..." />
          </SelectTrigger>
          <SelectContent>
            {q.options.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Textarea
        rows={2}
        placeholder={q.optional ? "Your answer... (optional)" : "Your answer..."}
        value={(responses[q.key] as string) ?? ""}
        onChange={(e) => setResponses((prev) => ({ ...prev, [q.key]: e.target.value }))}
      />
    );
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{survey.title}</DialogTitle>
          <DialogDescription>{survey.message}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {questions.map((q) => (
            <div key={q.key} className="space-y-2">
              <Label>
                {q.label}
                {q.optional && <span className="ml-1 text-muted-foreground text-xs">(optional)</span>}
              </Label>
              {renderQuestion(q)}
            </div>
          ))}
        </div>

        {validationError && (
          <p className="text-sm text-destructive mt-2">{validationError}</p>
        )}

        <div className="flex gap-3 mt-4">
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={respondMutation.isPending}
          >
            Submit
          </Button>
          <Button variant="outline" onClick={handleDismiss} disabled={respondMutation.isPending}>
            Skip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
