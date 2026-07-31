import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Crown, Info, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { Ring } from "@/components/console/Ring";
import { Sparkline } from "@/components/console/Sparkline";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { decimal, multiplier, multiplierColor, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthProvider";
import { usePlatform } from "@/state/PlatformProvider";

const MOOD: Record<string, { emoji: string; label: string; tone: string; advice: string }> = {
  Ignition: { emoji: "🚀", label: "Building", tone: "text-signal", advice: "Structure is compressing and releasing. Small size, quick exit." },
  Moonshot: { emoji: "🌙", label: "Running", tone: "text-info", advice: "A high band already cleared. Take profit early rather than chasing higher." },
  Normal: { emoji: "😐", label: "Ordinary", tone: "text-foreground", advice: "Nothing special here. There is no edge in forcing a round." },
  Shelf: { emoji: "😴", label: "Sleepy", tone: "text-muted-foreground", advice: "The market is coiling flat. Wait for it to pick a direction." },
  Collapse: { emoji: "🧊", label: "Cold", tone: "text-critical", advice: "Ceilings are stepping down. This is the worst time to enter." },
  Exhaustion: { emoji: "😮‍💨", label: "Spent", tone: "text-caution", advice: "The move already happened. Entering now is late." },
  Bait: { emoji: "🪤", label: "Tricky", tone: "text-caution", advice: "One big print inside a weak window. Do not chase it." },
  Idle: { emoji: "🌑", label: "Quiet", tone: "text-muted-foreground", advice: "No data yet. Nothing to read." },
};

/**
 * Consumer "Today" screen: one honest read per session, deliberately simple.
 * Everything shown here is derived from the same engines the console uses.
 */
export default function Today() {
  const { source, analysis, rounds, loading } = usePlatform();
  const { isPremium, isAuthenticated } = useAuth();

  const orchestratorQuery = useQuery({
    queryKey: ["orchestrator", source],
    queryFn: () => api.orchestrator(source),
    refetchInterval: POLL.analysis,
  });

  const plan = orchestratorQuery.data;
  const state = analysis?.state ?? "Idle";
  const mood = MOOD[state] ?? MOOD.Normal;
  const confidence = analysis?.prediction_confidence.confidence ?? 0;
  const ripeness = analysis?.prediction_confidence.moonshot_probability ?? 0;
  const recent = [...rounds].reverse().slice(-40).map((round) => round.multiplier);

  const suggestedTarget = plan?.instruction.target_multiplier ?? analysis?.forecast?.range_lo ?? 0;
  const canAct = plan?.instruction.action === "ENTER";

  return (
    <AppShell title="Today" subtitle="Your one-glance read on the current session">
      {loading && !analysis ? (
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading the session…
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          {/* ---- mood hero ---- */}
          <section className="panel panel-lit p-6 text-center sm:p-8">
            <span className="text-5xl sm:text-6xl" role="img" aria-label={mood.label}>
              {mood.emoji}
            </span>
            <h2 className={cn("mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl", mood.tone)}>{mood.label}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{mood.advice}</p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-8">
              <Ring value={confidence} size={124} label={percent(confidence)} sublabel="confidence" />
              <Ring
                value={ripeness}
                size={124}
                color="hsl(var(--info))"
                label={percent(ripeness)}
                sublabel="ripeness"
              />
            </div>
          </section>

          {/* ---- the suggestion ---- */}
          <Panel title="Next Round" subtitle="what the platform would do right now" icon={<Sparkles className="h-3.5 w-3.5" />}>
            {!plan ? (
              <EmptyState compact title="No guidance yet" description="Waiting for enough rounds to form a read." />
            ) : (
              <div className="space-y-4">
                <div
                  className={cn(
                    "rounded-lg border px-4 py-3.5",
                    canAct ? "border-signal/35 bg-signal/8" : "border-caution/30 bg-caution/8",
                  )}
                >
                  <p className={cn("font-mono text-[10px] font-bold uppercase tracking-[0.2em]", canAct ? "text-signal" : "text-caution")}>
                    {plan.instruction.action.replace("_", " ")}
                  </p>
                  <p className="mt-1.5 text-lg font-bold tracking-tight">{plan.instruction.headline}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{plan.instruction.detail}</p>
                </div>

                <dl className="grid grid-cols-3 gap-3">
                  <div className="rounded-md border border-border/45 bg-muted/12 px-3 py-2.5 text-center">
                    <dt className="hud-label">Cash out at</dt>
                    <dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-signal">{multiplier(suggestedTarget)}</dd>
                  </div>
                  <div className="rounded-md border border-border/45 bg-muted/12 px-3 py-2.5 text-center">
                    <dt className="hud-label">Hard stop</dt>
                    <dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-critical">
                      {multiplier(plan.instruction.stop_multiplier)}
                    </dd>
                  </div>
                  <div className="rounded-md border border-border/45 bg-muted/12 px-3 py-2.5 text-center">
                    <dt className="hud-label">Conviction</dt>
                    <dd className="mt-1 font-mono text-xl font-semibold tabular-nums">{plan.instruction.confidence_label}</dd>
                  </div>
                </dl>

                {plan.mistake_prevention.length > 0 && (
                  <ul className="space-y-1.5">
                    {plan.mistake_prevention.slice(0, 3).map((entry) => (
                      <li
                        key={entry.code}
                        className="flex items-start gap-2 rounded-md border border-caution/25 bg-caution/6 px-3 py-2 text-[11px] leading-snug text-caution"
                      >
                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {entry.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Panel>

          {/* ---- recent rounds ---- */}
          <Panel title="Recent Rounds" subtitle={`last ${recent.length} results`}>
            {recent.length === 0 ? (
              <EmptyState compact title="No rounds yet" description="Results appear as soon as the session starts." />
            ) : (
              <div className="space-y-3">
                <Sparkline values={recent} width={640} height={54} className="w-full" />
                <div className="flex flex-wrap gap-1.5">
                  {[...rounds].slice(0, 24).map((round) => (
                    <span
                      key={round.id}
                      className="rounded-md border border-border/50 bg-muted/20 px-2 py-1 font-mono text-[11px] font-semibold tabular-nums"
                      style={{ color: multiplierColor(round.multiplier) }}
                    >
                      {round.multiplier.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          {/* ---- what we see ---- */}
          <Panel title="What We See" subtitle="the platform's reading, in plain language" icon={<Info className="h-3.5 w-3.5" />}>
            <p className="text-[12px] leading-relaxed text-foreground/85">{analysis?.narrative ?? "Not enough data to describe the session yet."}</p>
            <dl className="mt-3.5 grid grid-cols-2 gap-3 border-t border-border/50 pt-3.5 sm:grid-cols-4">
              {[
                { label: "Last round", value: multiplier(analysis?.latest.multiplier) },
                { label: "Session peak", value: multiplier(analysis?.session.peak) },
                { label: "Typical round", value: multiplier(analysis?.percentiles.p50) },
                { label: "Rounds played", value: decimal(analysis?.session.count, 0) },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="hud-label">{item.label}</dt>
                  <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          {/* ---- upsell ---- */}
          {!isPremium && (
            <Link to="/app/premium" className="panel group block p-5 transition-colors hover:border-violet/45">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-violet/40 bg-violet/10">
                  <Crown className="h-4 w-4 text-violet" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">Unlock Pro Predictions</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                    See the full candidate table, historical analogue outcomes, band cadence timers and measured forecast
                    accuracy — the same numbers the operator console uses.
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-violet">
                    {isAuthenticated ? "Compare plans" : "Create an account"}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          )}

          <p className="px-2 text-center text-[10px] leading-relaxed text-muted-foreground/60">
            These readings are probabilistic estimates over historical structure, not guarantees. The platform cannot
            predict a random outcome. Never stake money you cannot afford to lose, and treat every suggested cash-out as
            an upper bound rather than a target.
          </p>
        </div>
      )}
    </AppShell>
  );
}
