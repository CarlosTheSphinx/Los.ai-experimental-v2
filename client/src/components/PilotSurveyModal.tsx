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

interface PendingSurvey {
  notificationId: number;
  surveyType: "day7" | "day30" | "day60";
  title: string;
  message: string;
  createdAt: string;
}

const DAY30_TYPEFORM_URL = "https://form.typeform.com/to/brokr-day30"; // CMO to configure

const SURVEY_QUESTIONS: Record<string, Array<{ key: string; label: string; type: "rating" | "text" }>> = {
  day7: [
    { key: "dealExtractionRating", label: "How useful has deal extraction been? (1 = not useful, 5 = very useful)", type: "rating" },
    { key: "biggestBlocker", label: "What's the #1 thing getting in your way?", type: "text" },
    { key: "payingCustomerReason", label: "What would make you a paying customer?", type: "text" },
  ],
  day60: [
    { key: "dealExtractionRating", label: "How useful has deal extraction been? (1 = not useful, 5 = very useful)", type: "rating" },
    { key: "biggestBlocker", label: "What's still getting in your way?", type: "text" },
    { key: "payingCustomerReason", label: "What would make you commit to a paid plan?", type: "text" },
  ],
};

export function PilotSurveyModal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [responses, setResponses] = useState<Record<string, string | number>>({});
  const [dismissed, setDismissed] = useState(false);

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

  // Day 30 is a notification card only (Typeform redirect)
  if (survey.surveyType === "day30") {
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{survey.title}</DialogTitle>
            <DialogDescription>{survey.message}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              className="flex-1"
              onClick={() => {
                window.open(DAY30_TYPEFORM_URL, "_blank");
                respondMutation.mutate({
                  surveyType: survey.surveyType,
                  notificationId: survey.notificationId,
                  responses: { redirectedToTypeform: 1 },
                  dismissed: false,
                });
              }}
            >
              Open Survey
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                respondMutation.mutate({
                  surveyType: survey.surveyType,
                  notificationId: survey.notificationId,
                  responses: {},
                  dismissed: true,
                });
              }}
            >
              Remind me later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const questions = SURVEY_QUESTIONS[survey.surveyType] ?? [];

  function handleSubmit() {
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
              <Label>{q.label}</Label>
              {q.type === "rating" ? (
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
              ) : (
                <Textarea
                  rows={2}
                  placeholder="Your answer..."
                  value={(responses[q.key] as string) ?? ""}
                  onChange={(e) => setResponses((prev) => ({ ...prev, [q.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>

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
