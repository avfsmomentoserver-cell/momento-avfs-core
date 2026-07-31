import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cpu, Loader2, RotateCcw, Save, Settings2, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { bytes, clockTime, integer, titleCase } from "@/lib/format";
import { useAuth } from "@/state/AuthProvider";

interface SettingField {
  key: string;
  label: string;
  hint: string;
  step?: number;
  min?: number;
  max?: number;
}

const GROUPS: { title: string; description: string; fields: SettingField[] }[] = [
  {
    title: "State thresholds",
    description: "Where the state machine draws its boundaries. Calibration tunes these automatically.",
    fields: [
      { key: "low_band_threshold", label: "Low band", hint: "Below this counts as a low round", step: 0.1, min: 1.1, max: 5 },
      { key: "ignition_threshold", label: "Ignition", hint: "Upside energy threshold", step: 0.5, min: 2, max: 30 },
      { key: "moonshot_threshold", label: "Moonshot", hint: "High-band clearance", step: 1, min: 5, max: 100 },
      { key: "mega_moonshot_threshold", label: "Mega moonshot", hint: "Extreme run threshold", step: 5, min: 20, max: 500 },
    ],
  },
  {
    title: "Structure detection",
    description: "Minimum lengths and tolerances used by the ladder, shelf and bait detectors.",
    fields: [
      { key: "ladder_min_length", label: "Ladder min length", hint: "Rounds required for an ascending ladder", step: 1, min: 2, max: 12 },
      { key: "ladder_tolerance", label: "Ladder tolerance", hint: "Allowed floor slack (fraction)", step: 0.01, min: 0, max: 0.5 },
      { key: "collapse_min_length", label: "Collapse min run", hint: "Rounds required for a collapse ladder", step: 1, min: 2, max: 12 },
      { key: "shelf_window", label: "Shelf window", hint: "Rounds inspected for a variance shelf", step: 1, min: 5, max: 40 },
      { key: "shelf_variance", label: "Shelf variance", hint: "Max normalised variance for a shelf", step: 0.05, min: 0.05, max: 1 },
      { key: "bait_spike_ratio", label: "Bait spike ratio", hint: "Spike vs context multiple", step: 0.1, min: 1.2, max: 6 },
      { key: "resistance_bins", label: "Resistance bins", hint: "Clustering resolution for walls", step: 1, min: 4, max: 60 },
    ],
  },
  {
    title: "Forecast & analysis",
    description: "Windows and tolerances that shape the forecast blend.",
    fields: [
      { key: "session_gap_seconds", label: "Session gap", hint: "Seconds of silence that ends a session", step: 30, min: 30, max: 3600 },
      { key: "forecast_horizon", label: "Forecast horizon", hint: "Rounds ahead reported", step: 1, min: 1, max: 20 },
      { key: "volatility_window", label: "Volatility window", hint: "Rounds used for the regime read", step: 5, min: 10, max: 200 },
      { key: "dna_window", label: "DNA window", hint: "Rounds encoded into a signature", step: 1, min: 4, max: 24 },
      { key: "dna_tolerance", label: "DNA tolerance", hint: "Similarity floor for analogues", step: 0.01, min: 0.5, max: 0.99 },
      { key: "confidence_floor", label: "Confidence floor", hint: "Minimum reported confidence", step: 0.01, min: 0, max: 0.5 },
      { key: "house_edge_prior", label: "House edge prior", hint: "Fallback edge before enough samples", step: 0.005, min: 0, max: 0.2 },
      { key: "max_rounds_buffer", label: "Max rounds buffer", hint: "Upper bound on the analysis window", step: 500, min: 500, max: 50000 },
    ],
  },
];

const BACKTESTING_FIELDS: SettingField[] = [
  { key: "default_session_gap", label: "Default session gap", hint: "Seconds between sessions in backtests", step: 30, min: 30, max: 3600 },
  { key: "default_window_size", label: "Default window size", hint: "Rounds per backtest window", step: 50, min: 100, max: 5000 },
  { key: "min_session_rounds", label: "Min session rounds", hint: "Minimum rounds to include a session", step: 1, min: 5, max: 100 },
  { key: "accuracy_threshold", label: "Accuracy threshold", hint: "Minimum accuracy to consider a feature useful", step: 0.05, min: 0, max: 1 },
  { key: "confidence_threshold", label: "Confidence threshold", hint: "Minimum confidence for predictions", step: 0.05, min: 0, max: 1 },
  { key: "max_backtest_rounds", label: "Max backtest rounds", hint: "Maximum rounds in a single backtest", step: 1000, min: 1000, max: 100000 },
  { key: "parallel_workers", label: "Parallel workers", hint: "Number of parallel backtest workers", step: 1, min: 1, max: 16 },
];

