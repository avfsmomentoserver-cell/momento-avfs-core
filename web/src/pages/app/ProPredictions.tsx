import { useQuery } from "@tanstack/react-query";
import { Crown, Lock, Rocket, Timer } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/console/EmptyState";
import { Meter } from "@/components/console/Meter";
import { Panel } from "@/components/console/Panel";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { AccuracyPanel } from "@/components/panels/AccuracyPanel";
import { ForecastPanel } from "@/components/panels/ForecastPanel";
import { PredictionsPanel } from "@/components/panels/PredictionsPanel";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { decimal, duration, integer, multiplier, multiplierColor, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthProvider";
import { usePlatform } from "@/state/PlatformProvider";

/** Premium prediction surface: the full candidate table, cadence and analogues. */
export default function ProPredictions() {
  const { source, analysis } = usePlatform();
  const { isPremium, isAuthenticated } = useAuth();

  const moonshotQuery = useQuery({
    queryKey: ["moonshot", source],
    queryFn: () => api.moonshot(source),
    refetchInterval: POLL.analysis,
    enabled: isPremium,
  });

  const mlQuery = useQuery({
    queryKey: ["ml", source],
    queryFn: () => api.ml(source),
    refetchInterval: POLL.analysis,
    enabled: isPremium,
  });

  if (!isPremium) {
    return (
      <AppShell title="Pro Predictions" subtitle="Premium tier required">
        <div className="mx-auto max-w-xl">
          <div className="panel panel-lit p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-violet/40 bg-violet/10">
              <Lock className="h-5 w-5 text-violet" />
            </span>
            <h2 className="mt-5 text-xl font-bold tracking-tight">Pro Predictions is a premium feature</h2>
            <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground">
              The free tier shows one guidance card per session. Pro unlocks the full ranked candidate table, band cadence
              timers, historical analogue outcomes, the ML ensemble and the platform's measured forecast accuracy.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <Button asChild className="gap-1.5 bg-violet font-semibold text-primary-foreground hover:bg-violet/90">
                <Link to="/app/premium">
                  <Crown className="h-4 w-4" />
                  See what's included
                </Link>
              </Button>
              {!isAuthenticated && (
                <Button asChild variant="outline">
                  <Link to="/login">Sign in</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const eta = moonshotQuery.data?.eta ?? [];
  const dna = moonshotQuery.data?.dna;
  const ml = mlQuery.data;

  return (
    <AppShell title="Pro Predictions" subtitle="The full prediction stack, unlocked">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Predicted state"
            value={analysis?.forecast?.predicted_state ?? "—"}
            accent="signal"
            hint={analysis?.forecast?.confidence_label ? `${analysis.forecast.confidence_label} conviction` : "awaiting forecast"}
            emphasis
          />
          <StatTile
            label="Expected"
            value={multiplier(analysis?.forecast?.expected_multiplier)}
            accent="info"
            hint={
              analysis?.forecast
                ? `range ${multiplier(analysis.forecast.range_lo)} — ${multiplier(analysis.forecast.range_hi)}`
                : "—"
            }
          />
          <StatTile
            label="Measured accuracy"
            value={percent(analysis?.accuracy.overall, 1)}
            accent="caution"
            progress={analysis?.accuracy.overall ?? 0}
            hint={`${integer(analysis?.accuracy.total)} resolved forecasts`}
          />
          <StatTile
            label="Analogue matches"
            value={integer(dna?.match_count)}
            accent="violet"
            hint={dna?.outcomes.over_5x !== undefined ? `${percent(dna.outcomes.over_5x, 1)} went 5x+` : "no analogues yet"}
          />
        </div>

        <ForecastPanel forecast={analysis?.forecast} />

        <div className="grid gap-4 lg:grid-cols-2">
          <PredictionsPanel predictions={analysis?.predictions ?? []} />
          <AccuracyPanel accuracy={analysis?.accuracy} pending={analysis?.pending_forecasts} />
        </div>

        <Panel title="Band Timers" subtitle="how overdue each high band is" icon={<Timer className="h-3.5 w-3.5" />} bodyClassName="p-0">
          {eta.length === 0 ? (
            <div className="p-4">
              <EmptyState compact title="Not enough history" description="Cadence needs at least 20 rounds." />
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Band</th>
                  <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Since</th>
                  <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Due in</th>
                  <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">ETA</th>
                  <th className="px-4 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ripeness</th>
                </tr>
              </thead>
              <tbody>
                {eta.map((row) => (
                  <tr key={row.label} className={cn("border-b border-border/25", row.overdue && "bg-caution/6")}>
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold tabular-nums">{row.label}</span>
                        {row.overdue && <span className="chip-caution">overdue</span>}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums">{integer(row.rounds_since)}</td>
                    <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                      {decimal(row.rounds_remaining, 0)} rounds
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                      {row.eta_seconds !== null ? duration(row.eta_seconds) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <span className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${row.ripeness * 100}%`,
                              backgroundColor: row.ripeness >= 0.66 ? "hsl(var(--signal))" : row.ripeness >= 0.38 ? "hsl(var(--caution))" : "hsl(var(--critical))",
                            }}
                          />
                        </span>
                        <span className="w-8 font-mono text-[10px] tabular-nums text-muted-foreground">{percent(row.ripeness)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Historical Analogues" subtitle="what followed the last time the tape looked like this" icon={<Rocket className="h-3.5 w-3.5" />}>
            {!dna || dna.matches.length === 0 ? (
              <EmptyState compact title="No analogues found" description="More history is needed to match the current signature." />
            ) : (
              <div className="space-y-3.5">
                <dl className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Went 2x+", value: percent(dna.outcomes.over_2x, 0) },
                    { label: "Went 5x+", value: percent(dna.outcomes.over_5x, 0) },
                    { label: "Went 10x+", value: percent(dna.outcomes.over_10x, 0) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-md border border-border/45 bg-muted/12 px-2 py-2">
                      <dt className="hud-label">{item.label}</dt>
                      <dd className="mt-0.5 font-mono text-base font-semibold tabular-nums">{item.value}</dd>
                    </div>
                  ))}
                </dl>

                <div>
                  <p className="hud-label mb-1.5">Follow-up results</p>
                  <div className="flex flex-wrap gap-1.5">
                    {dna.matches.slice(0, 20).map((match, index) => (
                      <span
                        key={index}
                        className="rounded border border-border/50 bg-muted/20 px-1.5 py-0.5 font-mono text-[10px] tabular-nums"
                        style={{ color: multiplierColor(match.next_multiplier) }}
                        title={`${percent(match.similarity, 1)} similar`}
                      >
                        {match.next_multiplier.toFixed(2)}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="border-t border-border/50 pt-2.5 font-mono text-[10px] text-muted-foreground">
                  median {multiplier(dna.outcomes.median)} · p90 {multiplier(dna.outcomes.p90)} · {integer(dna.match_count)} matches
                </p>
              </div>
            )}
          </Panel>

          <Panel title="Model Ensemble" subtitle="blended model + empirical probabilities">
            {!ml?.available ? (
              <EmptyState compact title="Ensemble idle" description={ml?.note ?? "Needs more rounds."} />
            ) : (
              <div className="space-y-4">
                {Object.entries(ml.predictions).map(([target, values]) => (
                  <Meter
                    key={target}
                    label={target.replace("over_", "reaches ")}
                    value={values.blended}
                    detail={`model ${percent(values.model, 1)} · observed ${percent(values.empirical, 1)}`}
                  />
                ))}
                <p className="border-t border-border/50 pt-2.5 font-mono text-[10px] text-muted-foreground">
                  {ml.model} · {integer(ml.samples)} samples
                </p>
              </div>
            )}
          </Panel>
        </div>

        <p className="px-2 text-center text-[10px] leading-relaxed text-muted-foreground/60">
          Probabilities describe historical structure, not future certainty. The accuracy figures above are the platform's
          own measured hit rate on forecasts recorded before the round resolved — read them honestly.
        </p>
      </div>
    </AppShell>
  );
}
