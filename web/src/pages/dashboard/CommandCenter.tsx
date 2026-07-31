import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Download, Flame, Gauge, Loader2, Rocket, Save, Sparkles } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { decimal, integer, multiplier, percent } from "@/lib/format";
import { useAuth } from "@/state/AuthProvider";
import { usePlatform } from "@/state/PlatformProvider";

/** The primary operator surface: everything that matters in one screen. */
export default function CommandCenter() {
  const { source, flashRoundId, loading } = usePlatform();
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

  const fileAnalysisQuery = useQuery({
    queryKey: ["command-center-analysis", source],
    queryFn: () => api.analysis(source, 600, "file"),
    refetchInterval: false, // Only update on new round WebSocket events
    staleTime: 30000,
  });

  // Refetch analysis when new rounds arrive via WebSocket
  useEffect(() => {
    if (flashRoundId) {
      void queryClient.invalidateQueries({ queryKey: ["command-center-analysis", source] });
    }
  }, [flashRoundId, source, queryClient]);

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

  const confidence = fileAnalysisQuery.data?.prediction_confidence.confidence ?? 0;
  const streaks = fileAnalysisQuery.data?.streaks;
  const resistance = fileAnalysisQuery.data?.signals.upper_resistance;

  return (
    <AppShell
      title="Command Center"
      subtitle={fileAnalysisQuery.data?.narrative ?? "Live signal, forecast and session telemetry"}
      actions={
        isOperator ? (
          <Button
            size="sm"
            variant="outline"
            className="hidden gap-1.5 sm:inline-flex"
            onClick={() => recordForecast.mutate()}
            disabled={recordForecast.isPending || !fileAnalysisQuery.data?.forecast}
          >
            {recordForecast.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Record forecast
          </Button>
        ) : undefined
      }
    >
      {loading && !fileAnalysisQuery.data ? (
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
              value={<StateBadge state={fileAnalysisQuery.data?.state} size="lg" pulse={fileAnalysisQuery.data?.state === "Ignition" || fileAnalysisQuery.data?.state === "Moonshot"} />}
              hint={fileAnalysisQuery.data?.state_meta.meaning}
              accent="neutral"
              emphasis
            />
            <StatTile
              label="Confidence"
              value={percent(confidence)}
              accent={confidence >= 0.66 ? "signal" : confidence >= 0.38 ? "caution" : "critical"}
              progress={confidence}
              hint={fileAnalysisQuery.data?.forecast?.confidence_label ? `${fileAnalysisQuery.data.forecast.confidence_label} conviction` : "blended read"}
              icon={<Gauge className="h-3.5 w-3.5" />}
            />
            <StatTile
              label="Moonshot probability"
              value={percent(fileAnalysisQuery.data?.prediction_confidence.moonshot_probability)}
              accent="info"
              progress={fileAnalysisQuery.data?.prediction_confidence.moonshot_probability ?? 0}
              hint={
                fileAnalysisQuery.data?.band_exhaustion?.most_overdue
                  ? `${fileAnalysisQuery.data.band_exhaustion.most_overdue.label} ${decimal(fileAnalysisQuery.data.band_exhaustion.most_overdue.overdue_ratio, 2)}x cadence`
                  : "cadence warming up"
              }
              icon={<Rocket className="h-3.5 w-3.5" />}
            />
            <StatTile
              label="Ignition probability"
              value={percent(fileAnalysisQuery.data?.prediction_confidence.ignition_probability)}
              accent="signal"
              progress={fileAnalysisQuery.data?.prediction_confidence.ignition_probability ?? 0}
              hint={
                fileAnalysisQuery.data?.signals.nested
                  ? `compression ${percent(fileAnalysisQuery.data.signals.nested.compression)}`
                  : "no compression measured"
              }
              icon={<Flame className="h-3.5 w-3.5" />}
            />
            <StatTile
              label="Last multiplier"
              value={multiplier(fileAnalysisQuery.data?.latest.multiplier)}
              accent={(fileAnalysisQuery.data?.latest.multiplier ?? 0) >= 2 ? "signal" : "critical"}
              hint={`${fileAnalysisQuery.data?.latest.band ?? "—"} band · ${fileAnalysisQuery.data?.latest.energy ?? "—"} energy`}
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
              <SignalPanel signals={fileAnalysisQuery.data?.signals} />
              <WarningsPanel warnings={fileAnalysisQuery.data?.warnings ?? []} />
              <PressurePanel pressure={fileAnalysisQuery.data?.advanced_features?.pressure} />
              <BaselinePanel baseline={fileAnalysisQuery.data?.advanced_features?.baseline} />
              <MoonshotPanel moonshot={fileAnalysisQuery.data?.advanced_features?.moonshot} />
              <BandAnalysisPanel bands={fileAnalysisQuery.data?.advanced_features?.bands} bandRelativity={fileAnalysisQuery.data?.advanced_features?.band_relativity} />
            </div>

            <div className="space-y-4 xl:col-span-6">
              <ForecastPanel
                forecast={fileAnalysisQuery.data?.forecast}
                actions={
                  isOperator ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1.5 px-2 text-[11px]"
                      onClick={() => recordForecast.mutate()}
                      disabled={recordForecast.isPending || !fileAnalysisQuery.data?.forecast}
                    >
                      <Save className="h-3 w-3" />
                      Record
                    </Button>
                  ) : undefined
                }
              />

              <div className="grid gap-4 md:grid-cols-2">
                <PredictionsPanel predictions={fileAnalysisQuery.data?.predictions ?? []} />
                <AccuracyPanel accuracy={fileAnalysisQuery.data?.accuracy} pending={fileAnalysisQuery.data?.pending_forecasts} />
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
              <SessionPanel session={fileAnalysisQuery.data?.session} regime={fileAnalysisQuery.data?.regime} houseEdge={fileAnalysisQuery.data?.house_edge} />
              <TransitionsPanel transitions={fileAnalysisQuery.data?.transitions ?? []} limit={10} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
