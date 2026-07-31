import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, FlaskConical, Loader2, Save, SlidersHorizontal, Wand2 } from "lucide-react";
import { toast } from "sonner";

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
import { clockTime, decimal, integer, multiplier, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthProvider";
import { usePlatform } from "@/state/PlatformProvider";

/**
 * Forecast Studio: the full prediction stack in one place — live forecast,
 * transition matrix, ML ensemble, calibration and walk-forward backtesting.
 */
export default function ForecastStudio() {
  const { source, analysis } = usePlatform();
  const { isOperator } = useAuth();
  const queryClient = useQueryClient();

  const transitionsQuery = useQuery({
    queryKey: ["transitions", source],
    queryFn: () => api.transitions(source),
    refetchInterval: POLL.slow,
  });

  const mlQuery = useQuery({
    queryKey: ["ml", source],
    queryFn: () => api.ml(source, "file"),
    refetchInterval: POLL.analysis,
  });

  const historyQuery = useQuery({
    queryKey: ["forecast-history", source],
    queryFn: () => api.forecastHistory(source, 60),
    refetchInterval: POLL.slow,
  });

  const calibrationQuery = useQuery({
    queryKey: ["calibration", source],
    queryFn: () => api.calibrationStatus(source),
    refetchInterval: POLL.slow,
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["analysis", source] });
    void queryClient.invalidateQueries({ queryKey: ["calibration", source] });
    void queryClient.invalidateQueries({ queryKey: ["forecast-history", source] });
  };

  const record = useMutation({
    mutationFn: () => api.recordForecast(source),
    onSuccess: (result) => {
      toast[result.recorded ? "success" : "info"](result.recorded ? "Forecast recorded" : "Nothing to record", {
        description: result.recorded ? `${result.pending} forecasts now awaiting resolution.` : "No active projection.",
      });
      invalidate();
    },
    onError: (error: Error) => toast.error("Record failed", { description: error.message }),
  });

  const calibrate = useMutation({
    mutationFn: () => api.runCalibration(source),
    onSuccess: (result) => {
      const keys = Object.keys(result.changed ?? {});
      if (result.calibrated) {
        toast.success("Calibration complete", {
          description: keys.length > 0 ? `Adjusted ${keys.join(", ")}.` : "Thresholds already aligned with the distribution.",
        });
      } else {
        toast.info("Calibration skipped", { description: String(result.reason ?? "Not enough history.") });
      }
      invalidate();
    },
    onError: (error: Error) => toast.error("Calibration failed", { description: error.message }),
  });

  const backtest = useMutation({
    mutationFn: () => api.runBacktest(source, 1),
    onSuccess: (result) => {
      if (result.ran) {
        toast.success("Backtest complete", {
          description: `${percent(result.accuracy ?? 0, 1)} range accuracy over ${integer(result.tested)} walk-forward samples.`,
        });
      } else {
        toast.info("Backtest skipped", { description: String(result.reason ?? "Not enough history.") });
      }
      invalidate();
    },
    onError: (error: Error) => toast.error("Backtest failed", { description: error.message }),
  });

  const matrix = transitionsQuery.data?.matrix ?? {};
  const states = Object.keys(matrix);
  const ml = mlQuery.data;
  const backtestResult = backtest.data;

  return (
    <AppShell
      title="Forecast Studio"
      subtitle="Markov transitions · percentile ranges · DNA analogues · ML ensemble"
      actions={
        isOperator ? (
          <div className="hidden items-center gap-1.5 sm:flex">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => calibrate.mutate()} disabled={calibrate.isPending}>
              {calibrate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              Calibrate
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => backtest.mutate()} disabled={backtest.isPending}>
              {backtest.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
              Backtest
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ForecastPanel
              forecast={analysis?.forecast}
              actions={
                isOperator ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 px-2 text-[11px]"
                    onClick={() => record.mutate()}
                    disabled={record.isPending || !analysis?.forecast}
                  >
                    {record.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Record
                  </Button>
                ) : undefined
              }
            />
          </div>
          <AccuracyPanel accuracy={analysis?.accuracy} pending={analysis?.pending_forecasts} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <PredictionsPanel predictions={analysis?.predictions ?? []} />

          <Panel
            title="ML Ensemble"
            subtitle={ml?.model ? `${ml.model} · ${integer(ml.samples)} samples` : "logistic blend over engineered features"}
            icon={<BrainCircuit className="h-3.5 w-3.5" />}
          >
            {!ml?.available ? (
              <EmptyState compact title="Ensemble idle" description={ml?.note ?? "Needs at least eight rounds."} />
            ) : (
              <div className="space-y-4">
                {Object.entries(ml.predictions).map(([target, values]) => (
                  <div key={target}>
                    <Meter
                      label={target.replace("over_", "reaches ")}
                      value={values.blended}
                      detail={`model ${percent(values.model, 1)} · empirical ${percent(values.empirical, 1)} · edge ${values.edge >= 0 ? "+" : ""}${percent(values.edge, 1)}`}
                    />
                  </div>
                ))}

                <div className="border-t border-border/50 pt-3">
                  <p className="hud-label mb-1.5">Feature vector</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {Object.entries(ml.features).map(([key, value]) => (
                      <div key={key} className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-mono text-[10px] text-muted-foreground">{key}</span>
                        <span className="font-mono text-[10px] tabular-nums">{decimal(value, 3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Panel>
        </div>

        <Panel
          title="State Transition Matrix"
          subtitle={`row = current state, column = next state · ${integer(transitionsQuery.data?.samples)} samples`}
          icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          bodyClassName="p-0"
        >
          {states.length === 0 ? (
            <div className="p-4">
              <EmptyState compact title="Matrix not available" description="Needs a longer history to estimate transitions." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-4 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">From</th>
                    {states.map((state) => (
                      <th key={state} className="px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {state.slice(0, 4)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {states.map((from) => (
                    <tr key={from} className={cn("border-b border-border/25", analysis?.state === from && "bg-signal/6")}>
                      <td className="px-4 py-1.5 text-[11px] font-medium">
                        {from}
                        {analysis?.state === from && <span className="ml-1.5 chip-signal">now</span>}
                      </td>
                      {states.map((to) => {
                        const value = matrix[from]?.[to] ?? 0;
                        return (
                          <td key={to} className="px-2 py-1.5 text-center">
                            <span
                              className="inline-block min-w-[38px] rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums"
                              style={{
                                backgroundColor: `hsl(var(--signal) / ${Math.min(0.55, value * 1.6)})`,
                                color: value > 0.28 ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                              }}
                            >
                              {(value * 100).toFixed(0)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Calibration" subtitle="threshold fitting against the realised distribution" icon={<Wand2 className="h-3.5 w-3.5" />}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  label="Calibrated"
                  value={calibrationQuery.data?.calibrated ? "YES" : "NO"}
                  accent={calibrationQuery.data?.calibrated ? "signal" : "caution"}
                  hint={`${integer(calibrationQuery.data?.accuracy.total)} resolved forecasts`}
                />
                <StatTile
                  label="Pending"
                  value={integer(calibrationQuery.data?.pending_forecasts)}
                  accent="info"
                  hint={calibrationQuery.data?.last_run ? `last run ${clockTime(calibrationQuery.data.last_run)}` : "never run"}
                />
              </div>

              <div className="space-y-1.5 border-t border-border/50 pt-3">
                <p className="hud-label">Active thresholds</p>
                {Object.entries(calibrationQuery.data?.settings ?? {})
                  .filter(([key]) => key.includes("threshold"))
                  .map(([key, value]) => (
                    <div key={key} className="flex items-baseline justify-between gap-2 text-[11px]">
                      <span className="text-muted-foreground">{key.replace(/_/g, " ")}</span>
                      <span className="font-mono tabular-nums">{multiplier(value)}</span>
                    </div>
                  ))}
              </div>

              {isOperator && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5"
                  onClick={() => calibrate.mutate()}
                  disabled={calibrate.isPending}
                >
                  {calibrate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  Run calibration
                </Button>
              )}
            </div>
          </Panel>

          <Panel title="Walk-Forward Backtest" subtitle="range accuracy over real history" icon={<FlaskConical className="h-3.5 w-3.5" />}>
            {!backtestResult ? (
              <EmptyState
                compact
                title="No backtest run yet"
                description={isOperator ? "Run a backtest to score the forecast range against every historical round." : "Operator access required."}
                action={
                  isOperator ? (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => backtest.mutate()} disabled={backtest.isPending}>
                      {backtest.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
                      Run backtest
                    </Button>
                  ) : undefined
                }
              />
            ) : !backtestResult.ran ? (
              <EmptyState compact title="Backtest skipped" description={backtestResult.reason} />
            ) : (
              <div className="space-y-3.5">
                <Meter
                  label="Range accuracy"
                  value={backtestResult.accuracy ?? 0}
                  detail={`${integer(backtestResult.hits)} hits of ${integer(backtestResult.tested)} samples at horizon ${backtestResult.horizon}`}
                />
                {backtestResult.by_state && (
                  <div className="space-y-1.5 border-t border-border/50 pt-3">
                    <p className="hud-label">By predicted state</p>
                    {Object.entries(backtestResult.by_state)
                      .sort((a, b) => b[1].tested - a[1].tested)
                      .map(([state, bucket]) => (
                        <div key={state} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-muted-foreground">{state}</span>
                          <span className="font-mono tabular-nums">
                            {percent(bucket.accuracy)} <span className="text-muted-foreground/60">({bucket.hits}/{bucket.tested})</span>
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>

        <Panel
          title="Recorded Forecast Ledger"
          subtitle={`${integer(historyQuery.data?.forecasts.length)} snapshots · scored against real outcomes`}
          bodyClassName="p-0"
        >
          {(historyQuery.data?.forecasts.length ?? 0) === 0 ? (
            <div className="p-4">
              <EmptyState
                compact
                title="No recorded forecasts"
                description="Record a forecast from the Command Center or here — accuracy only counts predictions made before the round landed."
              />
            </div>
          ) : (
            <div className="no-scrollbar max-h-[360px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-card/95 backdrop-blur">
                  <tr className="border-b border-border/60">
                    <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Time</th>
                    <th className="px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">State</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Range</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Conf</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Actual</th>
                    <th className="px-4 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {(historyQuery.data?.forecasts ?? []).map((row) => {
                    const resolved = row.resolved === 1;
                    const correct = row.correct === 1;
                    return (
                      <tr key={row.id} className="border-b border-border/25 hover:bg-muted/20">
                        <td className="px-4 py-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                          {clockTime(row.created_at)}
                        </td>
                        <td className="px-2 py-1.5 text-[11px]">{row.predicted_state}</td>
                        <td className="px-2 py-1.5 text-right font-mono text-[11px] tabular-nums">
                          {multiplier(row.range_lo)} — {multiplier(row.range_hi)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                          {percent(row.confidence)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-[11px] tabular-nums">
                          {row.actual_multiplier !== null ? multiplier(row.actual_multiplier) : "—"}
                        </td>
                        <td className="px-4 py-1.5 text-right">
                          {!resolved ? (
                            <span className="chip-muted">pending</span>
                          ) : correct ? (
                            <span className="chip-signal">hit</span>
                          ) : (
                            <span className="chip-critical">miss</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
