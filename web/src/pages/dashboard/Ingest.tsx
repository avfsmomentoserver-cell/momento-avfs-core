import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  FileUp,
  FolderSearch,
  Loader2,
  Play,
  Radio,
  Send,
  ShieldCheck,
  SkipForward,
  Square,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { RoundsFeed } from "@/components/panels/RoundsFeed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { API_BASE_URL, POLL } from "@/lib/config";
import { clockTime, decimal, integer, multiplier, percent, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthProvider";
import { usePlatform } from "@/state/PlatformProvider";

const SAMPLE_PAYLOAD = `[
  { "timestamp": "2026-07-24T12:00:00Z", "multiplier": 1.42 },
  { "timestamp": "2026-07-24T12:00:08Z", "multiplier": 3.90 },
  { "timestamp": "2026-07-24T12:00:17Z", "multiplier": 12.55 }
]`;

/**
 * Ingest console — the single place where data enters the platform.
 * Four paths: file watcher, manual paste, file upload and the live engine.
 */
export default function Ingest() {
  const { source, rounds, flashRoundId } = usePlatform();
  const { isOperator } = useAuth();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [payload, setPayload] = useState<string>("");
  const [interval, setInterval] = useState<number>(6);
  const [houseEdge, setHouseEdge] = useState<number>(0.03);
  const [jitter, setJitter] = useState<number>(0.35);
  const [verifySeed, setVerifySeed] = useState<string>("");
  const [verifyMultiplier, setVerifyMultiplier] = useState<string>("");

  const statusQuery = useQuery({
    queryKey: ["ingest-status"],
    queryFn: () => api.ingestStatus(),
    refetchInterval: POLL.health,
  });

  const historyQuery = useQuery({
    queryKey: ["ingest-history"],
    queryFn: () => api.ingestHistory(40),
    refetchInterval: POLL.slow,
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["ingest-status"] });
    void queryClient.invalidateQueries({ queryKey: ["ingest-history"] });
    void queryClient.invalidateQueries({ queryKey: ["rounds", source] });
    void queryClient.invalidateQueries({ queryKey: ["analysis", source] });
    void queryClient.invalidateQueries({ queryKey: ["feed-status"] });
    void queryClient.invalidateQueries({ queryKey: ["sources"] });
  };

  const pushPayload = useMutation({
    mutationFn: () => api.ingest({ source, raw: payload }),
    onSuccess: (result) => {
      if (result.imported > 0) {
        toast.success(`${result.imported} rounds imported`, {
          description: result.duplicates > 0 ? `${result.duplicates} duplicates skipped.` : undefined,
        });
        setPayload("");
      } else if (result.duplicates > 0) {
        toast.info("All rounds were duplicates", { description: `${result.duplicates} skipped.` });
      } else {
        toast.error("No valid rounds found", { description: "Accepts JSON, CSV or a plain list of multipliers." });
      }
      invalidate();
    },
    onError: (error: Error) => toast.error("Ingest failed", { description: error.message }),
  });

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadRounds(file, source),
    onSuccess: (result) => {
      toast.success(`${result.imported} rounds imported`, {
        description: `${result.filename}${result.duplicates > 0 ? ` · ${result.duplicates} duplicates skipped` : ""}`,
      });
      invalidate();
    },
    onError: (error: Error) => toast.error("Upload failed", { description: error.message }),
  });

  const scan = useMutation({
    mutationFn: () => api.watcherScan(),
    onSuccess: (result) => {
      const { processed, imported, failed } = result.scan as Record<string, number>;
      toast.success("Inbox scanned", {
        description: `${processed ?? 0} files · ${imported ?? 0} rounds imported${failed ? ` · ${failed} failed` : ""}`,
      });
      invalidate();
    },
    onError: (error: Error) => toast.error("Scan failed", { description: error.message }),
  });

  const watcherToggle = useMutation({
    mutationFn: (start: boolean) => (start ? api.watcherStart() : api.watcherStop()),
    onSuccess: (result) => {
      toast.success(`Watcher ${result.watcher.running ? "started" : "stopped"}`);
      invalidate();
    },
    onError: (error: Error) => toast.error("Watcher control failed", { description: error.message }),
  });

  const feedStart = useMutation({
    mutationFn: () => api.feedStart({ source, interval_seconds: interval, house_edge: houseEdge, jitter }),
    onSuccess: () => {
      toast.success("Live engine started", { description: `Emitting a verifiable round every ~${interval}s.` });
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not start engine", { description: error.message }),
  });

  const feedStop = useMutation({
    mutationFn: () => api.feedStop(),
    onSuccess: (status) => {
      toast.info("Live engine stopped", {
        description: status.verification.terminal_seed
          ? `Terminal seed published: ${status.verification.terminal_seed.slice(0, 24)}…`
          : undefined,
      });
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not stop engine", { description: error.message }),
  });

  const feedStep = useMutation({
    mutationFn: () => api.feedStep(),
    onSuccess: (result) => {
      toast.success(`Round emitted: ${multiplier(result.round.multiplier)}`);
      invalidate();
    },
    onError: (error: Error) => toast.error("Step failed", { description: error.message }),
  });

  const verify = useMutation({
    mutationFn: () =>
      api.feedVerify({ seed: verifySeed.trim(), multiplier: Number(verifyMultiplier) || 0, house_edge: houseEdge }),
    onSuccess: (result) => {
      if (result.valid) {
        toast.success("Round verified", { description: `Recomputed ${multiplier(result.computed_multiplier)} from the seed.` });
      } else {
        toast.error("Verification failed", { description: `Seed produces ${multiplier(result.computed_multiplier)}.` });
      }
    },
    onError: (error: Error) => toast.error("Verify failed", { description: error.message }),
  });

  const watcher = statusQuery.data?.watcher;
  const feed = statusQuery.data?.feed;
  const directories = statusQuery.data?.directories ?? {};
  const entries = historyQuery.data?.entries ?? [];

  return (
    <AppShell title="Ingest Console" subtitle="File watcher · REST push · upload · verifiable live engine">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Watcher"
            value={watcher?.running ? "RUNNING" : "STOPPED"}
            accent={watcher?.running ? "signal" : "caution"}
            hint={`${integer(watcher?.pending_files)} pending · ${integer(watcher?.files_processed)} processed`}
            icon={<FolderSearch className="h-3.5 w-3.5" />}
            emphasis
          />
          <StatTile
            label="Live engine"
            value={feed?.running ? "EMITTING" : "IDLE"}
            accent={feed?.running ? "signal" : "neutral"}
            hint={feed?.running ? `every ~${decimal(feed.config.interval_seconds, 1)}s · ${integer(feed.rounds_emitted)} emitted` : "start it when no collector is attached"}
            icon={<Radio className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Rounds imported"
            value={integer(watcher?.rounds_imported)}
            accent="info"
            hint={watcher?.last_scan ? `last scan ${relativeTime(watcher.last_scan)}` : "no scan yet"}
          />
          <StatTile
            label="Chain remaining"
            value={integer(feed?.chain_remaining)}
            accent="violet"
            hint={feed ? `cursor ${integer(feed.cursor)} of ${integer(feed.chain_length)}` : "hash chain not built"}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {/* ---- live engine ---- */}
          <Panel
            title="Provably-Fair Live Engine"
            subtitle="HMAC-SHA256 over a reverse hash chain — every round is auditable"
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            lit
          >
            <div className="space-y-4">
              <p className="rounded-md border border-info/25 bg-info/8 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                This is a real generator, not fixture data. Each multiplier is derived from{" "}
                <code className="font-mono text-foreground/80">hmac_sha256(seed, salt)</code> where seeds come from a
                pre-committed reverse SHA-256 chain. When the engine stops, the terminal seed is published so the whole
                session can be replayed and checked independently.
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Round interval</Label>
                    <span className="font-mono text-xs tabular-nums text-signal">{decimal(interval, 1)}s</span>
                  </div>
                  <Slider value={[interval]} onValueChange={([value]) => setInterval(value)} min={1} max={30} step={0.5} disabled={!isOperator} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">House edge</Label>
                    <span className="font-mono text-xs tabular-nums text-caution">{percent(houseEdge, 2)}</span>
                  </div>
                  <Slider value={[houseEdge]} onValueChange={([value]) => setHouseEdge(value)} min={0} max={0.1} step={0.005} disabled={!isOperator} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Timing jitter</Label>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{percent(jitter, 0)}</span>
                  </div>
                  <Slider value={[jitter]} onValueChange={([value]) => setJitter(value)} min={0} max={0.8} step={0.05} disabled={!isOperator} />
                </div>
              </div>

              {isOperator && (
                <div className="flex flex-wrap gap-2">
                  {feed?.running ? (
                    <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => feedStop.mutate()} disabled={feedStop.isPending}>
                      {feedStop.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                      Stop engine
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-signal font-semibold text-primary-foreground hover:bg-signal/90"
                      onClick={() => feedStart.mutate()}
                      disabled={feedStart.isPending}
                    >
                      {feedStart.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      Start engine
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => feedStep.mutate()} disabled={feedStep.isPending}>
                    {feedStep.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SkipForward className="h-3.5 w-3.5" />}
                    Emit one round
                  </Button>
                </div>
              )}

              {feed?.last_seed && (
                <div className="space-y-2 border-t border-border/50 pt-3">
                  <p className="hud-label">Last round proof</p>
                  <div className="space-y-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
                    <p className="break-all">
                      <span className="text-foreground/60">seed</span> {feed.last_seed}
                    </p>
                    <p>
                      <span className="text-foreground/60">salt</span> {feed.salt}
                    </p>
                    <p>
                      <span className="text-foreground/60">result</span>{" "}
                      <span className="text-signal">{multiplier(feed.last_multiplier)}</span>
                    </p>
                  </div>

                  <div className="grid gap-2 pt-1 sm:grid-cols-[1fr_100px_auto]">
                    <Input
                      value={verifySeed}
                      onChange={(event) => setVerifySeed(event.target.value)}
                      placeholder="paste a seed to verify"
                      className="font-mono text-[10px]"
                    />
                    <Input
                      value={verifyMultiplier}
                      onChange={(event) => setVerifyMultiplier(event.target.value)}
                      placeholder="expected"
                      type="number"
                      step="0.01"
                      className="font-mono text-[10px]"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => verify.mutate()}
                      disabled={verify.isPending || verifySeed.trim().length === 0}
                    >
                      {verify.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      Verify
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => {
                      setVerifySeed(feed.last_seed ?? "");
                      setVerifyMultiplier(String(feed.last_multiplier ?? ""));
                    }}
                  >
                    Fill from last round
                  </Button>
                </div>
              )}
            </div>
          </Panel>

          {/* ---- manual ingest ---- */}
          <Panel title="Manual Ingest" subtitle="paste JSON, CSV or a plain list of multipliers" icon={<Send className="h-3.5 w-3.5" />}>
            <div className="space-y-3">
              <Textarea
                value={payload}
                onChange={(event) => setPayload(event.target.value)}
                placeholder={SAMPLE_PAYLOAD}
                rows={8}
                className="font-mono text-[11px]"
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="gap-1.5 bg-signal font-semibold text-primary-foreground hover:bg-signal/90"
                  onClick={() => pushPayload.mutate()}
                  disabled={pushPayload.isPending || payload.trim().length === 0}
                >
                  {pushPayload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Ingest to {source}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPayload(SAMPLE_PAYLOAD)}>
                  Insert example
                </Button>
              </div>

              <div className="space-y-2 border-t border-border/50 pt-3">
                <p className="hud-label">Upload a file</p>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".json,.csv,.txt,.ndjson"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) upload.mutate(file);
                    event.target.value = "";
                  }}
                />
                <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => fileInput.current?.click()} disabled={upload.isPending}>
                  {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                  Choose a .json / .csv / .txt export
                </Button>
              </div>

              <div className="space-y-1.5 border-t border-border/50 pt-3">
                <p className="hud-label">Programmatic push</p>
                <pre className="overflow-x-auto rounded-md border border-border/50 bg-ink/60 px-3 py-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
{`curl -X POST ${API_BASE_URL}/api/v1/ingest \\
  -H 'Content-Type: application/json' \\
  -d '{"source":"${source}","rounds":[{"multiplier":2.41}]}'`}
                </pre>
              </div>
            </div>
          </Panel>
        </div>

        {/* ---- watcher ---- */}
        <Panel
          title="File Watcher"
          subtitle={`polling every ${decimal(watcher?.interval_seconds, 1)}s · accepts ${(watcher?.accepted_suffixes ?? []).join(" ")}`}
          icon={<FolderSearch className="h-3.5 w-3.5" />}
          actions={
            isOperator ? (
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 px-2 text-[11px]" onClick={() => scan.mutate()} disabled={scan.isPending}>
                  {scan.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  Scan now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("h-7 px-2 text-[11px]", watcher?.running ? "text-critical" : "text-signal")}
                  onClick={() => watcherToggle.mutate(!watcher?.running)}
                  disabled={watcherToggle.isPending}
                >
                  {watcher?.running ? "Stop" : "Start"}
                </Button>
              </div>
            ) : undefined
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            <dl className="space-y-1.5">
              {Object.entries(directories).map(([key, value]) => (
                <div key={key} className="flex items-baseline justify-between gap-3 border-b border-border/25 py-1.5 last:border-0">
                  <dt className="shrink-0 text-[11px] capitalize text-muted-foreground">{key}</dt>
                  <dd className="truncate font-mono text-[10px] text-foreground/75" title={value}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-2">
              {[
                { label: "Processed", value: integer(watcher?.files_processed), accent: "text-signal" },
                { label: "Failed", value: integer(watcher?.files_failed), accent: "text-critical" },
                { label: "Pending", value: integer(watcher?.pending_files), accent: "text-caution" },
                { label: "Rounds", value: integer(watcher?.rounds_imported), accent: "text-info" },
              ].map((item) => (
                <div key={item.label} className="rounded-md border border-border/45 bg-muted/12 px-3 py-2">
                  <p className="hud-label">{item.label}</p>
                  <p className={cn("mt-0.5 font-mono text-lg font-semibold tabular-nums", item.accent)}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {watcher?.last_error && (
            <p className="mt-3 rounded-md border border-critical/30 bg-critical/8 px-3 py-2 font-mono text-[10px] text-critical">
              {watcher.last_error}
            </p>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Drop round exports into the inbox directory and they are imported automatically, then moved to{" "}
            <code className="font-mono text-foreground/75">processed/</code> or{" "}
            <code className="font-mono text-foreground/75">failed/</code>. Set{" "}
            <code className="font-mono text-foreground/75">MOMENTO_WATCH_DOWNLOADS=1</code> to also watch the Downloads
            folder for files named <code className="font-mono text-foreground/75">momento*</code>,{" "}
            <code className="font-mono text-foreground/75">avfs*</code> or{" "}
            <code className="font-mono text-foreground/75">rounds*</code>.
          </p>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Ingest Log" subtitle={`${integer(entries.length)} recent operations`} bodyClassName="p-0">
            {entries.length === 0 ? (
              <div className="p-4">
                <EmptyState compact title="No ingest activity" description="Every import, duplicate and rejection is logged here." />
              </div>
            ) : (
              <div className="no-scrollbar max-h-[360px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-card/95 backdrop-blur">
                    <tr className="border-b border-border/60">
                      <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Time</th>
                      <th className="px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Method</th>
                      <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">In</th>
                      <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Dup</th>
                      <th className="px-4 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-border/25 hover:bg-muted/20">
                        <td className="px-4 py-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">{clockTime(entry.created_at)}</td>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">{entry.method}</td>
                        <td className="px-2 py-1.5 text-right font-mono text-[11px] font-semibold tabular-nums text-signal">
                          {integer(entry.imported)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                          {integer(entry.duplicates)}
                        </td>
                        <td className="px-4 py-1.5 text-right">
                          <span
                            className={cn(
                              entry.status === "ok" && "chip-signal",
                              entry.status === "duplicate" && "chip-info",
                              entry.status === "empty" && "chip-muted",
                              entry.status === "rejected" && "chip-critical",
                            )}
                          >
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <RoundsFeed rounds={rounds} flashRoundId={flashRoundId} limit={40} height="max-h-[360px]" />
        </div>
      </div>
    </AppShell>
  );
}
