import { Check, Crown, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Panel } from "@/components/console/Panel";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthProvider";

interface Tier {
  id: "free" | "premium" | "pro";
  name: string;
  price: string;
  cadence: string;
  summary: string;
  accent: string;
  features: { label: string; included: boolean }[];
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "0",
    cadence: "forever",
    summary: "One honest read per session, with the reasoning shown.",
    accent: "border-border",
    features: [
      { label: "Today's session mood and confidence", included: true },
      { label: "One suggested cash-out with a hard stop", included: true },
      { label: "Recent results and reach probabilities", included: true },
      { label: "Behavioural guardrail warnings", included: true },
      { label: "Full ranked candidate table", included: false },
      { label: "Band cadence timers and ETA", included: false },
      { label: "Historical analogue outcomes", included: false },
      { label: "Measured forecast accuracy", included: false },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "19",
    cadence: "per month",
    summary: "The full prediction stack the operator console runs on.",
    accent: "border-violet/45",
    features: [
      { label: "Everything in Free", included: true },
      { label: "Full ranked candidate table with ranges", included: true },
      { label: "Band cadence timers and wall-clock ETA", included: true },
      { label: "Historical analogue (DNA) outcomes", included: true },
      { label: "ML ensemble probabilities", included: true },
      { label: "Measured forecast accuracy and Brier score", included: true },
      { label: "Operator console access", included: false },
      { label: "Plugin authoring and calibration", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "49",
    cadence: "per month",
    summary: "Everything, plus the operator console and the engine controls.",
    accent: "border-signal/45",
    features: [
      { label: "Everything in Premium", included: true },
      { label: "Full operator console (19 screens)", included: true },
      { label: "Ingest console and live engine control", included: true },
      { label: "Plugin inventory, weights and authoring", included: true },
      { label: "Calibration and walk-forward backtesting", included: true },
      { label: "Autopilot decision ledger", included: true },
      { label: "Source management and CSV export", included: true },
      { label: "Audit log and user administration", included: true },
    ],
  },
];

/**
 * Plan comparison. Tier changes are applied through the same user API the
 * operator console uses, so entitlements are enforced server-side.
 */
export default function Premium() {
  const { user, isAuthenticated, isOperator, refresh } = useAuth();

  const changeTier = useMutation({
    mutationFn: (tier: string) => {
      if (!user) throw new Error("Sign in first");
      return api.updateUser(user.id, { tier });
    },
    onSuccess: async (result) => {
      toast.success(`Switched to ${result.user.tier}`, { description: "Entitlements updated immediately." });
      await refresh();
    },
    onError: (error: Error) => toast.error("Could not change plan", { description: error.message }),
  });

  return (
    <AppShell title="Premium" subtitle="Choose how much of the platform you want">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="text-center">
          <span className="chip-signal">
            <Sparkles className="h-2.5 w-2.5" />
            Same engines, different depth
          </span>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Every tier reads the <span className="text-signal">same live data</span>
          </h2>
          <p className="mx-auto mt-2.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            There is no separate "premium model". Paid tiers simply expose more of what the forecast engine already
            computes — including its own measured accuracy, so you can judge it honestly.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {TIERS.map((tier) => {
            const current = user?.tier === tier.id;
            return (
              <article key={tier.id} className={cn("panel flex flex-col border p-6", tier.accent, current && "panel-lit")}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-[0.14em]">{tier.name}</h3>
                  {current && <span className="chip-signal">current</span>}
                  {tier.id === "pro" && !current && <Crown className="h-4 w-4 text-signal" />}
                </div>

                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-mono text-3xl font-bold tabular-nums">${tier.price}</span>
                  <span className="text-[11px] text-muted-foreground">{tier.cadence}</span>
                </p>

                <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">{tier.summary}</p>

                <ul className="mt-5 flex-1 space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature.label} className="flex items-start gap-2 text-[11px] leading-snug">
                      {feature.included ? (
                        <Check className="mt-[2px] h-3.5 w-3.5 shrink-0 text-signal" />
                      ) : (
                        <X className="mt-[2px] h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                      )}
                      <span className={feature.included ? "text-foreground/85" : "text-muted-foreground/50"}>{feature.label}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {!isAuthenticated ? (
                    <Button asChild variant={tier.id === "free" ? "outline" : "default"} className="w-full">
                      <Link to="/register">Create account</Link>
                    </Button>
                  ) : current ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : (
                    <Button
                      className={cn(
                        "w-full gap-1.5 font-semibold",
                        tier.id === "pro" && "bg-signal text-primary-foreground hover:bg-signal/90",
                        tier.id === "premium" && "bg-violet text-primary-foreground hover:bg-violet/90",
                      )}
                      variant={tier.id === "free" ? "outline" : "default"}
                      onClick={() => changeTier.mutate(tier.id)}
                      disabled={changeTier.isPending}
                    >
                      {changeTier.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {tier.id === "free" ? "Downgrade" : `Switch to ${tier.name}`}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {isOperator && (
          <Panel title="Operator note" subtitle="how tier changes work in this build" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              This deployment has no payment processor wired in — plan changes update the account tier directly through the
              user API, and every premium surface checks that tier server-side. To attach real billing, replace the tier
              mutation on this screen with your provider's checkout flow and have the webhook call{" "}
              <code className="font-mono text-foreground/80">PUT /api/v1/users/{"{id}"}</code> with the purchased tier.
            </p>
          </Panel>
        )}

        <p className="px-2 text-center text-[10px] leading-relaxed text-muted-foreground/60">
          No tier can predict a random outcome. Paid access buys transparency into the platform's reasoning and its
          measured track record — nothing more.
        </p>
      </div>
    </AppShell>
  );
}
