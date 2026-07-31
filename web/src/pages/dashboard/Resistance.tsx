import { useQuery } from "@tanstack/react-query";
import { ArrowDownUp, Gauge, Loader2, TrendingDown } from "lucide-react";

import { EmptyState } from "@/components/console/EmptyState";
import { Meter } from "@/components/console/Meter";
import { Panel } from "@/components/console/Panel";
import { Sparkline } from "@/components/console/Sparkline";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { decimal, integer, multiplier, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/state/PlatformProvider";

/** Resistance mapping: ceiling analyzer, gap/swing analyzer and clustered walls. */
export default function Resistance() {
  const { source, analysis } = usePlatform();

  const resistanceQuery = useQuery({
    queryKey: ["resistance", source],
    queryFn: () => api.resistance(source, "file"),
    refetchInterval: POLL.analysis,
  });

  const ceilingQuery = useQuery({
    queryKey: ["ceiling", source],
    queryFn: () => api.ceiling(source, "file"),
    refetchInterval: POLL.analysis,
  });

  const gapQuery = useQuery({
    queryKey: ["gap-swing", source],
    queryFn: () => api.gapSwing(source, "file"),
    refetchInterval: POLL.analysis,
  });

  const resistance = resistanceQuery.data?.resistance ?? analysis?.signals.upper_resistance;
  const ceiling = ceilingQuery.data;
  const gap = gapQuery.data;
  const currentPoints = resistance?.current_points ?? analysis?.latest.points ?? 0;

  return (
    <AppShell title="Resistance" subtitle="Ceiling structure, cleared walls and swing momentum">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Resistance pressure"
            value={percent(resistance?.pressure)}
            accent="caution"
            progress={resistance?.pressure ?? 0}
            hint={resistance?.nearest ? `nearest wall ${multiplier(resistance.nearest.multiplier)}` : "no wall above"}
            emphasis
          />
          <StatTile
            label="Ceiling analyzer"
            value={percent(ceiling?.score)}
            accent={ceiling?.signal === "collapse" ? "critical" : "neutral"}
            progress={ceiling?.score ?? 0}
            hint={ceiling?.detail ?? "awaiting data"}
            icon={<TrendingDown className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Swing momentum"
            value={percent(gap?.score)}
            accent={gap?.direction === "up" ? "signal" : gap?.direction === "down" ? "critical" : "neutral"}
            progress={gap?.score ?? 0}
            hint={`${gap?.direction ?? "flat"} · net ${decimal(gap?.net, 1)} pts`}
            icon={<ArrowDownUp className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Walls cleared"
            value={integer(resistance?.recently_cleared)}
            accent="signal"
            hint={`of ${integer(resistance?.levels.length)} mapped zones in the last 10 rounds`}
            icon={<Gauge className="h-3.5 w-3.5" />}
          />
        </div>

        <Panel
          title="Resistance Ladder"
          subtitle={`${integer(resistance?.levels.length)} clustered zones · current tape at ${decimal(currentPoints, 1)} pts`}
          lit
        >
          {resistanceQuery.isLoading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : !resistance || resistance.levels.length === 0 ? (
            <EmptyState title="No zones mapped" description="Resistance clustering needs at least eight rounds of history." />
          ) : (
            <ol className="space-y-2">
              {[...resistance.levels]
                .sort((a, b) => b.points - a.points)
                .map((level) => {
                  const above = level.points > currentPoints;
                  return (
                    <li
                      key={level.points}
                      className={cn(
                        "rounded-md border px-3 py-2.5",
                        above ? "border-caution/30 bg-caution/8" : "border-signal/25 bg-signal/8",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-baseline gap-2">
                          <span className={cn("font-mono text-base font-semibold tabular-nums", above ? "text-caution" : "text-signal")}>
                            {multiplier(level.multiplier)}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{level.band}</span>
                          <span className={above ? "chip-caution" : "chip-signal"}>{above ? "overhead" : "cleared"}</span>
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                          {level.touches} touches · {percent(level.weight, 1)} weight
                        </span>
                      </div>
                      <div className="mt-1.5 meter-track">
                        <div
                          className={cn("meter-fill", above ? "bg-caution" : "bg-signal")}
                          style={{ width: `${Math.min(100, level.weight * 300)}%` }}
                        />
                      </div>
                      <p className="mt-1 font-mono text-[10px] tabular-nums text-muted-foreground/70">
                        {decimal(level.points, 1)} pts · {decimal(level.points - currentPoints, 1)} from tape
                      </p>
                    </li>
                  );
                })}
            </ol>
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Ceiling Analyzer" subtitle="collapse structure and breakout distance" icon={<TrendingDown className="h-3.5 w-3.5" />}>
            {!ceiling ? (
              <EmptyState compact title="Analyzer idle" />
            ) : (
              <div className="space-y-3.5">
                <Meter label="Composite score" value={ceiling.score} color="hsl(var(--critical))" detail={ceiling.detail} />
                <Meter
                  label="Breakout distance"
                  value={ceiling.breakout_pct}
                  color="hsl(var(--caution))"
                  detail={`tape sits ${percent(ceiling.breakout_pct)} below the ${multiplier(ceiling.ceiling)} ceiling`}
                />
                <dl className="grid grid-cols-3 gap-2 border-t border-border/50 pt-3 text-center">
                  <div>
                    <dt className="hud-label">Ceiling</dt>
                    <dd className="mt-0.5 font-mono text-sm tabular-nums text-critical">{multiplier(ceiling.ceiling)}</dd>
                  </div>
                  <div>
                    <dt className="hud-label">Run</dt>
                    <dd className="mt-0.5 font-mono text-sm tabular-nums">{integer(ceiling.run)}</dd>
                  </div>
                  <div>
                    <dt className="hud-label">Signal</dt>
                    <dd className="mt-0.5 font-mono text-[11px] uppercase tracking-wider">{ceiling.signal}</dd>
                  </div>
                </dl>
              </div>
            )}
          </Panel>

          <Panel title="Gap & Swing Analyzer" subtitle="round-over-round point deltas" icon={<ArrowDownUp className="h-3.5 w-3.5" />}>
            {!gap ? (
              <EmptyState compact title="Analyzer idle" />
            ) : (
              <div className="space-y-3.5">
                <Meter
                  label="Swing score"
                  value={gap.score}
                  color={gap.direction === "up" ? "hsl(var(--signal))" : "hsl(var(--critical))"}
                  detail={gap.detail}
                />

                {gap.detail_series?.gaps && gap.detail_series.gaps.length > 2 && (
                  <div>
                    <p className="hud-label mb-1.5">Gap trace</p>
                    <div className="flex h-16 items-center gap-[3px]">
                      {gap.detail_series.gaps.map((value, index) => {
                        const magnitude = Math.min(1, Math.abs(value) / 45);
                        return (
                          <span key={index} className="flex h-full flex-1 flex-col justify-center">
                            <span
                              className={cn("w-full rounded-sm", value >= 0 ? "bg-signal/70 self-end" : "bg-critical/70")}
                              style={{ height: `${Math.max(6, magnitude * 30)}px`, marginTop: value >= 0 ? "auto" : 0 }}
                              title={`${value >= 0 ? "+" : ""}${value.toFixed(1)} pts`}
                            />
                          </span>
                        );
                      })}
                    </div>
                    <Sparkline
                      values={gap.detail_series.gaps}
                      width={320}
                      height={30}
                      color={gap.direction === "up" ? "hsl(var(--signal))" : "hsl(var(--critical))"}
                      className="mt-2 w-full"
                    />
                  </div>
                )}

                <dl className="grid grid-cols-4 gap-2 border-t border-border/50 pt-3 text-center">
                  <div>
                    <dt className="hud-label">Net</dt>
                    <dd className="mt-0.5 font-mono text-sm tabular-nums">{decimal(gap.net, 1)}</dd>
                  </div>
                  <div>
                    <dt className="hud-label">Mean</dt>
                    <dd className="mt-0.5 font-mono text-sm tabular-nums">{decimal(gap.mean_gap, 1)}</dd>
                  </div>
                  <div>
                    <dt className="hud-label">Max</dt>
                    <dd className="mt-0.5 font-mono text-sm tabular-nums">{decimal(gap.max_swing, 1)}</dd>
                  </div>
                  <div>
                    <dt className="hud-label">Up ratio</dt>
                    <dd className="mt-0.5 font-mono text-sm tabular-nums">{percent(gap.up_ratio)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
