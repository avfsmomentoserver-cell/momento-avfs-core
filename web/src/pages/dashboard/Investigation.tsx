import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Loader2, Play, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import type { BacktestConfig } from "@/lib/types";
import { clockTime, decimal, integer, percent } from "@/lib/format";
import { useAuth } from "@/state/AuthProvider";
import { usePlatform } from "@/state/PlatformProvider";

/**
 * Investigation Suite: togglable backtesting framework for testing prediction
 * features against historical data segmented by sessions.
 */
export default function Investigation() {
  const { source } = usePlatform();
  const { isOperator } = useAuth();
  const queryClient = useQueryClient();

  // Configuration state
  const [sessionGap, setSessionGap] = useState<number>(300);
  const [windowSize, setWindowSize] = useState<number>(1000);
  const [minSessionRounds, setMinSessionRounds] = useState<number>(10);
  const [maxRounds, setMaxRounds] = useState<number>(10000);
  const [featureToggles, setFeatureToggles] = useState<Record<string, boolean>>({});

  // Queries
  const runsQuery = useQuery({
    queryKey: ["backtest-runs", source],
    queryFn: () => api.backtestRuns(source, 50),
    refetchInterval: POLL.slow,
  });

  const statusQuery = useQuery({
    queryKey: ["backtest-status"],
    queryFn: () => api.backtestStatus(),
    refetchInterval: POLL.slow,
  });

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.settings(),
    refetchInterval: POLL.slow,
  });

  // Initialize feature toggles from settings
  useState(() => {
    if (settingsQuery.data?.runtime) {
      setFeatureToggles(settingsQuery.data.runtime);
    }
  });

  // Mutations
  const runBacktest = useMutation({
    mutationFn: () => {
      const config: BacktestConfig = {
        session_gap: sessionGap,
        window_size: windowSize,
        min_session_rounds: minSessionRounds,
        max_rounds: maxRounds,
        ingest_method: "file",
        feature_toggles: Object.keys(featureToggles).length > 0 ? featureToggles : undefined,
      };
      return api.backtestRun(source, config as Record<string, unknown>);
    },
    onSuccess: (data) => {
      toast.success("Backtest started", { description: `Run ID: ${data.run_id}` });
      void queryClient.invalidateQueries({ queryKey: ["backtest-runs"] });
    },
    onError: (error: Error) => toast.error("Backtest failed", { description: error.message }),
  });

  const deleteRun = useMutation({
    mutationFn: (runId: number) => api.deleteBacktest(runId),
    onSuccess: () => {
      toast.success("Backtest deleted");
      void queryClient.invalidateQueries({ queryKey: ["backtest-runs"] });
    },
    onError: (error: Error) => toast.error("Delete failed", { description: error.message }),
  });

  const runs = runsQuery.data?.runs ?? [];
  const backtestStatus = statusQuery.data;
  const isBusy = backtestStatus?.status === "busy";

  return (
    <AppShell
      title="Investigation Suite"
      subtitle="Togglable backtesting framework for feature evaluation"
      actions={
        isOperator ? (
          <Button
            size="sm"
            className="gap-1.5 bg-signal font-semibold text-primary-foreground hover:bg-signal/90"
            onClick={() => runBacktest.mutate()}
            disabled={runBacktest.isPending || !isOperator || isBusy}
          >
            {runBacktest.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Run Backtest
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {!isOperator && (
          <p className="rounded-md border border-caution/30 bg-caution/8 px-3 py-2.5 text-[11px] text-caution">
            You are viewing the Investigation Suite read-only. Sign in with an operator account to run backtests.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Backtest runs"
            value={integer(runs.length)}
            accent="signal"
            hint={`total historical runs for ${source}`}
            emphasis
          />
          <StatTile
            label="Running"
            value={integer(backtestStatus?.running_backtests ?? 0)}
            accent={isBusy ? "caution" : "neutral"}
            hint={backtestStatus?.status ?? "available"}
            icon={<Loader2 className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Session gap"
            value={`${integer(sessionGap)}s`}
            accent="info"
            hint="seconds between sessions"
          />
          <StatTile
            label="Window size"
            value={integer(windowSize)}
            accent="violet"
            hint="rounds per backtest window"
          />
        </div>

        <Panel title="Configuration" subtitle="Backtest parameters and feature toggles" icon={<FlaskConical className="h-3.5 w-3.5" />} lit>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Session gap</Label>
                  <span className="font-mono text-xs tabular-nums text-signal">{integer(sessionGap)}s</span>
                </div>
                <Slider value={[sessionGap]} onValueChange={([value]) => setSessionGap(value)} min={30} max={3600} step={30} />
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Seconds of silence that ends a session. Higher values merge more rounds into single sessions.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Window size</Label>
                  <span className="font-mono text-xs tabular-nums text-signal">{integer(windowSize)}</span>
                </div>
                <Slider value={[windowSize]} onValueChange={([value]) => setWindowSize(value)} min={100} max={5000} step={100} />
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Maximum rounds to include in a single backtest window.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Min session rounds</Label>
                  <span className="font-mono text-xs tabular-nums text-signal">{integer(minSessionRounds)}</span>
                </div>
                <Slider value={[minSessionRounds]} onValueChange={([value]) => setMinSessionRounds(value)} min={5} max={100} step={5} />
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Minimum rounds required to include a session in the backtest.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Max rounds</Label>
                  <span className="font-mono text-xs tabular-nums text-signal">{integer(maxRounds)}</span>
                </div>
                <Slider value={[maxRounds]} onValueChange={([value]) => setMaxRounds(value)} min={1000} max={100000} step={1000} />
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Maximum total rounds to process in the backtest.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Feature toggles</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(featureToggles).map(([key, value]) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border/45 bg-muted/12 px-3 py-2.5 transition-colors hover:border-border"
                    >
                      <span className="min-w-0 truncate text-[11px] font-medium">{key}</span>
                      <Switch
                        checked={value}
                        disabled={!isOperator}
                        onCheckedChange={(checked) => setFeatureToggles((prev) => ({ ...prev, [key]: checked }))}
                      />
                    </label>
                  ))}
                </div>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Toggle features on/off to test their impact on prediction accuracy. Leave all enabled for baseline.
                </p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title="Backtest History"
          subtitle={`${integer(runs.length)} historical runs`}
          icon={<Zap className="h-3.5 w-3.5" />}
        >
          {runs.length === 0 ? (
            <div className="p-4">
              <EmptyState compact title="No backtest runs" description="Configure parameters and run a backtest to see results here." />
            </div>
          ) : (
            <div className="no-scrollbar max-h-[500px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-card/95 backdrop-blur">
                  <tr className="border-b border-border/60">
                    <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">ID</th>
                    <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Status</th>
                    <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sessions</th>
                    <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Baseline</th>
                    <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Feature</th>
                    <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Impact</th>
                    <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Created</th>
                    <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-b border-border/25 hover:bg-muted/20">
                      <td className="px-4 py-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">#{run.id}</td>
                      <td className="px-4 py-1.5 text-[10px]">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                            run.status === "completed"
                              ? "bg-signal/20 text-signal"
                              : run.status === "running"
                                ? "bg-caution/20 text-caution"
                                : run.status === "error"
                                  ? "bg-critical/20 text-critical"
                                  : "bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-1.5 font-mono text-[10px] tabular-nums text-foreground/80">
                        {run.sessions_tested}/{run.total_sessions}
                      </td>
                      <td className="px-4 py-1.5 font-mono text-[10px] tabular-nums text-foreground/80">
                        {run.baseline_accuracy !== null ? percent(run.baseline_accuracy) : "—"}
                      </td>
                      <td className="px-4 py-1.5 font-mono text-[10px] tabular-nums text-foreground/80">
                        {run.feature_accuracy !== null ? percent(run.feature_accuracy) : "—"}
                      </td>
                      <td className="px-4 py-1.5 font-mono text-[10px] tabular-nums">
                        {run.impact_score !== null ? (
                          <span className={run.impact_score > 0 ? "text-signal" : run.impact_score < 0 ? "text-critical" : "text-muted-foreground"}>
                            {run.impact_score > 0 ? "+" : ""}
                            {percent(run.impact_score)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                        {clockTime(run.created_at)}
                      </td>
                      <td className="px-4 py-1.5">
                        {isOperator && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-critical"
                            onClick={() => deleteRun.mutate(run.id)}
                            disabled={deleteRun.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
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
