import { useQuery } from "@tanstack/react-query";
import { Loader2, Rocket, Timer, Activity, TrendingUp, Layers, CheckCircle2, XCircle, ListOrdered } from "lucide-react";

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

  // Megaplan prediction integration
  const megaplanQuery = useQuery({
    queryKey: ["megaplan", source],
    queryFn: () => api.megaplanPrediction(source, 250, true),
    refetchInterval: POLL.realtime, // Faster for real-time updates
  });

  // Moonshot sequence prediction
  const moonshotSequenceQuery = useQuery({
    queryKey: ["moonshot-sequence", source],
    queryFn: () => api.moonshotSequence(source, 1.0, "file"),
    refetchInterval: POLL.analysis, // Faster than before
    enabled: !!source,
  });

  // Overall ripeness blends the most overdue band with ladder + compression energy + megaplan consensus with NaN protection
  const ripeness = Math.max(
    0,
    Math.min(
      1,
      (Number(overdue?.exhaustion) || 0) * 0.45 +
        (Number(analysis?.signals.ascending_ladder?.strength) || 0) * 0.20 +
        (Number(analysis?.signals.nested?.compression) || 0) * 0.15 +
        (Number(megaplanQuery.data?.consensus_score) || 0) * 0.20,
    ),
  );

  return (
    <AppShell title="Moonshot Finder" subtitle="Band cadence, ripeness and expected time-to-hit">
      <div className="space-y-4">
        <Panel title="Ripeness" subtitle="cadence · ladder · compression · megaplan consensus fusion" icon={<Rocket className="h-3.5 w-3.5" />} lit>
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center">
            <Ring
              value={ripeness}
              size={168}
              thickness={11}
              label={percent(ripeness)}
              sublabel={ripeness >= 0.66 ? "ripe" : ripeness >= 0.38 ? "building" : "cold"}
              accent={megaplanQuery.data?.consensus_score > 0.7 ? "signal" : undefined}
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
                value={percent(
                  Math.max(
                    Number(analysis?.prediction_confidence.moonshot_probability) || 0,
                    Number(megaplanQuery.data?.consensus_score) || 0
                  )
                )}
                accent="info"
                progress={Math.max(
                  Number(analysis?.prediction_confidence.moonshot_probability) || 0,
                  Number(megaplanQuery.data?.consensus_score) || 0
                )}
                hint={`10x share ${percent(analysis?.distribution["10x"], 1)} · megaplan ${percent(Number(megaplanQuery.data?.consensus_score) || 0)}`}
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

        {/* Megaplan Prediction Panel */}
        <Panel 
          title="Megaplan Prediction" 
          subtitle="sequence angle · momentum compression · market state consensus" 
          icon={<Activity className="h-3.5 w-3.5" />}
          lit={(Number(megaplanQuery.data?.consensus_score) || 0) > 0.7}
          className="border-l-4 border-l-signal"
        >
          {megaplanQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Consensus Score */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Consensus Score</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${(megaplanQuery.data?.consensus_score || 0) * 100}%`,
                        backgroundColor: (megaplanQuery.data?.consensus_score || 0) > 0.7 ? 'hsl(var(--signal))' : 
                                      (megaplanQuery.data?.consensus_score || 0) > 0.4 ? 'hsl(var(--caution))' : 'hsl(var(--critical))'
                      }}
                    />
                  </div>
                  <span className="font-mono text-xs tabular-nums">{percent(megaplanQuery.data?.consensus_score || 0)}</span>
                </div>
              </div>

              {/* Factor Status */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/15 px-3 py-2">
                  {megaplanQuery.data?.factors.sequence_angle ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-signal" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-critical" />
                  )}
                  <span className="text-[10px] text-muted-foreground">Sequence Angle</span>
                </div>
                <div className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/15 px-3 py-2">
                  {megaplanQuery.data?.factors.momentum_compression ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-signal" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-critical" />
                  )}
                  <span className="text-[10px] text-muted-foreground">Momentum</span>
                </div>
                <div className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/15 px-3 py-2">
                  {megaplanQuery.data?.factors.time_candlestick ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-signal" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-critical" />
                  )}
                  <span className="text-[10px] text-muted-foreground">Time Candle</span>
                </div>
                <div className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/15 px-3 py-2">
                  {megaplanQuery.data?.factors.market_state ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-signal" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-critical" />
                  )}
                  <span className="text-[10px] text-muted-foreground">Market State</span>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">Market State</div>
                  <div className={cn(
                    "font-mono text-xs font-semibold",
                    megaplanQuery.data?.market_state === 'release' && "text-signal",
                    megaplanQuery.data?.market_state === 'compression' && "text-caution",
                    megaplanQuery.data?.market_state === 'transition' && "text-info"
                  )}>
                    {megaplanQuery.data?.market_state}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">Momentum</div>
                  <div className="font-mono text-xs font-semibold">{percent(megaplanQuery.data?.momentum_forecast.current_momentum || 0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">Release Prob</div>
                  <div className="font-mono text-xs font-semibold">{percent(megaplanQuery.data?.momentum_forecast.release_probability || 0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">Upside</div>
                  <div className={cn(
                    "font-mono text-xs font-semibold",
                    (megaplanQuery.data?.next_range_targets?.confidence || 0) > 0.7 && "text-signal",
                    (megaplanQuery.data?.next_range_targets?.confidence || 0) > 0.4 && "text-info",
                    (megaplanQuery.data?.next_range_targets?.confidence || 0) <= 0.4 && "text-muted-foreground"
                  )}>
                    {multiplier(megaplanQuery.data?.next_range_targets?.max || 10)}x
                  </div>
                </div>
              </div>

              {/* Forward Structure */}
              {megaplanQuery.data?.forward_structure && (
                <div className="rounded-md border border-border/40 bg-muted/15 px-3 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-muted-foreground">Forward Structure</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {megaplanQuery.data.forward_structure.direction} · {megaplanQuery.data.forward_structure.angle.toFixed(1)}°
                    </span>
                  </div>
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {megaplanQuery.data.forward_structure.predicted_sequence.slice(0, 5).map((val, i) => (
                      <div key={i} className="flex-shrink-0 rounded bg-background px-2 py-1 border border-border/30">
                        <span className="font-mono text-[10px]">{multiplier(val)}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cluster Prediction */}
              {megaplanQuery.data?.momentum_forecast.cluster_prediction.likely && (
                <div className="flex items-center justify-between rounded-md border border-border/40 bg-muted/15 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-signal" />
                    <span className="text-[10px] text-muted-foreground">Cluster likely in</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-signal">
                    {integer(megaplanQuery.data.momentum_forecast.cluster_prediction.timing)} rounds
                  </span>
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* Moonshot Sequence Prediction Panel */}
        <Panel 
          title="Moonshot Sequence Analysis" 
          subtitle="session-based filtering · sequence deduction · pattern prediction" 
          icon={<ListOrdered className="h-3.5 w-3.5" />}
          lit={moonshotSequenceQuery.data?.prediction?.predicted && moonshotSequenceQuery.data?.prediction?.confidence > 0.7}
          className="border-l-4 border-l-violet"
        >
          {moonshotSequenceQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : moonshotSequenceQuery.data?.status === "error" ? (
            <div className="p-4">
              <EmptyState compact title="Analysis unavailable" description={moonshotSequenceQuery.data?.error || "Unknown error"} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sequence Statistics */}
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">Sessions</div>
                  <div className="font-mono text-xs font-semibold">{integer(moonshotSequenceQuery.data?.sessions_count || 0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">Sequences</div>
                  <div className="font-mono text-xs font-semibold">{integer(moonshotSequenceQuery.data?.sequences_found || 0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">Total Moonshots</div>
                  <div className="font-mono text-xs font-semibold">{integer(moonshotSequenceQuery.data?.total_moonshots || 0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">Peak</div>
                  <div className="font-mono text-xs font-semibold text-violet">{multiplier(moonshotSequenceQuery.data?.peak_multiplier || 0)}x</div>
                </div>
              </div>

              {/* Prediction Section */}
              {moonshotSequenceQuery.data?.prediction && (
                <div className={cn(
                  "rounded-md border px-3 py-2.5",
                  moonshotSequenceQuery.data.prediction.predicted && (Number(moonshotSequenceQuery.data.prediction.confidence) || 0) > 0.7 
                    ? "border-violet/40 bg-violet/10" 
                    : "border-border/40 bg-muted/15"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-muted-foreground">Sequence Prediction</span>
                    <span className={cn(
                      "font-mono text-[10px]",
                      moonshotSequenceQuery.data.prediction.predicted ? "text-violet" : "text-muted-foreground"
                    )}>
                      {moonshotSequenceQuery.data.prediction.predicted ? "Active" : "Inactive"}
                    </span>
                  </div>
                  
                  {moonshotSequenceQuery.data.prediction.predicted ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Confidence</span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div 
                              className="h-full rounded-full bg-violet transition-all"
                              style={{ width: `${(Number(moonshotSequenceQuery.data.prediction.confidence) || 0) * 100}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] tabular-nums">{percent(Number(moonshotSequenceQuery.data.prediction.confidence) || 0)}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[10px] text-muted-foreground mb-0.5">Predicted</div>
                          <div className="font-mono text-xs font-semibold text-violet">{multiplier(Number(moonshotSequenceQuery.data.prediction.predicted_multiplier) || 0)}x</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground mb-0.5">ETA Rounds</div>
                          <div className="font-mono text-xs font-semibold">{integer(Number(moonshotSequenceQuery.data.prediction.estimated_rounds_until) || 0)}</div>
                        </div>
                      </div>
                      
                      <div className="text-[10px] text-muted-foreground">
                        Based on {integer(Number(moonshotSequenceQuery.data.prediction.similar_sequences_count) || 0)} similar sequences · {moonshotSequenceQuery.data.prediction.reason}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground">
                      {moonshotSequenceQuery.data.prediction.reason || "Insufficient similar sequences for prediction"}
                    </div>
                  )}
                </div>
              )}

              {/* Filtering Info */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Filtering threshold: {multiplier(moonshotSequenceQuery.data?.filtering_threshold || 10)}x</span>
                <span>Scale factor: {moonshotSequenceQuery.data?.scale_factor || 1.0}x</span>
              </div>
            </div>
          )}
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
                {/* Megaplan Upside Target */}
                {megaplanQuery.data?.next_range_targets?.max && megaplanQuery.data.next_range_targets.max > 10 && (
                  <li className="rounded-md border border-signal/40 bg-signal/10 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-signal font-semibold">Megaplan Target</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-signal/20 text-signal font-mono text-[11px] font-bold">
                        ✓
                      </span>
                    </div>
                    <div className="mt-2 meter-track">
                      <div className="meter-fill bg-signal" style={{ width: `${megaplanQuery.data.next_range_targets.confidence * 100}%` }} />
                    </div>
                    <p className="mt-1.5 font-mono text-[10px] tabular-nums text-signal">
                      Target {multiplier(megaplanQuery.data.next_range_targets.max)}x · confidence {percent(megaplanQuery.data.next_range_targets.confidence)}
                    </p>
                  </li>
                )}
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

          <Panel title="Range Grades" subtitle="mega-moonshot readiness with megaplan consensus" className="lg:col-span-2">
            {megaScores.length === 0 ? (
              <EmptyState compact title="Not enough history" />
            ) : (
              <ul className="space-y-2.5">
                {/* Megaplan Consensus Grade */}
                {megaplanQuery.data && (
                  <li className="rounded-md border border-signal/40 bg-signal/10 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-signal font-semibold">Megaplan Consensus</span>
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded font-mono text-[11px] font-bold",
                          megaplanQuery.data.consensus_score >= 0.8 && "bg-signal/20 text-signal",
                          megaplanQuery.data.consensus_score >= 0.6 && "bg-info/20 text-info",
                          megaplanQuery.data.consensus_score >= 0.4 && "bg-caution/20 text-caution",
                          megaplanQuery.data.consensus_score < 0.4 && "bg-critical/20 text-critical",
                        )}
                      >
                        {megaplanQuery.data.consensus_score >= 0.8 ? "A" : megaplanQuery.data.consensus_score >= 0.6 ? "B" : megaplanQuery.data.consensus_score >= 0.4 ? "C" : "D"}
                      </span>
                    </div>
                    <div className="mt-2 meter-track">
                      <div className="meter-fill bg-signal" style={{ width: `${megaplanQuery.data.consensus_score * 100}%` }} />
                    </div>
                    <p className="mt-1.5 font-mono text-[10px] tabular-nums text-signal">
                      consensus {percent(megaplanQuery.data.consensus_score)} · upside {multiplier(megaplanQuery.data.next_range_targets.max)}x
                    </p>
                  </li>
                )}
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
