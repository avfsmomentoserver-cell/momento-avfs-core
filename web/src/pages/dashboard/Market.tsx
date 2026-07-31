import { useQuery } from "@tanstack/react-query";
import { CandlestickChart, Layers, Loader2 } from "lucide-react";
import { useState } from "react";

import { CandleChart } from "@/components/charts/CandleChart";
import { PointsChart } from "@/components/charts/PointsChart";
import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { RoundsFeed } from "@/components/panels/RoundsFeed";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { decimal, integer, multiplier, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/state/PlatformProvider";

const AGGREGATIONS = [1, 3, 5, 10, 20] as const;
const WINDOWS = [150, 300, 600, 1200] as const;

/** Candlestick + point-series market view in Momento point space. */
export default function Market() {
  const { source, analysis, rounds, flashRoundId } = usePlatform();
  const [perCandle, setPerCandle] = useState<number>(5);
  const [windowSize, setWindowSize] = useState<number>(600);

  const candlesQuery = useQuery({
    queryKey: ["candles", source, windowSize, perCandle],
    queryFn: () => api.candles(source, windowSize, perCandle, "file"),
    refetchInterval: POLL.analysis,
  });

  const pointsQuery = useQuery({
    queryKey: ["points", source, windowSize],
    queryFn: () => api.points(source, windowSize, "file"),
    refetchInterval: POLL.analysis,
  });

  const candles = candlesQuery.data?.candles ?? [];
  const last = candles.length > 0 ? candles[candles.length - 1] : null;
  const first = candles.length > 0 ? candles[0] : null;
  const change = last && first ? last.close - first.open : 0;
  const resistance = analysis?.signals.upper_resistance;

  return (
    <AppShell title="Market" subtitle="OHLC candles and point-mapped price action">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Current points"
            value={decimal(analysis?.latest.points, 1)}
            accent="signal"
            hint={`${multiplier(analysis?.latest.multiplier)} · ${analysis?.latest.band ?? "—"}`}
            emphasis
          />
          <StatTile
            label="Window change"
            value={`${change >= 0 ? "+" : ""}${decimal(change, 1)}`}
            accent={change >= 0 ? "signal" : "critical"}
            hint={`${candles.length} candles at ${perCandle} rounds each`}
          />
          <StatTile
            label="Session peak"
            value={multiplier(analysis?.session.peak)}
            accent="violet"
            hint={`mean ${multiplier(analysis?.session.mean)} · median ${multiplier(analysis?.session.median)}`}
          />
          <StatTile
            label="Resistance pressure"
            value={percent(resistance?.pressure)}
            accent="caution"
            progress={resistance?.pressure ?? 0}
            hint={
              resistance?.nearest
                ? `next wall ${multiplier(resistance.nearest.multiplier)} (${resistance.nearest.touches} touches)`
                : "no wall mapped"
            }
          />
        </div>

        <Panel
          title="Candlesticks"
          subtitle={`${integer(candlesQuery.data?.count)} candles · ${perCandle} rounds per candle`}
          icon={<CandlestickChart className="h-3.5 w-3.5" />}
          actions={
            <div className="flex items-center gap-1">
              {AGGREGATIONS.map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant="ghost"
                  onClick={() => setPerCandle(value)}
                  className={cn("h-6 px-1.5 font-mono text-[10px]", perCandle === value && "bg-signal/15 text-signal")}
                >
                  {value}r
                </Button>
              ))}
            </div>
          }
          bodyClassName="p-2 pt-3"
          lit
        >
          {candlesQuery.isLoading ? (
            <div className="flex h-72 items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : candles.length > 0 ? (
            <CandleChart candles={candles} height={340} />
          ) : (
            <EmptyState title="No candles" description="Ingest rounds to build the OHLC series." />
          )}
        </Panel>

        <Panel
          title="Point Series"
          subtitle="Rolling floor / ceiling envelope with resistance zones"
          icon={<Layers className="h-3.5 w-3.5" />}
          actions={
            <div className="flex items-center gap-1">
              {WINDOWS.map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant="ghost"
                  onClick={() => setWindowSize(value)}
                  className={cn("h-6 px-1.5 font-mono text-[10px]", windowSize === value && "bg-signal/15 text-signal")}
                >
                  {value}
                </Button>
              ))}
            </div>
          }
          bodyClassName="p-2 pt-3"
        >
          {pointsQuery.data && pointsQuery.data.series.length > 1 ? (
            <PointsChart series={pointsQuery.data.series} resistance={resistance?.levels ?? []} height={320} />
          ) : (
            <EmptyState title="No series" description="At least two rounds are required." />
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Resistance Zones" subtitle={`${resistance?.levels.length ?? 0} clustered levels`} className="lg:col-span-1">
            {!resistance || resistance.levels.length === 0 ? (
              <EmptyState compact title="No zones mapped" description="Needs at least eight rounds." />
            ) : (
              <ul className="space-y-1.5">
                {resistance.levels.map((level) => (
                  <li key={level.points} className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-muted/15 px-2.5 py-1.5">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold tabular-nums text-caution">{multiplier(level.multiplier)}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{level.band}</span>
                    </span>
                    <span className="flex items-center gap-2 font-mono text-[10px] tabular-nums text-muted-foreground">
                      <span>{level.touches}×</span>
                      <span className="h-1 w-10 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-caution" style={{ width: `${Math.min(100, level.weight * 260)}%` }} />
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="lg:col-span-2">
            <RoundsFeed rounds={rounds} flashRoundId={flashRoundId} limit={40} height="max-h-[340px]" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
