import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Download, Flame, Gauge, Loader2, Rocket, Save, Sparkles, ListOrdered } from "lucide-react";
import { toast } from "sonner";

import { PointsChart } from "@/components/charts/PointsChart";
import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { StateBadge } from "@/components/console/StateBadge";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { AccuracyPanel } from "@/components/panels/AccuracyPanel";
import { BandAnalysisPanel } from "@/components/panels/BandAnalysisPanel";
import { BaselinePanel } from "@/components/panels/BaselinePanel";
import { ForecastPanel } from "@/components/panels/ForecastPanel";
import { MoonshotPanel } from "@/components/panels/MoonshotPanel";
import { PressurePanel } from "@/components/panels/PressurePanel";
import { PredictionsPanel } from "@/components/panels/PredictionsPanel";
import { RoundsFeed } from "@/components/panels/RoundsFeed";
import { SessionPanel } from "@/components/panels/SessionPanel";
import { SignalPanel } from "@/components/panels/SignalPanel";
import { TransitionsPanel } from "@/components/panels/TransitionsPanel";
import { WarningsPanel } from "@/components/panels/WarningsPanel";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { decimal, integer, multiplier, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthProvider";
import { usePlatform } from "@/state/PlatformProvider";

/** The primary operator surface: everything that matters in one screen. */
export default function CommandCenter() {
  const { source, flashRoundId, loading, analysis } = usePlatform();
  const { isOperator } = useAuth();
  const queryClient = useQueryClient();

  const pointsQuery = useQuery({
    queryKey: ["points", source, 260],
    queryFn: () => api.points(source, 260),
    refetchInterval: POLL.analysis,
  });

  const allRoundsQuery = useQuery({
    queryKey: ["command-center-rounds", source],
    queryFn: () => api.rounds(source, 80, 0, "desc", "file"),
    refetchInterval: POLL.rounds,
    staleTime: 1500,
  });

  const megaplanQuery = useQuery({
    queryKey: ["megaplan-prediction", source],
    queryFn: () => api.megaplanPrediction(source, 250, true),
    refetchInterval: POLL.analysis,
    enabled: !!source,
  });

  const moonshotSequenceQuery = useQuery({
    queryKey: ["moonshot-sequence", source],
    queryFn: () => api.moonshotSequence(source, 1.0, "file"),
    refetchInterval: POLL.analysis * 3,
    enabled: !!source,
  });

  const recordForecast = useMutation({
    mutationFn: () => api.recordForecast(source),
    onSuccess: (result) => {
      if (result.recorded) {
        toast.success("Forecast recorded", { description: `Snapshot #${result.forecast_id} will be scored as rounds land.` });
      } else {
        toast.info("Nothing to record", { description: "The forecast engine has no active projection." });
      }
      void queryClient.invalidateQueries({ queryKey: ["analysis", source] });
    },
    onError: (error: Error) => toast.error("Could not record forecast", { description: error.message }),
  });

  const confidence = analysis?.prediction_confidence.confidence ?? 0;
  const streaks = analysis?.streaks;
  const resistance = analysis?.signals.upper_resistance;

  // Blend traditional confidence with megaplan consensus
  const blendedConfidence = Math.max(
    confidence,
    megaplanQuery.data?.consensus_score ?? 0
  );

  // Enhanced moonshot probability with megaplan
  const enhancedMoonshotProbability = Math.max(
    analysis?.prediction_confidence.moonshot_probability ?? 0,
    megaplanQuery.data?.consensus_score ?? 0
  );

  return (
    <AppShell
      title="Command Center"
      subtitle={analysis?.narrative ?? "Live signal, forecast and session telemetry"}
      actions={
        isOperator ? (
          <Button
            size="sm"
            variant="outline"
            className="hidden gap-1.5 sm:inline-flex"
            onClick={() => recordForecast.mutate()}
            disabled={recordForecast.isPending || !analysis?.forecast}
          >
            {recordForecast.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Record forecast
          </Button>
        ) : undefined
      }
    >
      {loading && !analysis ? (
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading engine state…
        </div>
      ) : (
        <div className="space-y-4">
          {/* ---- hero row ---- */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatTile
              label="Market state"
              value={<StateBadge state={analysis?.state} size="lg" pulse={analysis?.state === "Ignition" || analysis?.state === "Moonshot"} />}
              hint={megaplanQuery.data?.market_state ? `${analysis?.state_meta.meaning} · megaplan: ${megaplanQuery.data.market_state}` : analysis?.state_meta.meaning}
              accent="neutral"
              emphasis
            />
            <StatTile
              label="Confidence"
              value={percent(blendedConfidence)}
              accent={blendedConfidence >= 0.66 ? "signal" : blendedConfidence >= 0.38 ? "caution" : "critical"}
              progress={blendedConfidence}
              hint={analysis?.forecast?.confidence_label ? `${analysis.forecast.confidence_label} conviction · megaplan ${percent(megaplanQuery.data?.consensus_score || 0)}` : `blended read · megaplan ${percent(megaplanQuery.data?.consensus_score || 0)}`}
              icon={<Gauge className="h-3.5 w-3.5" />}
            />
            <StatTile
              label="Moonshot probability"
              value={percent(enhancedMoonshotProbability)}
              accent="info"
              progress={enhancedMoonshotProbability}
              hint={
                analysis?.band_exhaustion?.most_overdue
                  ? `${analysis.band_exhaustion.most_overdue.label} ${decimal(analysis.band_exhaustion.most_overdue.overdue_ratio, 2)}x cadence · megaplan ${percent(megaplanQuery.data?.consensus_score || 0)}`
                  : `cadence warming up · megaplan ${percent(megaplanQuery.data?.consensus_score || 0)}`
              }
              icon={<Rocket className="h-3.5 w-3.5" />}
            />
            <StatTile
              label="Ignition probability"
              value={percent(analysis?.prediction_confidence.ignition_probability)}
              accent="signal"
              progress={analysis?.prediction_confidence.ignition_probability ?? 0}
              hint={
                analysis?.signals.nested
                  ? `compression ${percent(analysis.signals.nested.compression)} · megaplan momentum ${percent(megaplanQuery.data?.momentum_forecast?.current_momentum || 0)}`
                  : `no compression measured · megaplan momentum ${percent(megaplanQuery.data?.momentum_forecast?.current_momentum || 0)}`
              }
              icon={<Flame className="h-3.5 w-3.5" />}
            />
            <StatTile
              label="Last multiplier"
              value={multiplier(analysis?.latest.multiplier)}
              accent={(analysis?.latest.multiplier ?? 0) >= 2 ? "signal" : "critical"}
              hint={`${analysis?.latest.band ?? "—"} band · ${analysis?.latest.energy ?? "—"} energy`}
              icon={<Activity className="h-3.5 w-3.5" />}
            />
          </div>

          {/* ---- market chart ---- */}
          <Panel
            title="Point Series"
            subtitle={`${pointsQuery.data?.count ?? 0} rounds · Momento point scale with rolling envelope`}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            actions={
              <Button asChild size="sm" variant="ghost" className="h-7 gap-1.5 px-2 text-[11px]">
                <a href={api.exportCsvUrl(source)} target="_blank" rel="noreferrer">
                  <Download className="h-3 w-3" />
                  CSV
                </a>
              </Button>
            }
            bodyClassName="p-2 pt-3"
            lit
          >
            {pointsQuery.data && pointsQuery.data.series.length > 1 ? (
              <PointsChart series={pointsQuery.data.series} resistance={resistance?.levels ?? []} height={300} />
            ) : (
              <EmptyState
                title="No series to plot"
                description="Ingest rounds from the Ingest console — the chart renders as soon as two rounds exist."
              />
            )}
          </Panel>

          {/* ---- three column body ---- */}
          <div className="grid gap-4 xl:grid-cols-12">
            <div className="space-y-4 xl:col-span-3">
              <SignalPanel signals={analysis?.signals} />
              <WarningsPanel warnings={analysis?.warnings ?? []} />
              <PressurePanel pressure={analysis?.advanced_features?.pressure} />
              <BaselinePanel baseline={analysis?.advanced_features?.baseline} />
              <MoonshotPanel moonshot={analysis?.advanced_features?.moonshot} />
              
              {/* Moonshot Sequence Analysis Panel */}
              <div className={cn(
                "rounded-lg border bg-muted/15 p-3",
                moonshotSequenceQuery.data?.prediction?.predicted && moonshotSequenceQuery.data?.prediction?.confidence > 0.7 && "border-violet/50 bg-violet/10"
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <ListOrdered className={cn(
                    "h-3.5 w-3.5",
                    moonshotSequenceQuery.data?.prediction?.predicted && moonshotSequenceQuery.data?.prediction?.confidence > 0.7 ? "text-violet" : "text-muted-foreground"
                  )} />
                  <div>
                    <p className="text-xs font-semibold">Moonshot Sequences</p>
                    <p className="text-[10px] text-muted-foreground">session filtering · pattern deduction</p>
                  </div>
                </div>
                
                {moonshotSequenceQuery.isLoading ? (
                  <div className="flex h-16 items-center justify-center text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  </div>
                ) : moonshotSequenceQuery.data?.status === "error" ? (
                  <div className="text-[10px] text-muted-foreground">
                    {moonshotSequenceQuery.data?.error || "Analysis unavailable"}
                  </div>
                ) : moonshotSequenceQuery.data ? (
                  <div className="space-y-2">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="text-center">
                        <div className="text-[9px] text-muted-foreground">Sequences</div>
                        <div className="font-mono text-xs font-semibold">{integer(moonshotSequenceQuery.data.sequences_found || 0)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-muted-foreground">Moonshots</div>
                        <div className="font-mono text-xs font-semibold">{integer(moonshotSequenceQuery.data.total_moonshots || 0)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-muted-foreground">Peak</div>
                        <div className="font-mono text-xs font-semibold text-violet">{multiplier(moonshotSequenceQuery.data.peak_multiplier || 0)}x</div>
                      </div>
                    </div>

                    {/* Prediction Status */}
                    {moonshotSequenceQuery.data.prediction && (
                      <div className={cn(
                        "rounded-md border px-2 py-1.5",
                        moonshotSequenceQuery.data.prediction.predicted && moonshotSequenceQuery.data.prediction.confidence > 0.5
                          ? "border-violet/30 bg-violet/5" 
                          : "border-border/30 bg-muted/10"
                      )}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">Prediction</span>
                          <span className={cn(
                            "font-mono text-[10px]",
                            moonshotSequenceQuery.data.prediction.predicted ? "text-violet" : "text-muted-foreground"
                          )}>
                            {moonshotSequenceQuery.data.prediction.predicted 
                              ? `${multiplier(moonshotSequenceQuery.data.prediction.predicted_multiplier || 0)}x` 
                              : "—"}
                          </span>
                        </div>
                        {moonshotSequenceQuery.data.prediction.predicted && (
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-[9px] text-muted-foreground">Confidence</span>
                            <span className="font-mono text-[9px] text-violet">{percent(moonshotSequenceQuery.data.prediction.confidence || 0)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground">
                    No sequence data available
                  </div>
                )}
              </div>
              
              {/* Megaplan Prediction Panel */}
              <div className={cn(
                "rounded-lg border bg-muted/15 p-3",
                megaplanQuery.data?.consensus_score > 0.7 && "border-signal/50 bg-signal/10"
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className={cn(
                    "h-3.5 w-3.5",
                    megaplanQuery.data?.consensus_score > 0.7 ? "text-signal" : "text-muted-foreground"
                  )} />
                  <div>
                    <p className="text-xs font-semibold">Megaplan Prediction</p>
                    <p className="text-[10px] text-muted-foreground">sequence angle · momentum compression · market state consensus</p>
                  </div>
                </div>
                
                {megaplanQuery.isLoading ? (
                  <div className="flex h-20 items-center justify-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : megaplanQuery.data ? (
                  <div className="space-y-3">
                    {/* Consensus Score */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Consensus Score</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${(megaplanQuery.data.consensus_score || 0) * 100}%`,
                              backgroundColor: megaplanQuery.data.consensus_score > 0.7 ? 'hsl(var(--signal))' : 
                                            megaplanQuery.data.consensus_score > 0.4 ? 'hsl(var(--caution))' : 'hsl(var(--critical))'
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs tabular-nums">{percent(megaplanQuery.data.consensus_score || 0)}</span>
                      </div>
                    </div>

                    {/* Factor Status */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/15 px-2 py-1.5">
                        {megaplanQuery.data.factors.sequence_angle ? (
                          <CheckCircle2 className="h-3 w-3 text-signal" />
                        ) : (
                          <XCircle className="h-3 w-3 text-critical" />
                        )}
                        <span className="text-[10px] text-muted-foreground">Sequence</span>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/15 px-2 py-1.5">
                        {megaplanQuery.data.factors.momentum_compression ? (
                          <CheckCircle2 className="h-3 w-3 text-signal" />
                        ) : (
                          <XCircle className="h-3 w-3 text-critical" />
                        )}
                        <span className="text-[10px] text-muted-foreground">Momentum</span>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/15 px-2 py-1.5">
                        {megaplanQuery.data.factors.time_candlestick ? (
                          <CheckCircle2 className="h-3 w-3 text-signal" />
                        ) : (
                          <XCircle className="h-3 w-3 text-critical" />
                        )}
                        <span className="text-[10px] text-muted-foreground">Time Candle</span>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/15 px-2 py-1.5">
                        {megaplanQuery.data.factors.market_state ? (
                          <CheckCircle2 className="h-3 w-3 text-signal" />
                        ) : (
                          <XCircle className="h-3 w-3 text-critical" />
                        )}
                        <span className="text-[10px] text-muted-foreground">Market State</span>
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground mb-0.5">Market State</div>
                        <div className={cn(
                          "font-mono text-xs font-semibold",
                          megaplanQuery.data.market_state === 'release' && "text-signal",
                          megaplanQuery.data.market_state === 'compression' && "text-caution",
                          megaplanQuery.data.market_state === 'transition' && "text-info"
                        )}>
                          {megaplanQuery.data.market_state}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground mb-0.5">Upside</div>
                        <div className={cn(
                          "font-mono text-xs font-semibold",
                          (megaplanQuery.data.next_range_targets?.confidence || 0) > 0.7 && "text-signal",
                          (megaplanQuery.data.next_range_targets?.confidence || 0) > 0.4 && "text-info",
                          (megaplanQuery.data.next_range_targets?.confidence || 0) <= 0.4 && "text-muted-foreground"
                        )}>
                          {multiplier(megaplanQuery.data.next_range_targets?.max || 10)}x
                        </div>
                      </div>
                    </div>

                    {/* Actionable Insight */}
                    {(megaplanQuery.data?.consensus_score || 0) > 0.7 && (
                      <div className="rounded-md border border-signal/30 bg-signal/5 px-2 py-1.5">
                        <p className="text-[10px] text-signal font-medium">
                          High consensus · Consider entering position
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-20 items-center justify-center text-muted-foreground text-xs">
                    No megaplan data available
                  </div>
                )}
              </div>
              
              <BandAnalysisPanel bands={analysis?.advanced_features?.bands} bandRelativity={analysis?.advanced_features?.band_relativity} />
            </div>

            <div className="space-y-4 xl:col-span-6">
              <ForecastPanel
                forecast={analysis?.forecast}
                actions={
                  isOperator ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1.5 px-2 text-[11px]"
                      onClick={() => recordForecast.mutate()}
                      disabled={recordForecast.isPending || !analysis?.forecast}
                    >
                      <Save className="h-3 w-3" />
                      Record
                    </Button>
                  ) : undefined
                }
              />

              <div className="grid gap-4 md:grid-cols-2">
                <PredictionsPanel predictions={analysis?.predictions ?? []} />
                <AccuracyPanel accuracy={analysis?.accuracy} pending={analysis?.pending_forecasts} />
              </div>

              {/* streak strip */}
              <Panel title="Streaks & Cadence" subtitle={`threshold ${multiplier(streaks?.threshold ?? 2)}`} dense>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Low streak", value: streaks?.current_low_streak, accent: "text-critical" },
                    { label: "High streak", value: streaks?.current_high_streak, accent: "text-signal" },
                    { label: "Longest low", value: streaks?.longest_low_streak, accent: "text-muted-foreground" },
                    { label: "Longest high", value: streaks?.longest_high_streak, accent: "text-muted-foreground" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-md border border-border/50 bg-muted/15 px-3 py-2">
                      <p className="hud-label">{item.label}</p>
                      <p className={`mt-0.5 font-mono text-lg font-semibold tabular-nums ${item.accent}`}>
                        {integer(item.value)}
                      </p>
                    </div>
                  ))}
                </div>

                {streaks?.runs && streaks.runs.length > 0 && (
                  <div className="mt-3 flex items-end gap-[3px] overflow-hidden">
                    {streaks.runs.slice(-40).map((run, index) => (
                      <span
                        key={`${index}-${run.kind}-${run.length}`}
                        className={`w-2 rounded-sm ${run.kind === "low" ? "bg-critical/60" : "bg-signal/70"}`}
                        style={{ height: `${Math.min(38, 6 + run.length * 5)}px` }}
                        title={`${run.length} ${run.kind} round${run.length > 1 ? "s" : ""}`}
                      />
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            <div className="space-y-4 xl:col-span-3">
              <RoundsFeed rounds={allRoundsQuery.data?.rounds ?? []} flashRoundId={flashRoundId} limit={80} height="max-h-[440px]" />
              <SessionPanel session={analysis?.session} regime={analysis?.regime} houseEdge={analysis?.house_edge} />
              <TransitionsPanel transitions={analysis?.transitions ?? []} limit={10} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
