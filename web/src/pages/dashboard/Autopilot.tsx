import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gauge, Loader2, Play, RotateCcw, Square, Zap } from "lucide-react";
import { toast } from "sonner";

import { EquityChart } from "@/components/charts/EquityChart";
import { EmptyState } from "@/components/console/EmptyState";
import { Meter } from "@/components/console/Meter";
import { Panel } from "@/components/console/Panel";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { clockTime, currency, decimal, integer, multiplier, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthProvider";
import { usePlatform } from "@/state/PlatformProvider";

const WEIGHT_KEYS = [
  { key: "ceiling_analyzer_weight", label: "Ceiling analyzer", toggle: "enable_ceiling_analyzer" },
  { key: "gap_swing_analyzer_weight", label: "Gap & swing", toggle: "enable_gap_swing_analyzer" },
  { key: "linguistic_analysis_weight", label: "Linguistic", toggle: "enable_linguistic_analysis" },
] as const;

/**
 * Autopilot: a paper-trading decision recorder. It writes what the platform
 * would have done, then scores it against the round that actually landed.
 */
export default function Autopilot() {
  const { source } = usePlatform();
  const { isOperator } = useAuth();
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ["autopilot-status", source],
    queryFn: () => api.autopilotStatus(source),
    refetchInterval: POLL.analysis,
  });

  const decisionsQuery = useQuery({
    queryKey: ["autopilot-decisions", source],
    queryFn: () => api.autopilotDecisions(source, 120),
    refetchInterval: POLL.rounds,
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["autopilot-status", source] });
    void queryClient.invalidateQueries({ queryKey: ["autopilot-decisions", source] });
  };

  const start = useMutation({
    mutationFn: () => api.autopilotStart(),
    onSuccess: () => {
      toast.success("Autopilot armed", { description: "Decisions will be recorded and scored automatically." });
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not arm autopilot", { description: error.message }),
  });

  const stop = useMutation({
    mutationFn: () => api.autopilotStop(),
    onSuccess: () => {
      toast.info("Autopilot disarmed");
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not disarm", { description: error.message }),
  });

  const evaluate = useMutation({
    mutationFn: () => api.autopilotEvaluate(source),
    onSuccess: (result) => {
      const decision = result.decision as { action?: string; reason?: string; recorded?: boolean };
      toast.success(`Decision: ${decision.action ?? "—"}`, { description: decision.reason ?? undefined });
      invalidate();
    },
    onError: (error: Error) => toast.error("Evaluation failed", { description: error.message }),
  });

  const reset = useMutation({
    mutationFn: () => api.autopilotReset(source),
    onSuccess: (result) => {
      toast.success("Ledger cleared", { description: `${result.deleted} decisions removed.` });
      invalidate();
    },
    onError: (error: Error) => toast.error("Reset failed", { description: error.message }),
  });

  const updateConfig = useMutation({
    mutationFn: (patch: Record<string, string | number | boolean>) => api.updateAutopilotConfig(patch),
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error("Config update failed", { description: error.message }),
  });

  const status = statusQuery.data;
  const config = status?.config ?? {};
  const decisions = decisionsQuery.data?.decisions ?? [];
  const equity = decisionsQuery.data?.equity_curve ?? [];

  return (
    <AppShell
      title="Autopilot"
      subtitle="Recorded decisions, measured outcomes — paper execution only"
      actions={
        isOperator ? (
          <div className="hidden items-center gap-1.5 sm:flex">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => evaluate.mutate()} disabled={evaluate.isPending}>
              {evaluate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Evaluate now
            </Button>
            {status?.is_active ? (
              <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => stop.mutate()} disabled={stop.isPending}>
                <Square className="h-3.5 w-3.5" />
                Disarm
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-1.5 bg-signal font-semibold text-primary-foreground hover:bg-signal/90"
                onClick={() => start.mutate()}
                disabled={start.isPending}
              >
                <Play className="h-3.5 w-3.5" />
                Arm
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile
            label="Status"
            value={status?.is_active ? "ARMED" : "IDLE"}
            accent={status?.is_active ? "signal" : "neutral"}
            hint={status?.is_active ? "recording every decision cycle" : "decisions are previewed but not stored"}
            icon={<Gauge className="h-3.5 w-3.5" />}
            emphasis
          />
          <StatTile
            label="Total P&L"
            value={currency(status?.total_pnl)}
            accent={(status?.total_pnl ?? 0) >= 0 ? "signal" : "critical"}
            hint={`today ${currency(status?.daily_pnl)}`}
          />
          <StatTile
            label="Win rate"
            value={percent(status?.win_rate, 1)}
            accent={(status?.win_rate ?? 0) >= 0.5 ? "signal" : "caution"}
            progress={status?.win_rate ?? 0}
            hint={`${integer(status?.total_trades)} settled trades`}
          />
          <StatTile
            label="Consecutive losses"
            value={integer(status?.consecutive_losses)}
            accent={(status?.consecutive_losses ?? 0) >= 3 ? "critical" : "neutral"}
            hint={`limit ${integer(Number(config.max_consecutive_losses ?? 3))} · risk ${status?.risk_level ?? "—"}`}
          />
          <StatTile
            label="Profit factor"
            value={status?.profit_factor !== null && status?.profit_factor !== undefined ? decimal(status.profit_factor, 2) : "—"}
            accent="info"
            hint={`avg win ${currency(status?.avg_win)} · avg loss ${currency(status?.avg_loss)}`}
          />
        </div>

        <Panel
          title="Equity Curve"
          subtitle={`${integer(equity.length)} settled decisions · cumulative paper P&L`}
          bodyClassName="p-2 pt-3"
          lit
          actions={
            isOperator && decisions.length > 0 ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 px-2 text-[11px] text-critical"
                onClick={() => reset.mutate()}
                disabled={reset.isPending}
              >
                <RotateCcw className="h-3 w-3" />
                Clear ledger
              </Button>
            ) : undefined
          }
        >
          {equity.length > 1 ? (
            <EquityChart points={equity} height={260} />
          ) : (
            <EmptyState
              title="No settled decisions yet"
              description="Arm the autopilot, or run a single evaluation — the curve builds as rounds resolve each decision."
              action={
                isOperator ? (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => evaluate.mutate()} disabled={evaluate.isPending}>
                    <Zap className="h-3.5 w-3.5" />
                    Evaluate now
                  </Button>
                ) : undefined
              }
            />
          )}
        </Panel>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Analyzer Weights" subtitle="how the composite signal is blended">
            <div className="space-y-5">
              {WEIGHT_KEYS.map((entry) => {
                const enabled = Boolean(config[entry.toggle]);
                const weight = Number(config[entry.key] ?? 0);
                return (
                  <div key={entry.key} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                        <Switch
                          checked={enabled}
                          disabled={!isOperator || updateConfig.isPending}
                          onCheckedChange={(checked) => updateConfig.mutate({ [entry.toggle]: checked })}
                          className="scale-90"
                        />
                        {entry.label}
                      </Label>
                      <span className={cn("font-mono text-xs tabular-nums", enabled ? "text-signal" : "text-muted-foreground/50")}>
                        {percent(weight, 0)}
                      </span>
                    </div>
                    <Slider
                      value={[weight]}
                      onValueChange={([value]) => updateConfig.mutate({ [entry.key]: value })}
                      min={0}
                      max={1}
                      step={0.05}
                      disabled={!isOperator || !enabled}
                    />
                  </div>
                );
              })}

              <div className="space-y-2 border-t border-border/50 pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Min confidence</Label>
                  <span className="font-mono text-xs tabular-nums text-caution">
                    {percent(Number(config.min_confidence_threshold ?? 0.45))}
                  </span>
                </div>
                <Slider
                  value={[Number(config.min_confidence_threshold ?? 0.45)]}
                  onValueChange={([value]) => updateConfig.mutate({ min_confidence_threshold: value })}
                  min={0.1}
                  max={0.9}
                  step={0.01}
                  disabled={!isOperator}
                />
                <p className="text-[10px] leading-relaxed text-muted-foreground/70">
                  Entries below this confidence are downgraded to a prepare signal.
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Last Decision" subtitle={status?.last_decision ? clockTime(status.last_decision.timestamp) : "no decisions yet"} className="xl:col-span-2">
            {!status?.last_decision ? (
              <EmptyState compact title="No decision recorded" description="Run an evaluation to produce the first entry." />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "chip",
                      status.last_decision.action === "ENTER" && "chip-signal",
                      status.last_decision.action === "PREPARE" && "chip-info",
                      status.last_decision.action === "WAIT" && "chip-caution",
                      status.last_decision.action === "STAND_DOWN" && "chip-critical",
                    )}
                  >
                    {status.last_decision.action}
                  </span>
                  <span className="chip-muted">{status.last_decision.primary_signal ?? "—"}</span>
                  {status.last_decision.resolved ? (
                    <span className={status.last_decision.won ? "chip-signal" : "chip-critical"}>
                      {status.last_decision.won ? "won" : "lost"} {currency(status.last_decision.pnl)}
                    </span>
                  ) : (
                    <span className="chip-muted">pending</span>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Size", value: currency(status.last_decision.position_size) },
                    { label: "Entry", value: multiplier(status.last_decision.entry_point) },
                    { label: "Target", value: multiplier(status.last_decision.exit_point) },
                    { label: "Stop", value: multiplier(status.last_decision.stop_loss) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-md border border-border/45 bg-muted/12 px-3 py-2">
                      <dt className="hud-label">{item.label}</dt>
                      <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{item.value}</dd>
                    </div>
                  ))}
                </dl>

                {status.last_decision.contributing_signals.length > 0 && (
                  <div className="space-y-2.5 border-t border-border/50 pt-3">
                    <p className="hud-label">Signal contributions</p>
                    {status.last_decision.contributing_signals.map((signal) => (
                      <Meter
                        key={signal.name}
                        label={signal.name.replace(/_/g, " ")}
                        value={signal.score}
                        detail={`weight ${percent(signal.weight, 0)} · weighted ${decimal(signal.score * signal.weight, 3)}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Decision Ledger" subtitle={`${integer(decisions.length)} entries`} bodyClassName="p-0">
          {decisions.length === 0 ? (
            <div className="p-4">
              <EmptyState compact title="Ledger empty" description="Every recorded decision and its measured outcome appears here." />
            </div>
          ) : (
            <div className="no-scrollbar max-h-[440px] overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="sticky top-0 bg-card/95 backdrop-blur">
                  <tr className="border-b border-border/60">
                    <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Time</th>
                    <th className="px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Action</th>
                    <th className="px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Signal</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Size</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Target</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Conf</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">P&L</th>
                    <th className="px-4 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {decisions.map((decision) => (
                    <tr key={decision.id} className="border-b border-border/25 hover:bg-muted/20">
                      <td className="px-4 py-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">{clockTime(decision.timestamp)}</td>
                      <td className="px-2 py-1.5">
                        <span
                          className={cn(
                            "font-mono text-[10px] font-semibold uppercase tracking-wider",
                            decision.action === "ENTER" && "text-signal",
                            decision.action === "PREPARE" && "text-info",
                            decision.action === "WAIT" && "text-caution",
                            decision.action === "STAND_DOWN" && "text-critical",
                          )}
                        >
                          {decision.action}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-[11px] text-muted-foreground">{decision.primary_signal ?? "—"}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-[11px] tabular-nums">{currency(decision.position_size)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-[11px] tabular-nums">{multiplier(decision.exit_point)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                        {percent(decision.confidence)}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-1.5 text-right font-mono text-[11px] font-semibold tabular-nums",
                          (decision.pnl ?? 0) > 0 && "text-signal",
                          (decision.pnl ?? 0) < 0 && "text-critical",
                        )}
                      >
                        {decision.pnl !== null ? currency(decision.pnl) : "—"}
                      </td>
                      <td className="px-4 py-1.5 text-right">
                        {!decision.resolved ? (
                          <span className="chip-muted">open</span>
                        ) : decision.won === null ? (
                          <span className="chip-muted">n/a</span>
                        ) : decision.won ? (
                          <span className="chip-signal">won</span>
                        ) : (
                          <span className="chip-critical">lost</span>
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
