import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Beaker, Loader2, Play, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Sparkline } from "@/components/console/Sparkline";
import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { StateBadge } from "@/components/console/StateBadge";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { RoundsFeed } from "@/components/panels/RoundsFeed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { decimal, integer, multiplier, multiplierColor, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/state/PlatformProvider";

/**
 * Round Testing: inject specific multipliers and watch every engine respond.
 * This is how the state machine and the analyzers get validated by hand.
 */
export default function RoundTesting() {
  const { source, analysis, rounds, flashRoundId } = usePlatform();
  const queryClient = useQueryClient();

  const [sequence, setSequence] = useState<string>("1.05, 1.12, 1.31, 1.08, 1.44, 1.22");
  const [single, setSingle] = useState<string>("2.50");
  const [testSource, setTestSource] = useState<string>("");

  const target = testSource.trim() || source;

  const runQuery = useQuery({
    queryKey: ["plugin-run", target],
    queryFn: () => api.runPlugins(target),
    refetchInterval: POLL.analysis,
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries();
  };

  const inject = useMutation({
    mutationFn: (raw: string) => api.ingest({ source: target, raw }),
    onSuccess: (result) => {
      if (result.imported > 0) {
        toast.success(`${result.imported} test rounds injected`, { description: `into ${target}` });
      } else {
        toast.info("Nothing injected", {
          description: result.duplicates > 0 ? `${result.duplicates} duplicates skipped.` : "No valid multipliers parsed.",
        });
      }
      invalidate();
    },
    onError: (error: Error) => toast.error("Injection failed", { description: error.message }),
  });

  const purge = useMutation({
    mutationFn: () => api.purgeSource(target),
    onSuccess: (result) => {
      toast.success("Test source purged", { description: `${result.deleted} rounds deleted from ${result.source}.` });
      invalidate();
    },
    onError: (error: Error) => toast.error("Purge failed", { description: error.message }),
  });

  const presets: { label: string; description: string; values: string }[] = [
    { label: "Collapse run", description: "descending ceilings, low band", values: "1.82, 1.61, 1.44, 1.29, 1.15, 1.06" },
    { label: "Ascending ladder", description: "rising floor, holding structure", values: "1.62, 1.71, 1.88, 2.04, 2.31, 2.55" },
    { label: "Compression → ignition", description: "tight shelf then release", values: "1.72, 1.78, 1.75, 1.81, 1.77, 8.40" },
    { label: "Bait spike", description: "one spike inside weakness", values: "1.11, 1.24, 1.08, 14.60, 1.13, 1.19" },
    { label: "Post-moonshot fade", description: "big print then exhaustion", values: "34.20, 1.18, 1.06, 1.22, 1.11, 1.09" },
    { label: "Variance shelf", description: "flat, coiling market", values: "2.02, 1.98, 2.05, 1.97, 2.01, 2.03" },
  ];

  const parsedSequence = sequence
    .split(/[,\s]+/)
    .map((token) => Number.parseFloat(token))
    .filter((value) => Number.isFinite(value) && value >= 1);

  return (
    <AppShell title="Round Testing" subtitle="Inject controlled sequences and inspect the engine response">
      <div className="space-y-4">
        <p className="rounded-md border border-caution/30 bg-caution/8 px-3 py-2.5 text-[11px] leading-relaxed text-caution">
          Injected rounds are written to the real database. Use a dedicated test source (for example{" "}
          <code className="font-mono">sandbox</code>) so production history stays clean — register it first on the Sources
          screen, or type it below and it will be created on first ingest.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Resulting state"
            value={<StateBadge state={analysis?.state} size="lg" />}
            hint={analysis?.state_meta.meaning}
            emphasis
          />
          <StatTile label="Confidence" value={percent(analysis?.prediction_confidence.confidence)} accent="signal" progress={analysis?.prediction_confidence.confidence ?? 0} hint="blended read after injection" />
          <StatTile label="Rounds in buffer" value={integer(rounds.length)} accent="info" hint={`source ${source}`} />
          <StatTile
            label="Analyzers firing"
            value={integer(runQuery.data?.results.filter((entry) => entry.signal !== "neutral").length)}
            accent="caution"
            hint={`of ${integer(runQuery.data?.count)} enabled`}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Inject Sequence" subtitle="comma or space separated multipliers, oldest first" icon={<Beaker className="h-3.5 w-3.5" />} lit>
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="test-source" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Target source
                </Label>
                <Input
                  id="test-source"
                  value={testSource}
                  onChange={(event) => setTestSource(event.target.value)}
                  placeholder={source}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground/70">
                  Leave blank to use the active source ({source}).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sequence" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Sequence
                </Label>
                <Input id="sequence" value={sequence} onChange={(event) => setSequence(event.target.value)} className="font-mono text-xs" />
                <p className="text-[10px] text-muted-foreground/70">
                  {parsedSequence.length} valid multiplier{parsedSequence.length === 1 ? "" : "s"} parsed
                </p>
              </div>

              {parsedSequence.length > 1 && (
                <div className="rounded-md border border-border/45 bg-muted/12 px-3 py-2.5">
                  <p className="hud-label mb-1.5">Preview</p>
                  <Sparkline values={parsedSequence} width={340} height={44} className="w-full" />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {parsedSequence.map((value, index) => (
                      <span
                        key={index}
                        className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] tabular-nums"
                        style={{ color: multiplierColor(value) }}
                      >
                        {value.toFixed(2)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="gap-1.5 bg-signal font-semibold text-primary-foreground hover:bg-signal/90"
                  onClick={() => inject.mutate(sequence)}
                  disabled={inject.isPending || parsedSequence.length === 0}
                >
                  {inject.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Inject {parsedSequence.length} rounds
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-critical"
                  onClick={() => purge.mutate()}
                  disabled={purge.isPending}
                >
                  {purge.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Purge {target}
                </Button>
              </div>

              <div className="space-y-2 border-t border-border/50 pt-3">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Single round</Label>
                <div className="flex gap-2">
                  <Input
                    value={single}
                    onChange={(event) => setSingle(event.target.value)}
                    type="number"
                    step="0.01"
                    min="1"
                    className="font-mono text-xs"
                  />
                  <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => inject.mutate(single)} disabled={inject.isPending}>
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Scenario Presets" subtitle="known structures for validating each detector">
            <div className="space-y-2">
              {presets.map((preset) => (
                <div key={preset.label} className="rounded-md border border-border/45 bg-muted/12 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium">{preset.label}</p>
                      <p className="text-[10px] text-muted-foreground">{preset.description}</p>
                      <p className="mt-1 truncate font-mono text-[10px] tabular-nums text-muted-foreground/70">{preset.values}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setSequence(preset.values)}>
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px]"
                        onClick={() => inject.mutate(preset.values)}
                        disabled={inject.isPending}
                      >
                        Run
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel
          title="Analyzer Response"
          subtitle="every enabled analyzer, re-run against the current window"
          actions={
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => void runQuery.refetch()}>
              Re-run
            </Button>
          }
        >
          {(runQuery.data?.results.length ?? 0) === 0 ? (
            <EmptyState compact title="No analyzer output" description="Enable analyzers on the Plugin Inventory screen." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {(runQuery.data?.results ?? []).map((run) => (
                <div
                  key={run.plugin_id}
                  className={cn(
                    "rounded-md border px-3 py-2.5",
                    run.signal === "neutral" ? "border-border/40 bg-muted/10" : "border-signal/30 bg-signal/6",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-[11px] font-medium">{run.name}</span>
                    <span className={run.signal === "neutral" ? "chip-muted" : "chip-signal"}>{run.signal}</span>
                  </div>
                  <div className="mt-2 meter-track">
                    <div
                      className="meter-fill"
                      style={{
                        width: `${run.score * 100}%`,
                        backgroundColor: run.score >= 0.6 ? "hsl(var(--signal))" : run.score >= 0.35 ? "hsl(var(--caution))" : "hsl(var(--critical))",
                      }}
                    />
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                    {percent(run.score, 1)} · {decimal(run.processing_ms, 2)}ms
                  </p>
                  {run.detail && <p className="mt-1 text-[10px] leading-snug text-muted-foreground/80">{String(run.detail)}</p>}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="State Scores" subtitle="how the classifier ranked every state after injection">
            {!analysis?.state_scores || Object.keys(analysis.state_scores).length === 0 ? (
              <EmptyState compact title="No scores" />
            ) : (
              <ul className="space-y-2">
                {Object.entries(analysis.state_scores)
                  .sort((a, b) => b[1] - a[1])
                  .map(([state, score]) => (
                    <li key={state}>
                      <div className="flex items-center justify-between gap-2">
                        <StateBadge state={state} size="sm" />
                        <span className="font-mono text-[11px] tabular-nums">{percent(score, 1)}</span>
                      </div>
                      <div className="mt-1 meter-track">
                        <div
                          className={cn("meter-fill", state === analysis.state ? "bg-signal" : "bg-muted-foreground/50")}
                          style={{ width: `${score * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </Panel>

          <RoundsFeed rounds={rounds} flashRoundId={flashRoundId} limit={30} height="max-h-[320px]" />
        </div>

        {analysis?.narrative && (
          <Panel title="Narrative Output" subtitle="layer 8 — the plain-language reading produced from this data">
            <p className="rounded-md border border-signal/20 bg-signal/6 px-4 py-3 text-sm leading-relaxed text-foreground/90">
              {analysis.narrative}
            </p>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              last {multiplier(analysis.latest.multiplier)} · shape {analysis.shape ?? "—"} · energy {analysis.latest.energy ?? "—"}
            </p>
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
