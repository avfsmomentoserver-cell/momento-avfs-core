import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Cpu, Database, HardDrive, Network, Server } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { bytes, duration, integer, percent, relativeTime, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Bird's Eye: the whole platform on one screen — sub-projects, engines, host. */
export default function BirdEye() {
  const overviewQuery = useQuery({
    queryKey: ["overview"],
    queryFn: () => api.overview(),
    refetchInterval: POLL.slow,
  });

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: () => api.health(),
    refetchInterval: POLL.health,
  });

  const enginesQuery = useQuery({
    queryKey: ["engines-health"],
    queryFn: () => api.enginesHealth(),
    refetchInterval: POLL.health,
  });

  const overview = overviewQuery.data;
  const health = healthQuery.data;
  const engines = enginesQuery.data;

  return (
    <AppShell title="Bird's Eye" subtitle="Platform topology, engine health and host telemetry">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile
            label="Platform"
            value={health?.status === "healthy" ? "HEALTHY" : "DEGRADED"}
            accent={health?.status === "healthy" ? "signal" : "critical"}
            hint={`v${health?.version ?? "—"} · up ${duration(health?.uptime_seconds)}`}
            icon={<Server className="h-3.5 w-3.5" />}
            emphasis
          />
          <StatTile
            label="Engines online"
            value={`${integer(engines?.engines.filter((e) => e.enabled).length)}/${integer(engines?.engines.length)}`}
            accent="info"
            hint={engines?.status === "healthy" ? "all systems nominal" : "some engines disabled"}
            icon={<Cpu className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Rounds stored"
            value={integer(engines?.data.total_rounds)}
            accent="violet"
            hint={`${integer(engines?.data.sources)} sources · ${bytes(health?.database.size_bytes)}`}
            icon={<Database className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Socket clients"
            value={integer(health?.websocket.clients)}
            accent="signal"
            hint={`${integer(health?.websocket.messages_sent)} frames sent`}
            icon={<Network className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Analyzer signals"
            value={integer(engines?.plugins.signals_generated)}
            accent="caution"
            hint={`${integer(engines?.plugins.active)} of ${integer(engines?.plugins.total)} analyzers active`}
            icon={<Activity className="h-3.5 w-3.5" />}
          />
        </div>

        <Panel title="Data Pipeline" subtitle="every stage the data passes through" lit>
          <div className="flex flex-wrap items-center gap-2">
            {(overview?.pipeline ?? []).map((stage, index) => (
              <span key={stage} className="flex items-center gap-2">
                <span className="rounded-md border border-signal/25 bg-signal/8 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
                  {stage}
                </span>
                {index < (overview?.pipeline.length ?? 0) - 1 && <ArrowRight className="h-3.5 w-3.5 text-border" />}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="Sub-Projects" subtitle={`${integer(overview?.sub_projects.length)} modules, each with a single responsibility`}>
          {!overview ? (
            <EmptyState compact title="Loading topology" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {overview.sub_projects.map((project, index) => (
                <Link
                  key={project.id}
                  to={project.surface}
                  className="panel group flex flex-col p-4 transition-colors hover:border-signal/45"
                >
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-1 text-xs font-semibold">{project.name}</h3>
                  <p className="mt-1.5 flex-1 text-[11px] leading-relaxed text-muted-foreground">{project.description}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {project.engines.map((engine) => {
                      const state = engines?.engines.find((entry) => entry.name === engine);
                      return (
                        <span key={engine} className={state?.enabled === false ? "chip-muted" : "chip-signal"}>
                          {engine.replace(/_/g, " ")}
                        </span>
                      );
                    })}
                  </div>
                  <span className="mt-2.5 inline-flex items-center gap-1 font-mono text-[10px] text-signal">
                    {project.surface}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Engine Health" subtitle="runtime toggles reported by the backend" icon={<Cpu className="h-3.5 w-3.5" />}>
            {!engines ? (
              <EmptyState compact title="Loading engines" />
            ) : (
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {engines.engines.map((engine) => (
                  <li
                    key={engine.name}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-md border px-3 py-2",
                      engine.enabled ? "border-signal/25 bg-signal/6" : "border-border/40 bg-muted/10",
                    )}
                  >
                    <span className="truncate text-[11px]">{titleCase(engine.name)}</span>
                    <span className={engine.enabled ? "chip-signal" : "chip-muted"}>{engine.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Host & Storage" subtitle="where the backend is running" icon={<HardDrive className="h-3.5 w-3.5" />}>
            {!health ? (
              <EmptyState compact title="Loading host" />
            ) : (
              <dl className="space-y-0.5">
                {[
                  { label: "Host", value: health.host },
                  { label: "Python", value: health.python },
                  { label: "Uptime", value: duration(health.uptime_seconds) },
                  { label: "Database", value: health.database.path },
                  { label: "Database size", value: bytes(health.database.size_bytes) },
                  { label: "Oldest round", value: health.database.oldest_round ? relativeTime(health.database.oldest_round) : "—" },
                  { label: "Newest round", value: health.database.newest_round ? relativeTime(health.database.newest_round) : "—" },
                  { label: "Watcher", value: health.watcher.running ? `running · ${integer(health.watcher.pending_files)} pending` : "stopped" },
                  {
                    label: "Live engine",
                    value: health.feed.running ? `emitting · ${integer(health.feed.rounds_emitted)} rounds` : "idle",
                  },
                  { label: "Chain remaining", value: integer(health.feed.chain_remaining) },
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-3 border-b border-border/25 py-1.5 last:border-0">
                    <dt className="shrink-0 text-[11px] text-muted-foreground">{row.label}</dt>
                    <dd className="truncate font-mono text-[10px] tabular-nums text-foreground/80" title={String(row.value)}>
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Panel>
        </div>

        <Panel title="Table Footprint" subtitle="row counts per table">
          {!health ? (
            <EmptyState compact title="Loading storage" />
          ) : (
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
              {Object.entries(health.database.counts).map(([table, count]) => {
                const total = Math.max(1, Math.max(...Object.values(health.database.counts)));
                return (
                  <div key={table} className="rounded-md border border-border/45 bg-muted/12 px-3 py-2.5">
                    <p className="hud-label truncate">{table.replace(/_/g, " ")}</p>
                    <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums">{integer(count)}</p>
                    <div className="mt-1.5 meter-track">
                      <div className="meter-fill bg-signal" style={{ width: `${(count / total) * 100}%` }} />
                    </div>
                    <p className="mt-1 font-mono text-[9px] text-muted-foreground/60">{percent(count / total, 0)} of largest</p>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
