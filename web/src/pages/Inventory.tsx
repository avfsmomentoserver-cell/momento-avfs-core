import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Blocks, Loader2, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/console/EmptyState";
import { Meter } from "@/components/console/Meter";
import { Panel } from "@/components/console/Panel";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { decimal, integer, percent, relativeTime, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthProvider";
import { usePlatform } from "@/state/PlatformProvider";

/** Plug-and-play analyzer registry with live weights and run history. */
export default function Inventory() {
  const { source } = usePlatform();
  const { isOperator } = useAuth();
  const queryClient = useQueryClient();

  const [creating, setCreating] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [base, setBase] = useState<string>("ignition");
  const [description, setDescription] = useState<string>("");
  const [weight, setWeight] = useState<number>(1);
  const [threshold, setThreshold] = useState<number>(0.5);

  const inventoryQuery = useQuery({
    queryKey: ["inventory"],
    queryFn: () => api.inventory(),
    refetchInterval: POLL.slow,
  });

  const runQuery = useQuery({
    queryKey: ["plugin-run", source],
    queryFn: () => api.runPlugins(source),
    refetchInterval: POLL.analysis,
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["inventory"] });
    void queryClient.invalidateQueries({ queryKey: ["plugin-run", source] });
  };

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => api.togglePlugin(id, enabled),
    onSuccess: (result) => {
      toast.success(`${result.plugin.name} ${result.plugin.enabled ? "enabled" : "disabled"}`);
      invalidate();
    },
    onError: (error: Error) => toast.error("Toggle failed", { description: error.message }),
  });

  const configure = useMutation({
    mutationFn: ({ id, config }: { id: string; config: Record<string, unknown> }) => api.configurePlugin(id, config),
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error("Config update failed", { description: error.message }),
  });

  const create = useMutation({
    mutationFn: () =>
      api.createPlugin({
        name: name.trim(),
        base,
        description: description.trim() || undefined,
        config: { weight, threshold },
      }),
    onSuccess: (result) => {
      toast.success("Analyzer created", { description: `${result.plugin.name} is live and enabled.` });
      setCreating(false);
      setName("");
      setDescription("");
      invalidate();
    },
    onError: (error: Error) => toast.error("Creation failed", { description: error.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deletePlugin(id),
    onSuccess: (result) => {
      toast.success("Analyzer removed", { description: result.deleted });
      invalidate();
    },
    onError: (error: Error) => toast.error("Delete failed", { description: error.message }),
  });

  const plugins = inventoryQuery.data?.plugins ?? [];
  const stats = inventoryQuery.data?.statistics;
  const runs = runQuery.data?.results ?? [];

  const grouped = plugins.reduce<Record<string, typeof plugins>>((acc, plugin) => {
    const list = acc[plugin.category] ?? [];
    list.push(plugin);
    acc[plugin.category] = list;
    return acc;
  }, {});

  return (
    <AppShell
      title="Plugin Inventory"
      subtitle="Every analyzer is registered, weighted and measured"
      actions={
        isOperator ? (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreating((value) => !value)}>
            <Plus className="h-3.5 w-3.5" />
            New analyzer
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile label="Registered" value={integer(stats?.total_plugins)} accent="signal" hint={`${integer(stats?.builtin_plugins)} built-in · ${integer(stats?.custom_plugins)} custom`} emphasis />
          <StatTile label="Active" value={integer(stats?.active_plugins)} accent="info" hint={`${integer(stats?.enabled_plugins)} enabled`} />
          <StatTile label="Signals generated" value={integer(stats?.total_signals_generated)} accent="violet" hint="recorded analyzer runs" />
          <StatTile label="Mean score" value={percent(stats?.average_accuracy, 1)} accent="caution" progress={stats?.average_accuracy ?? 0} hint="average composite across runs" />
          <StatTile label="Mean latency" value={`${decimal(stats?.average_processing_time, 2)} ms`} accent="neutral" hint="per analyzer execution" />
        </div>

        {creating && isOperator && (
          <Panel title="Create Analyzer" subtitle="derive a new analyzer from a built-in base with custom tuning" lit>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="plugin-name" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Name
                  </Label>
                  <Input id="plugin-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Aggressive Ignition" className="text-xs" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Base analyzer</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(stats?.available_bases ?? []).map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setBase(entry.id)}
                        className={cn(
                          "rounded-md border px-2.5 py-2 text-left transition-colors",
                          base === entry.id ? "border-signal/45 bg-signal/8" : "border-border/50 bg-muted/12 hover:border-border",
                        )}
                      >
                        <span className={cn("block text-[11px] font-medium", base === entry.id && "text-signal")}>{entry.name}</span>
                        <span className="block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{entry.category}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="plugin-desc" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Description
                  </Label>
                  <Textarea
                    id="plugin-desc"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="What this variant is tuned for…"
                    rows={3}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Weight</Label>
                    <span className="font-mono text-xs tabular-nums text-signal">×{decimal(weight, 2)}</span>
                  </div>
                  <Slider value={[weight]} onValueChange={([value]) => setWeight(value)} min={0.1} max={2} step={0.05} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Trigger threshold</Label>
                    <span className="font-mono text-xs tabular-nums text-caution">{percent(threshold)}</span>
                  </div>
                  <Slider value={[threshold]} onValueChange={([value]) => setThreshold(value)} min={0.05} max={0.95} step={0.05} />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 bg-signal font-semibold text-primary-foreground hover:bg-signal/90"
                    onClick={() => create.mutate()}
                    disabled={create.isPending || name.trim().length === 0}
                  >
                    {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Create
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </Panel>
        )}

        <Panel
          title="Live Analyzer Output"
          subtitle={`${integer(runs.length)} analyzers executed against the current window`}
          icon={<Play className="h-3.5 w-3.5" />}
          actions={
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => void runQuery.refetch()}>
              Re-run
            </Button>
          }
        >
          {runQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : runs.length === 0 ? (
            <EmptyState compact title="No analyzers ran" description="Enable at least one analyzer, and make sure rounds are available." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {runs.map((run) => (
                <div key={run.plugin_id} className="rounded-md border border-border/45 bg-muted/12 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-medium">{run.name}</span>
                      <span className="block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{run.category}</span>
                    </span>
                    <span className={cn("shrink-0", run.signal === "neutral" ? "chip-muted" : "chip-signal")}>{run.signal}</span>
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
                    score {percent(run.score, 1)} · {decimal(run.processing_ms, 2)} ms
                  </p>
                  {run.detail && <p className="mt-1 text-[10px] leading-snug text-muted-foreground/80">{String(run.detail)}</p>}
                  {run.error && <p className="mt-1 text-[10px] text-critical">{run.error}</p>}
                </div>
              ))}
            </div>
          )}
        </Panel>

        {Object.entries(grouped).map(([category, list]) => (
          <Panel key={category} title={titleCase(category)} subtitle={`${list.length} analyzer${list.length > 1 ? "s" : ""}`} icon={<Blocks className="h-3.5 w-3.5" />}>
            <div className="grid gap-3 lg:grid-cols-2">
              {list.map((plugin) => {
                const config = plugin.config as Record<string, number | string>;
                return (
                  <div
                    key={plugin.id}
                    className={cn(
                      "rounded-md border px-4 py-3",
                      plugin.enabled ? "border-border/60 bg-muted/12" : "border-border/35 bg-muted/5 opacity-70",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold">{plugin.name}</span>
                          <span className="chip-muted">v{plugin.version}</span>
                          {plugin.builtin ? <span className="chip-info">built-in</span> : <span className="chip-signal">custom</span>}
                        </div>
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{plugin.description}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <Switch
                          checked={plugin.enabled}
                          disabled={!isOperator || toggle.isPending}
                          onCheckedChange={(checked) => toggle.mutate({ id: plugin.id, enabled: checked })}
                        />
                        {!plugin.builtin && isOperator && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-critical"
                            onClick={() => remove.mutate(plugin.id)}
                            disabled={remove.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/40 pt-2.5 text-center">
                      <div>
                        <p className="hud-label">Runs</p>
                        <p className="mt-0.5 font-mono text-xs tabular-nums">{integer(plugin.performance.signal_count)}</p>
                      </div>
                      <div>
                        <p className="hud-label">Mean score</p>
                        <p className="mt-0.5 font-mono text-xs tabular-nums">{percent(plugin.performance.accuracy, 1)}</p>
                      </div>
                      <div>
                        <p className="hud-label">Latency</p>
                        <p className="mt-0.5 font-mono text-xs tabular-nums">{decimal(plugin.performance.processing_time, 2)}ms</p>
                      </div>
                    </div>

                    {isOperator && typeof config.weight === "number" && (
                      <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Weight</Label>
                            <span className="font-mono text-[10px] tabular-nums text-signal">×{decimal(Number(config.weight), 2)}</span>
                          </div>
                          <Slider
                            value={[Number(config.weight)]}
                            onValueChange={([value]) => configure.mutate({ id: plugin.id, config: { weight: value } })}
                            min={0.1}
                            max={2}
                            step={0.05}
                            disabled={!plugin.enabled}
                          />
                        </div>

                        {typeof config.threshold === "number" && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Threshold</Label>
                              <span className="font-mono text-[10px] tabular-nums text-caution">{percent(Number(config.threshold))}</span>
                            </div>
                            <Slider
                              value={[Number(config.threshold)]}
                              onValueChange={([value]) => configure.mutate({ id: plugin.id, config: { threshold: value } })}
                              min={0.05}
                              max={0.95}
                              step={0.05}
                              disabled={!plugin.enabled}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {plugin.last_used && (
                      <p className="mt-2 font-mono text-[9px] text-muted-foreground/60">last run {relativeTime(plugin.last_used)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}
