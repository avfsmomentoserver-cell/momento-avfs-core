import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Compass, Gauge, Loader2, ShieldAlert, Timer, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { StateBadge } from "@/components/console/StateBadge";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { currency, decimal, duration, integer, multiplier, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthProvider";
import { usePlatform } from "@/state/PlatformProvider";

const ACTION_STYLE: Record<string, string> = {
  ENTER: "border-signal/40 bg-signal/10 text-signal",
  PREPARE: "border-info/40 bg-info/10 text-info",
  WAIT: "border-caution/40 bg-caution/10 text-caution",
  STAND_DOWN: "border-critical/40 bg-critical/10 text-critical",
};

const SEVERITY_STYLE: Record<string, string> = {
  high: "border-critical/35 bg-critical/10 text-critical",
  medium: "border-caution/35 bg-caution/10 text-caution",
  low: "border-info/30 bg-info/8 text-info",
};

/** Decision orchestrator: four engines collapsed into one instruction. */
export default function Orchestrator() {
  const { source } = usePlatform();
  const { isOperator } = useAuth();
  const queryClient = useQueryClient();

  const planQuery = useQuery({
    queryKey: ["orchestrator", source],
    queryFn: () => api.orchestrator(source),
    refetchInterval: POLL.analysis,
  });

  const [bankroll, setBankroll] = useState<string>("1000");
  const [baseSize, setBaseSize] = useState<string>("10");
  const [minConfidence, setMinConfidence] = useState<number>(0.45);
  const [riskPerRound, setRiskPerRound] = useState<number>(0.02);
  const [sizingMethod, setSizingMethod] = useState<string>("confidence_scaled");
  const [moduleId, setModuleId] = useState<string>("default");

  // Seed the form from the server once the plan arrives.
  useEffect(() => {
    const settings = planQuery.data?.settings;
    if (!settings) return;
    setBankroll(String(settings.bankroll ?? 1000));
    setBaseSize(String(settings.base_position_size ?? 10));
    setMinConfidence(Number(settings.min_confidence_threshold ?? 0.45));
    setRiskPerRound(Number(settings.max_risk_per_round ?? 0.02));
    setSizingMethod(String(settings.position_sizing_method ?? "confidence_scaled"));
    setModuleId(String(settings.module ?? "default"));
  }, [planQuery.data?.settings]);

  const saveSettings = useMutation({
    mutationFn: () =>
      api.updateOrchestratorSettings({
        module: moduleId,
        bankroll: Number(bankroll) || 0,
        base_position_size: Number(baseSize) || 0,
        min_confidence_threshold: minConfidence,
        max_risk_per_round: riskPerRound,
        position_sizing_method: sizingMethod,
      }),
    onSuccess: () => {
      toast.success("Orchestrator updated");
      void queryClient.invalidateQueries({ queryKey: ["orchestrator", source] });
    },
    onError: (error: Error) => toast.error("Update failed", { description: error.message }),
  });

  const plan = planQuery.data;
  const instruction = plan?.instruction;
  const risk = plan?.risk;

  return (
    <AppShell title="Decision Orchestrator" subtitle="Patience · speed · risk · mistake prevention">
      {planQuery.isLoading ? (
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Building execution plan…
        </div>
      ) : !plan || !instruction ? (
        <EmptyState title="No plan available" description="Ingest rounds so the orchestrator has structure to reason about." />
      ) : (
        <div className="space-y-4">
          {/* ---- the instruction ---- */}
          <section className={cn("panel panel-lit scanline relative overflow-hidden border p-6", ACTION_STYLE[instruction.action])}>
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]">{instruction.action.replace("_", " ")}</span>
                  <StateBadge state={plan.state} size="sm" />
                  <span className="chip-muted">{plan.module.label}</span>
                </div>
                <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-foreground">{instruction.headline}</h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{instruction.detail}</p>
                {plan.narrative && <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-muted-foreground/70">{plan.narrative}</p>}
              </div>

              <dl className="grid shrink-0 grid-cols-3 gap-4 lg:gap-6">
                <div className="text-center">
                  <dt className="hud-label">Size</dt>
                  <dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground">
                    {currency(instruction.position_size)}
                  </dd>
                </div>
                <div className="text-center">
                  <dt className="hud-label">Target</dt>
                  <dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-signal">
                    {multiplier(instruction.target_multiplier)}
                  </dd>
                </div>
                <div className="text-center">
                  <dt className="hud-label">Stop</dt>
                  <dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-critical">
                    {multiplier(instruction.stop_multiplier)}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* ---- engine readouts ---- */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Confidence"
              value={percent(instruction.confidence)}
              accent={instruction.confidence_label === "HIGH" ? "signal" : instruction.confidence_label === "MEDIUM" ? "caution" : "critical"}
              progress={instruction.confidence}
              hint={`${instruction.confidence_label} conviction`}
              icon={<Gauge className="h-3.5 w-3.5" />}
            />
            <StatTile
              label="Patience"
              value={plan.patience.wait_rounds === 0 ? "ACT" : `+${plan.patience.wait_rounds}`}
              accent={plan.patience.verdict === "act_now" ? "signal" : plan.patience.verdict === "prepare" ? "info" : "caution"}
              hint={plan.patience.reason}
              icon={<Timer className="h-3.5 w-3.5" />}
            />
            <StatTile
              label="Exit tempo"
              value={plan.speed.tempo.toUpperCase()}
              accent="info"
              hint={
                plan.speed.exit_window_secs
                  ? `${duration(plan.speed.exit_window_secs)} window · round ${decimal(plan.speed.avg_round_secs, 1)}s`
                  : plan.speed.reason
              }
            />
            <StatTile
              label="Risk level"
              value={(risk?.risk_level ?? "—").toUpperCase()}
              accent={risk?.risk_level === "critical" ? "critical" : risk?.risk_level === "elevated" ? "caution" : "signal"}
              hint={`cap ${currency(risk?.max_risk_per_round)} per round · daily ${currency(risk?.daily_loss_limit)}`}
              icon={<ShieldAlert className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {/* ---- guardrails ---- */}
            <Panel title="Mistake Prevention" subtitle={`${plan.mistake_prevention.length} guardrails firing`} icon={<ShieldAlert className="h-3.5 w-3.5" />}>
              {plan.mistake_prevention.length === 0 ? (
                <div className="flex items-center gap-2.5 rounded-md border border-signal/25 bg-signal/8 px-3 py-2.5">
                  <p className="text-xs text-signal/90">No behavioural risks detected in the current setup.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {plan.mistake_prevention.map((entry) => (
                    <li key={entry.code} className={cn("rounded-md border px-3 py-2", SEVERITY_STYLE[entry.severity])}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em]">{entry.severity}</span>
                        <span className="font-mono text-[9px] text-current/60">{entry.code}</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-foreground/85">{entry.message}</p>
                    </li>
                  ))}
                </ul>
              )}

              {risk?.blocked && (
                <div className="mt-3 space-y-1.5 rounded-md border border-critical/35 bg-critical/10 px-3 py-2.5">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-critical">Hard blocks</p>
                  {risk.blocks.map((block) => (
                    <p key={block} className="text-[11px] leading-snug text-critical/90">
                      {block}
                    </p>
                  ))}
                </div>
              )}
            </Panel>

            {/* ---- module ---- */}
            <Panel title="Execution Module" subtitle="how aggressively the plan is built" icon={<Compass className="h-3.5 w-3.5" />}>
              <div className="space-y-2.5">
                {plan.modules_available.map((module) => {
                  const selected = module.id === moduleId;
                  return (
                    <button
                      key={module.id}
                      type="button"
                      disabled={!isOperator}
                      onClick={() => setModuleId(module.id)}
                      className={cn(
                        "w-full rounded-md border px-3 py-2.5 text-left transition-colors",
                        selected ? "border-signal/45 bg-signal/8" : "border-border/50 bg-muted/12 hover:border-border",
                        !isOperator && "cursor-default opacity-80",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-xs font-semibold", selected && "text-signal")}>{module.label}</span>
                        {selected && <span className="chip-signal">active</span>}
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{module.description}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className="chip-muted">min conf {percent(module.min_confidence)}</span>
                        <span className="chip-muted">size ×{decimal(module.size_multiplier, 1)}</span>
                        <span className="chip-muted">target {multiplier(module.target_multiplier)}</span>
                        <span className="chip-muted">max losses {module.max_consecutive_losses}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Panel>

            {/* ---- risk config ---- */}
            <Panel
              title="Risk Configuration"
              subtitle={isOperator ? "changes apply to every future plan" : "operator access required to edit"}
              icon={<Wallet className="h-3.5 w-3.5" />}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="bankroll" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Bankroll
                    </Label>
                    <Input
                      id="bankroll"
                      type="number"
                      min={0}
                      value={bankroll}
                      disabled={!isOperator}
                      onChange={(event) => setBankroll(event.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="base-size" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Base size
                    </Label>
                    <Input
                      id="base-size"
                      type="number"
                      min={0}
                      value={baseSize}
                      disabled={!isOperator}
                      onChange={(event) => setBaseSize(event.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Min confidence</Label>
                    <span className="font-mono text-xs tabular-nums text-signal">{percent(minConfidence)}</span>
                  </div>
                  <Slider
                    value={[minConfidence]}
                    onValueChange={([value]) => setMinConfidence(value)}
                    min={0.1}
                    max={0.9}
                    step={0.01}
                    disabled={!isOperator}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Max risk / round</Label>
                    <span className="font-mono text-xs tabular-nums text-caution">{percent(riskPerRound, 1)}</span>
                  </div>
                  <Slider
                    value={[riskPerRound]}
                    onValueChange={([value]) => setRiskPerRound(value)}
                    min={0.002}
                    max={0.1}
                    step={0.002}
                    disabled={!isOperator}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Sizing method</Label>
                  <div className="flex gap-1.5">
                    {["fixed", "confidence_scaled", "kelly"].map((method) => (
                      <button
                        key={method}
                        type="button"
                        disabled={!isOperator}
                        onClick={() => setSizingMethod(method)}
                        className={cn(
                          "flex-1 rounded-md border px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                          sizingMethod === method ? "border-signal/45 bg-signal/10 text-signal" : "border-border/50 text-muted-foreground hover:border-border",
                        )}
                      >
                        {method === "confidence_scaled" ? "conf" : method}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted-foreground/70">
                    Kelly uses a quarter-fraction against the forecast range's implied odds.
                  </p>
                </div>

                {isOperator && (
                  <Button
                    size="sm"
                    className="w-full gap-1.5 bg-signal font-semibold text-primary-foreground hover:bg-signal/90"
                    onClick={() => saveSettings.mutate()}
                    disabled={saveSettings.isPending}
                  >
                    {saveSettings.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save configuration
                  </Button>
                )}

                <dl className="grid grid-cols-2 gap-2 border-t border-border/50 pt-3 text-center">
                  <div>
                    <dt className="hud-label">Suggested</dt>
                    <dd className="mt-0.5 font-mono text-sm tabular-nums">{currency(risk?.suggested_size)}</dd>
                  </div>
                  <div>
                    <dt className="hud-label">Approved</dt>
                    <dd className={cn("mt-0.5 font-mono text-sm tabular-nums", risk?.blocked ? "text-critical" : "text-signal")}>
                      {currency(risk?.position_size)}
                    </dd>
                  </div>
                </dl>
              </div>
            </Panel>
          </div>

          <Panel title="Engine Trace" subtitle="how each sub-engine reached its verdict">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { title: "Patience engine", body: plan.patience.reason, meta: `bias ×${decimal(plan.patience.patience_bias, 2)} · verdict ${plan.patience.verdict}` },
                { title: "Speed engine", body: plan.speed.reason, meta: `delay ${integer(plan.speed.execution_delay_ms)}ms · tempo ${plan.speed.tempo}` },
                {
                  title: "Risk engine",
                  body: risk?.blocked ? risk.blocks.join(" ") : `Sizing via ${risk?.sizing_method} against a ${currency(risk?.bankroll)} bankroll.`,
                  meta: `level ${risk?.risk_level} · cap ${currency(risk?.max_risk_per_round)}`,
                },
              ].map((entry) => (
                <div key={entry.title} className="rounded-md border border-border/45 bg-muted/12 px-3 py-2.5">
                  <p className="hud-label">{entry.title}</p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-foreground/85">{entry.body}</p>
                  <p className="mt-1.5 font-mono text-[10px] text-muted-foreground/70">{entry.meta}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