const DASHBOARD_FIELDS: SettingField[] = [
  { key: "default_rounds_limit", label: "Default rounds limit", hint: "Default rounds to display in feeds", step: 50, min: 50, max: 2000 },
  { key: "refresh_interval_rounds", label: "Rounds refresh interval", hint: "Milliseconds between rounds refresh", step: 500, min: 500, max: 10000 },
  { key: "refresh_interval_analysis", label: "Analysis refresh interval", hint: "Milliseconds between analysis refresh", step: 1000, min: 1000, max: 30000 },
  { key: "refresh_interval_slow", label: "Slow refresh interval", hint: "Milliseconds for slow refreshes", step: 5000, min: 5000, max: 120000 },
];

/** Master settings: analysis parameters and engine toggles, persisted server-side. */
export default function Settings() {
  const { isOperator } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [backtestingDraft, setBacktestingDraft] = useState<Record<string, string>>({});
  const [dashboardDraft, setDashboardDraft] = useState<Record<string, string>>({});

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.settings(),
    refetchInterval: POLL.slow,
  });

  const auditQuery = useQuery({
    queryKey: ["audit"],
    queryFn: () => api.audit(40),
    refetchInterval: POLL.slow,
    enabled: isOperator,
  });

  // Seed the editable draft once the server values arrive.
  useEffect(() => {
    const analysis = settingsQuery.data?.analysis;
    const backtesting = settingsQuery.data?.backtesting;
    const dashboard = settingsQuery.data?.dashboard;
    if (!analysis) return;
    setDraft(Object.fromEntries(Object.entries(analysis).map(([key, value]) => [key, String(value)])));
    if (backtesting) {
      setBacktestingDraft(Object.fromEntries(Object.entries(backtesting).map(([key, value]) => [key, String(value)])));
    }
    if (dashboard) {
      setDashboardDraft(Object.fromEntries(Object.entries(dashboard).map(([key, value]) => [key, String(value)])));
    }
  }, [settingsQuery.data?.analysis, settingsQuery.data?.backtesting, settingsQuery.data?.dashboard]);

  const saveAnalysis = useMutation({
    mutationFn: () => {
      const payload = Object.fromEntries(
        Object.entries(draft)
          .map(([key, value]) => [key, Number(value)])
          .filter(([, value]) => Number.isFinite(value as number)),
      ) as Record<string, number>;
      return api.updateSettings({ analysis: payload });
    },
    onSuccess: () => {
      toast.success("Analysis settings saved", { description: "Every engine picks these up on the next cycle." });
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Save failed", { description: error.message }),
  });

  const saveBacktesting = useMutation({
    mutationFn: () => {
      const payload = Object.fromEntries(
        Object.entries(backtestingDraft)
          .map(([key, value]) => [key, Number(value)])
          .filter(([, value]) => Number.isFinite(value as number)),
      ) as Record<string, number>;
      return api.updateSettings({ backtesting: payload });
    },
    onSuccess: () => {
      toast.success("Backtesting settings saved", { description: "Investigation Suite will use these parameters." });
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Save failed", { description: error.message }),
  });

  const saveDashboard = useMutation({
    mutationFn: () => {
      const payload = Object.fromEntries(
        Object.entries(dashboardDraft)
          .map(([key, value]) => [key, Number(value)])
          .filter(([, value]) => Number.isFinite(value as number)),
      ) as Record<string, number>;
      return api.updateSettings({ dashboard: payload });
    },
    onSuccess: () => {
      toast.success("Dashboard settings saved", { description: "UI refresh intervals updated." });
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Save failed", { description: error.message }),
  });

  const toggleEngine = useMutation({
    mutationFn: (patch: Record<string, boolean>) => api.updateSettings({ runtime: patch }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      void queryClient.invalidateQueries({ queryKey: ["engines-health"] });
    },
    onError: (error: Error) => toast.error("Toggle failed", { description: error.message }),
  });

  const runtime = settingsQuery.data?.runtime ?? {};
  const environment = settingsQuery.data?.environment ?? {};
  const database = settingsQuery.data?.database;
  const backtesting = settingsQuery.data?.backtesting ?? {};
  const dashboard = settingsQuery.data?.dashboard ?? {};
  const dirty = Object.entries(draft).some(
    ([key, value]) => String(settingsQuery.data?.analysis?.[key] ?? "") !== value,
  );
  const backtestingDirty = Object.entries(backtestingDraft).some(
    ([key, value]) => String(settingsQuery.data?.backtesting?.[key] ?? "") !== value,
  );
  const dashboardDirty = Object.entries(dashboardDraft).some(
    ([key, value]) => String(settingsQuery.data?.dashboard?.[key] ?? "") !== value,
  );

  return (
    <AppShell
      title="Master Settings"
      subtitle="Analysis parameters, engine toggles and environment"
      actions={
        isOperator ? (
          <div className="hidden items-center gap-1.5 sm:flex">
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5"
              onClick={() =>
                setDraft(
                  Object.fromEntries(
                    Object.entries(settingsQuery.data?.analysis ?? {}).map(([key, value]) => [key, String(value)]),
                  ),
                )
              }
              disabled={!dirty}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Revert
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-signal font-semibold text-primary-foreground hover:bg-signal/90"
              onClick={() => saveAnalysis.mutate()}
              disabled={saveAnalysis.isPending || !dirty}
            >
              {saveAnalysis.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {!isOperator && (
          <p className="rounded-md border border-caution/30 bg-caution/8 px-3 py-2.5 text-[11px] text-caution">
            You are viewing settings read-only. Sign in with an operator account to make changes.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Engines enabled"
            value={`${integer(Object.values(runtime).filter(Boolean).length)}/${integer(Object.keys(runtime).length)}`}
            accent="signal"
            hint="runtime feature switches"
            emphasis
          />
          <StatTile label="Database" value={bytes(database?.size_bytes)} accent="info" hint={database?.path?.split("/").slice(-1)[0] ?? "—"} />
          <StatTile label="Rounds" value={integer(database?.counts.rounds)} accent="violet" hint={`${integer(database?.counts.forecasts)} forecasts recorded`} />
          <StatTile
            label="Unsaved changes"
            value={dirty ? "YES" : "NO"}
            accent={dirty ? "caution" : "neutral"}
            hint={dirty ? "press save to apply" : "settings match the server"}
          />
        </div>

        <Panel title="Engine Toggles" subtitle="disable an engine to remove it from every payload" icon={<Cpu className="h-3.5 w-3.5" />} lit>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(runtime).filter(([key]) => !key.startsWith('moonshot_') && !key.includes('exhaustion') && key !== 'sweet_spot_signal' && key !== 'chase_readiness').map(([key, value]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border/45 bg-muted/12 px-3 py-2.5 transition-colors hover:border-border"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-medium">{titleCase(key)}</span>
                  <span className="block font-mono text-[9px] text-muted-foreground">{key}</span>
                </span>
                <Switch
                  checked={Boolean(value)}
                  disabled={!isOperator || toggleEngine.isPending}
                  onCheckedChange={(checked) => toggleEngine.mutate({ [key]: checked })}
                />
              </label>
            ))}
          </div>
        </Panel>

        <Panel title="Advanced Moonshot Signals" subtitle="ETA predictions, exhaustion calculations, and combined linguistic factors" icon={<Cpu className="h-3.5 w-3.5" />}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(runtime).filter(([key]) => key.startsWith('moonshot_') || key.includes('exhaustion') || key === 'sweet_spot_signal' || key === 'chase_readiness').map(([key, value]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border/45 bg-muted/12 px-3 py-2.5 transition-colors hover:border-border"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-medium">{titleCase(key.replace(/_/g, ' '))}</span>
                  <span className="block font-mono text-[9px] text-muted-foreground">{key}</span>
                </span>
                <Switch
                  checked={Boolean(value)}
                  disabled={!isOperator || toggleEngine.isPending}
                  onCheckedChange={(checked) => toggleEngine.mutate({ [key]: checked })}
                />
              </label>
            ))}
          </div>
        </Panel>

        {GROUPS.map((group) => (
          <Panel key={group.title} title={group.title} subtitle={group.description} icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {group.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={field.key} className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {field.label}
                  </Label>
                  <Input
                    id={field.key}
                    type="number"
                    step={field.step}
                    min={field.min}
                    max={field.max}
                    value={draft[field.key] ?? ""}
                    disabled={!isOperator}
                    onChange={(event) => setDraft((previous) => ({ ...previous, [field.key]: event.target.value }))}
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] leading-snug text-muted-foreground/70">{field.hint}</p>
                </div>
              ))}
            </div>
          </Panel>
        ))}

        <Panel
          title="Backtesting Configuration"
          subtitle="Parameters for the Investigation Suite backtesting framework"
          icon={<Cpu className="h-3.5 w-3.5" />}
          actions={
            isOperator && backtestingDirty ? (
              <Button
                size="sm"
                className="gap-1.5 bg-signal font-semibold text-primary-foreground hover:bg-signal/90"
                onClick={() => saveBacktesting.mutate()}
                disabled={saveBacktesting.isPending}
              >
                {saveBacktesting.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
            ) : undefined
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BACKTESTING_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`bt-${field.key}`} className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {field.label}
                </Label>
                <Input
                  id={`bt-${field.key}`}
                  type="number"
                  step={field.step}
                  min={field.min}
                  max={field.max}
                  value={backtestingDraft[field.key] ?? ""}
                  disabled={!isOperator}
                  onChange={(event) => setBacktestingDraft((previous) => ({ ...previous, [field.key]: event.target.value }))}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] leading-snug text-muted-foreground/70">{field.hint}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Dashboard Settings"
          subtitle="UI/UX configuration for the dashboard"
          icon={<Settings2 className="h-3.5 w-3.5" />}
          actions={
            isOperator && dashboardDirty ? (
              <Button
                size="sm"
                className="gap-1.5 bg-signal font-semibold text-primary-foreground hover:bg-signal/90"
                onClick={() => saveDashboard.mutate()}
                disabled={saveDashboard.isPending}
              >
                {saveDashboard.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
            ) : undefined
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DASHBOARD_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`dash-${field.key}`} className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {field.label}
                </Label>
                <Input
                  id={`dash-${field.key}`}
                  type="number"
                  step={field.step}
                  min={field.min}
                  max={field.max}
                  value={dashboardDraft[field.key] ?? ""}
                  disabled={!isOperator}
                  onChange={(event) => setDashboardDraft((previous) => ({ ...previous, [field.key]: event.target.value }))}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] leading-snug text-muted-foreground/70">{field.hint}</p>
              </div>
            ))}
          </div>
        </Panel>

        {isOperator && dirty && (
          <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-lg border border-signal/35 bg-card/95 px-4 py-3 shadow-xl backdrop-blur">
            <p className="text-[11px] text-muted-foreground">
              Unsaved analysis changes. Saving applies them to every engine immediately.
            </p>
            <Button
              size="sm"
              className="shrink-0 gap-1.5 bg-signal font-semibold text-primary-foreground hover:bg-signal/90"
              onClick={() => saveAnalysis.mutate()}
              disabled={saveAnalysis.isPending}
            >
              {saveAnalysis.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save changes
            </Button>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Environment" subtitle="resolved backend configuration" icon={<Settings2 className="h-3.5 w-3.5" />}>
            <dl className="space-y-0.5">
              {Object.entries(environment).map(([key, value]) => (
                <div key={key} className="flex items-baseline justify-between gap-3 border-b border-border/25 py-1.5 last:border-0">
                  <dt className="shrink-0 text-[11px] text-muted-foreground">{titleCase(key)}</dt>
                  <dd className="truncate font-mono text-[10px] text-foreground/80" title={String(value)}>
                    {Array.isArray(value) ? value.join(", ") : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          {isOperator && (
            <Panel title="Audit Log" subtitle={`${integer(auditQuery.data?.entries.length)} recent operator actions`} bodyClassName="p-0">
              {(auditQuery.data?.entries.length ?? 0) === 0 ? (
                <div className="p-4">
                  <EmptyState compact title="No audit entries" description="Operator actions are recorded here." />
                </div>
              ) : (
                <div className="no-scrollbar max-h-[340px] overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-card/95 backdrop-blur">
                      <tr className="border-b border-border/60">
                        <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Time</th>
                        <th className="px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Actor</th>
                        <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(auditQuery.data?.entries ?? []).map((entry) => (
                        <tr key={entry.id} className="border-b border-border/25 hover:bg-muted/20">
                          <td className="px-4 py-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">{clockTime(entry.created_at)}</td>
                          <td className="px-2 py-1.5 truncate font-mono text-[10px] text-muted-foreground">{entry.actor ?? "system"}</td>
                          <td className="px-4 py-1.5 font-mono text-[10px] text-foreground/80">{entry.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>
    </AppShell>
  );
}
