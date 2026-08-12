import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { X, CreditCard, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";

interface SubscriptionState {
  subscriptionStatus: string | null;
  foundingBroker: boolean;
  pilotActivatedAt: string | null;
}

// Day 75–104 of pilot = the conversion window
const CONVERSION_DAY_START = 75;
const CONVERSION_DAY_END = 104;

function getPilotDay(pilotActivatedAt: string | null): number | null {
  if (!pilotActivatedAt) return null;
  const activated = new Date(pilotActivatedAt).getTime();
  const now = Date.now();
  return Math.floor((now - activated) / 86400000);
}

export function PilotConversionBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const { data: subscription } = useQuery<SubscriptionState>({
    queryKey: ["/api/billing/subscription"],
    enabled: user?.role === "broker",
    staleTime: 5 * 60 * 1000,
  });

  if (!user || user.role !== "broker" || dismissed) return null;
  if (!subscription) return null;

  const status = subscription.subscriptionStatus;
  // Only show for trialing accounts (not yet converted)
  if (status !== "trialing" && status !== null) return null;

  const pilotDay = getPilotDay(subscription.pilotActivatedAt);
  if (pilotDay === null || pilotDay < CONVERSION_DAY_START || pilotDay > CONVERSION_DAY_END) return null;

  const daysRemaining = CONVERSION_DAY_END - pilotDay;
  const isFoundingBroker = subscription.foundingBroker;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-primary text-primary-foreground shrink-0 text-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <CreditCard className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">
          {isFoundingBroker ? (
            <>
              <Star className="h-3.5 w-3.5 inline mr-1 text-amber-300" />
              Your <strong>Founding Broker 20% discount</strong> is reserved — subscribe before Day {CONVERSION_DAY_END} to lock it in.
            </>
          ) : (
            <>Your free pilot ends in <strong>{daysRemaining} days</strong> — subscribe to keep access.</>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href="/settings?tab=billing">
          <Button size="sm" variant="secondary" className="h-7 text-xs">
            View Plans
          </Button>
        </Link>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
