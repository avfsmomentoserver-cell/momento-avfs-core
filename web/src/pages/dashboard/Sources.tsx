import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Download, Layers, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { bytes, dateTime, decimal, integer, multiplier, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthProvider";
import { usePlatform } from "@/state/PlatformProvider";

/** Source registry plus per-source session index and data management. */
export default function Sources() {
  const { source, setSource, sources } = usePlatform();
  const { isOperator } = useAuth();
  const queryClient = useQueryClient();

  const [newId, setNewId] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newActive, setNewActive] = useState<boolean>(true);

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: () => api.health(),
    refetchInterval: POLL.health,
  });

  const sessionsQuery = useQuery({
    queryKey: ["sessions", source],
    queryFn: () => api.sessions(source, 40),
    refetchInterval: POLL.slow,
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["sources"] });
    void queryClient.invalidateQueries({ queryKey: ["sessions", source] });
    void queryClient.invalidateQueries({ queryKey: ["health"] });
  };

  const upsert = useMutation({
    mutationFn: () => api.upsertSource({ id: newId.trim(), name: newName.trim() || newId.trim(), active: newActive }),
    onSuccess: () => {
      toast.success("Source registered", { description: newId.trim() });
      setNewId("");
      setNewName("");
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not register source", { description: error.message }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, name, active }: { id: string; name: string; active: boolean }) =>
      api.upsertSource({ id, name, active }),
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error("Update failed", { description: error.message }),
  });

  const removeSource = useMutation({
    mutationFn: (id: string) => api.deleteSource(id),
    onSuccess: () => {
      toast.success("Source removed");
      invalidate();
    },
    onError: (error: Error) => toast.error("Delete failed", { description: error.message }),
  });

  const purge = useMutation({
    mutationFn: (id: string) => api.purgeSource(id),
    onSuccess: (result) => {
      toast.success("Rounds purged", { description: `${result.deleted} rounds deleted from ${result.source}.` });
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Purge failed", { description: error.message }),
  });

  const rebuild = useMutation({
    mutationFn: () => api.rebuildSessions(source),
    onSuccess: (result) => {
      toast.success("Session index rebuilt", { description: `${result.sessions_written} sessions written.` });
      invalidate();
    },
    onError: (error: Error) => toast.error("Rebuild failed", { description: error.message }),
  });

  const database = healthQuery.data?.database;
  const sessions = sessionsQuery.data?.sessions ?? [];
  const totalRounds = sources.reduce((sum, entry) => sum + entry.round_count, 0);

  return (
    <AppShell title="Sources" subtitle="Registered data sources, storage footprint and session index">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Registered sources" value={integer(sources.length)} accent="signal" hint={`${sources.filter((s) => s.active).length} active`} emphasis />
          <StatTile label="Rounds stored" value={integer(totalRounds)} accent="info" hint={`across all sources`} />
          <StatTile label="Database size" value={bytes(database?.size_bytes)} accent="violet" hint={database?.path ? database.path.split("/").slice(-2).join("/") : "—"} />
          <StatTile
            label="Coverage"
            value={database?.oldest_round ? relativeTime(database.oldest_round) : "—"}
            accent="caution"
            hint={database?.newest_round ? `newest ${relativeTime(database.newest_round)}` : "no rounds"}
          />
        </div>

        <Panel title="Source Registry" subtitle="click a row to make it the active source" icon={<Database className="h-3.5 w-3.5" />} bodyClassName="p-0" lit>
          {sources.length === 0 ? (
            <div className="p-4">
              <EmptyState compact title="No sources" description="Register a source below to begin ingesting." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Source</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Rounds</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Last</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Updated</th>
                    <th className="px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Active</th>
                    <th className="px-4 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((entry) => (
                    <tr
                      key={entry.id}
                      className={cn("border-b border-border/25 transition-colors hover:bg-muted/20", entry.id === source && "bg-signal/6")}
                    >
                      <td className="px-4 py-2">
                        <button type="button" onClick={() => setSource(entry.id)} className="text-left">
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-medium">{entry.name}</span>
                            {entry.id === source && <span className="chip-signal">active</span>}
                          </span>
                          <span className="block font-mono text-[10px] text-muted-foreground">{entry.id}</span>
                        </button>
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-[11px] font-semibold tabular-nums">{integer(entry.round_count)}</td>
                      <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums text-signal">
                        {entry.latest_multiplier !== null ? multiplier(entry.latest_multiplier) : "—"}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-[10px] text-muted-foreground">
                        {entry.latest_timestamp ? relativeTime(entry.latest_timestamp) : "—"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Switch
                          checked={entry.active}
                          disabled={!isOperator || toggleActive.isPending}
                          onCheckedChange={(checked) => toggleActive.mutate({ id: entry.id, name: entry.name, active: checked })}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="Export CSV">
                            <a href={api.exportCsvUrl(entry.id)} target="_blank" rel="noreferrer">
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          {isOperator && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-caution"
                                title="Purge every round for this source"
                                onClick={() => purge.mutate(entry.id)}
                                disabled={purge.isPending}
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-critical"
                                title="Remove source"
                                onClick={() => removeSource.mutate(entry.id)}
                                disabled={removeSource.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-3">
          {isOperator && (
            <Panel title="Register Source" subtitle="add a new game or feed" icon={<Plus className="h-3.5 w-3.5" />}>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="source-id" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Identifier
                  </Label>
                  <Input
                    id="source-id"
                    value={newId}
                    onChange={(event) => setNewId(event.target.value)}
                    placeholder="rocketx"
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground/70">Lower-case, letters, digits and underscores only.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="source-name" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Display name
                  </Label>
                  <Input id="source-name" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="RocketX" className="text-xs" />
                </div>

                <div className="flex items-center justify-between rounded-md border border-border/45 bg-muted/12 px-3 py-2">
                  <Label className="text-[11px] text-muted-foreground">Active on creation</Label>
                  <Switch checked={newActive} onCheckedChange={setNewActive} />
                </div>

                <Button
                  size="sm"
                  className="w-full gap-1.5 bg-signal font-semibold text-primary-foreground hover:bg-signal/90"
                  onClick={() => upsert.mutate()}
                  disabled={upsert.isPending || newId.trim().length === 0}
                >
                  {upsert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Register
                </Button>
              </div>
            </Panel>
          )}

          <Panel
            title="Session Index"
            subtitle={`${integer(sessions.length)} sessions for ${source}`}
            icon={<Layers className="h-3.5 w-3.5" />}
            className={isOperator ? "lg:col-span-2" : "lg:col-span-3"}
            bodyClassName="p-0"
            actions={
              isOperator ? (
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 px-2 text-[11px]" onClick={() => rebuild.mutate()} disabled={rebuild.isPending}>
                  {rebuild.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Rebuild
                </Button>
              ) : undefined
            }
          >
            {sessions.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  compact
                  title="No sessions indexed"
                  description="Rebuild the index to group the round history into continuous play sessions."
                />
              </div>
            ) : (
              <div className="no-scrollbar max-h-[320px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-card/95 backdrop-blur">
                    <tr className="border-b border-border/60">
                      <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Started</th>
                      <th className="px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ended</th>
                      <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Rounds</th>
                      <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Peak</th>
                      <th className="px-4 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mean</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.id} className="border-b border-border/25 hover:bg-muted/20">
                        <td className="px-4 py-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">{dateTime(session.started_at)}</td>
                        <td className="px-2 py-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">{dateTime(session.ended_at)}</td>
                        <td className="px-2 py-1.5 text-right font-mono text-[11px] font-semibold tabular-nums">{integer(session.round_count)}</td>
                        <td className="px-2 py-1.5 text-right font-mono text-[11px] tabular-nums text-violet">{multiplier(session.peak)}</td>
                        <td className="px-4 py-1.5 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                          {decimal(session.mean, 2)}x
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {database && (
          <Panel title="Storage" subtitle={database.path}>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
              {Object.entries(database.counts).map(([table, count]) => (
                <div key={table} className="rounded-md border border-border/45 bg-muted/12 px-3 py-2">
                  <p className="hud-label truncate">{table.replace(/_/g, " ")}</p>
                  <p className="mt-0.5 font-mono text-base font-semibold tabular-nums">{integer(count)}</p>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
