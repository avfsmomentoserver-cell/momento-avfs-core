import { useQuery } from "@tanstack/react-query";
import { Loader2, Rocket, Timer } from "lucide-react";

import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { Ring } from "@/components/console/Ring";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { decimal, duration, integer, multiplier, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/state/PlatformProvider";

/** Moonshot cadence: band ripeness, ETA table and range readiness grades. */
export default function MoonshotFinder() {
  const { source, analysis } = usePlatform();

  const moonshotQuery = useQuery({
    queryKey: ["moonshot", source],
    queryFn: () => api.moonshot(source, "file"),
    refetchInterval: POLL.analysis,
  });

  const eta = moonshotQuery.data?.eta ?? [];
  const megaScores = moonshotQuery.data?.mega_scores ?? [];
  const exhaustion = moonshotQuery.data?.band_exhaustion;
  const dna = moonshotQuery.data?.dna;
  const overdue = exhaustion?.most_overdue;

  // Overall ripeness blends the most overdue band with ladder + compression energy.
  const ripeness = Math.max(
    0,
    Math.min(
      1,
      (overdue?.exhaustion ?? 0) * 0.55 +
        (analysis?.signals.ascending_ladder?.strength ?? 0) * 0.25 +
        (analysis?.signals.nested?.compression ?? 0) * 0.2,
    ),
  );

  return (
    <AppShell title="Moonshot Finder" subtitle="Band cadence, ripeness and expected time-to-hit">
      <div className="space-y-4">
        <Panel title="Ripeness" subtitle="cadence · ladder · compression fusion" icon={<Rocket className="h-3.5 w-3.5" />} lit>
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center">
            <Ring
              value={ripeness}
              size={168}
              thickness={11}
              label={percent(ripeness)}
              sublabel={ripeness >= 0.66 ? "ripe" : ripeness >= 0.38 ? "building" : "cold"}
            />

            <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Most overdue band"
                value={overdue?.label ?? "—"}
                accent="violet"
                hint={overdue ? `${decimal(overdue.overdue_ratio, 2)}× expected cadence` : "needs more history"}
              />
              <StatTile
                label="Rounds since hit"
                value={integer(overdue?.rounds_since)}
                accent="caution"
                hint={overdue?.expected_gap ? `expected every ${decimal(overdue.expected_gap, 1)}` : "cadence unknown"}
              />
              <StatTile
                label="Moonshot probability"
                value={percent(analysis?.prediction_confidence.moonshot_probability)}
                accent="info"
                progress={analysis?.prediction_confidence.moonshot_probability ?? 0}
                hint={`10x share ${percent(analysis?.distribution["10x"], 1)}`}
              />
              <StatTile
                label="DNA analogues"
                value={integer(dna?.match_count)}
                accent="signal"
                hint={dna?.outcomes.over_10x !== undefined ? `${percent(dna.outcomes.over_10x, 1)} went 10x+` : "no matches yet"}
              />
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-5">
          <Panel
            title="Band ETA"
            subtitle="expected rounds and wall-clock until the next hit"
            icon={<Timer className="h-3.5 w-3.5" />}
            className="lg:col-span-3"
            bodyClassName="p-0"
          >
            {moonshotQuery.isLoading ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : eta.length === 0 ? (
              <div className="p-4">
                <EmptyState compact title="Not enough history" description="At least 20 rounds are needed to estimate cadence." />
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Band</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Since</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Expected</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Remaining</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">ETA</th>
                    <th className="px-4 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ripeness</th>
                  </tr>
                </thead>
                <tbody>
                  {eta.map((row) => (
                    <tr key={row.label} className={cn("border-b border-border/25 hover:bg-muted/20", row.overdue && "bg-caution/6")}>
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold tabular-nums">{row.label}</span>
                          {row.overdue && <span className="chip-caution">overdue</span>}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums">{integer(row.rounds_since)}</td>
                      <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                        {decimal(row.expected_gap, 1)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums">{decimal(row.rounds_remaining, 1)}</td>
                      <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                        {row.eta_seconds !== null ? duration(row.eta_seconds) : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <span className="h-1 w-14 overflow-hidden rounded-full bg-muted">
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

          <Panel title="Range ETA" subtitle="moonshot range predictions with hold probability" className="lg:col-span-2">
            {moonshotQuery.isLoading ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : !analysis?.advanced_features?.moonshot?.eta_data?.range_predictions ? (
              <div className="p-4">
                <EmptyState compact title="ETA data unavailable" description="Requires moonshot scanner with ETA enabled." />
              </div>
            ) : (
              <ul className="space-y-2.5">
                {analysis.advanced_features.moonshot.eta_data.range_predictions.map((pred) => (
                  <li key={pred.target} className="rounded-md border border-border/40 bg-muted/15 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">{multiplier(pred.target)}x</span>
                      <span className={cn(
                        "flex h-6 w-6 items-center justify-center rounded font-mono text-[11px] font-bold",
                        pred.found ? "bg-signal/20 text-signal" : "bg-muted/30 text-muted-foreground"
                      )}>
                        {pred.found ? "✓" : "—"}
                      </span>
                    </div>
                    {pred.found && pred.expected_rounds !== null ? (
                      <>
                        <div className="mt-2 meter-track">
                          <div className="meter-fill bg-violet" style={{ width: `${pred.confidence * 100}%` }} />
                        </div>
                        <p className="mt-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                          ETA {decimal(pred.expected_rounds, 1)} rounds · hold {percent(pred.hold_probability)}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">No historical data</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Range Grades" subtitle="mega-moonshot readiness" className="lg:col-span-2">
            {megaScores.length === 0 ? (
              <EmptyState compact title="Not enough history" />
            ) : (
              <ul className="space-y-2.5">
                {megaScores.map((score) => (
                  <li key={score.range} className="rounded-md border border-border/40 bg-muted/15 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">last {score.range} rounds</span>
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded font-mono text-[11px] font-bold",
                          score.grade === "A" && "bg-signal/20 text-signal",
                          score.grade === "B" && "bg-info/20 text-info",
                          score.grade === "C" && "bg-caution/20 text-caution",
                          score.grade === "D" && "bg-critical/20 text-critical",
                        )}
                      >
                        {score.grade}
                      </span>
                    </div>
                    <div className="mt-2 meter-track">
                      <div className="meter-fill bg-violet" style={{ width: `${score.score * 100}%` }} />
                    </div>
                    <p className="mt-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                      score {percent(score.score, 1)} · peak {multiplier(score.peak)} · compression {percent(score.compression, 0)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Band Cadence Detail" subtitle="hit rate vs observed gap for every threshold" bodyClassName="p-0">
          {!exhaustion || exhaustion.bands.length === 0 ? (
            <div className="p-4">
              <EmptyState compact title="No cadence data" description="Needs at least 10 rounds." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Threshold</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Hits</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Rate</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Expected gap</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Observed gap</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Since</th>
                    <th className="px-4 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {exhaustion.bands.map((band) => (
                    <tr key={band.label} className="border-b border-border/25 hover:bg-muted/20">
                      <td className="px-4 py-2 font-mono text-xs font-semibold tabular-nums">{band.label}</td>
                      <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums">{integer(band.hits)}</td>
                      <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums text-muted-foreground">{percent(band.rate, 2)}</td>
                      <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums">{decimal(band.expected_gap, 1)}</td>
                      <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                        {decimal(band.observed_gap, 1)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums">{integer(band.rounds_since)}</td>
                      <td className="px-4 py-2 text-right">
                        <span
                          className={cn(
                            band.status === "overdue" && "chip-caution",
                            band.status === "due" && "chip-info",
                            band.status === "fresh" && "chip-muted",
                          )}
                        >
                          {band.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
