import { useQuery } from "@tanstack/react-query";
import { ChartLine, Loader2 } from "lucide-react";
import { useState } from "react";

import { BandDistribution } from "@/components/charts/BandDistribution";
import { PointsChart } from "@/components/charts/PointsChart";
import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { Sparkline } from "@/components/console/Sparkline";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { integer, multiplier, multiplierColor, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/state/PlatformProvider";

const WINDOWS = [60, 150, 300] as const;

/** Consumer chart view — readable history without the operator density. */
export default function AppCharts() {
  const { source, analysis, rounds } = usePlatform();
  const [windowSize, setWindowSize] = useState<number>(150);

  const pointsQuery = useQuery({
    queryKey: ["points", source, windowSize],
    queryFn: () => api.points(source, windowSize),
    refetchInterval: POLL.analysis,
  });

  const recent = [...rounds].reverse().map((round) => round.multiplier);
  const highs = rounds.filter((round) => round.multiplier >= 10).length;

  return (
    <AppShell title="Charts" subtitle="How this session has actually behaved">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Last round" value={multiplier(analysis?.latest.multiplier)} accent="signal" hint={`${analysis?.latest.band ?? "—"} band`} emphasis />
          <StatTile label="Session peak" value={multiplier(analysis?.session.peak)} accent="violet" hint={`${integer(analysis?.session.count)} rounds played`} />
          <StatTile label="Typical round" value={multiplier(analysis?.percentiles.p50)} accent="info" hint={`75th pct ${multiplier(analysis?.percentiles.p75)}`} />
          <StatTile label="Rounds over 10x" value={integer(highs)} accent="caution" hint={`${percent(analysis?.distribution["10x"], 1)} of history`} />
        </div>

        <Panel
          title="Price Action"
          subtitle="multipliers on the Momento point scale — a fair way to see 1.1x and 200x together"
          icon={<ChartLine className="h-3.5 w-3.5" />}
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
          lit
        >
          {pointsQuery.isLoading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (pointsQuery.data?.series.length ?? 0) > 1 ? (
            <PointsChart series={pointsQuery.data?.series ?? []} height={280} showEnvelope={false} />
          ) : (
            <EmptyState title="No chart yet" description="Results will appear here once the session has a couple of rounds." />
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="How Often Each Range Hits" subtitle="observed share of rounds per band">
            {(analysis?.band_histogram.length ?? 0) === 0 ? (
              <EmptyState compact title="No distribution yet" />
            ) : (
              <BandDistribution histogram={analysis?.band_histogram ?? []} height={220} />
            )}
          </Panel>

          <Panel title="Reach Probability" subtitle="share of rounds that got at least this far">
            {!analysis?.distribution ? (
              <EmptyState compact title="No data" />
            ) : (
              <ul className="space-y-2.5">
                {Object.entries(analysis.distribution).map(([label, share]) => (
                  <li key={label}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold tabular-nums">{label}</span>
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{percent(share, 1)}</span>
                    </div>
                    <div className="mt-1 meter-track">
                      <div
                        className="meter-fill"
                        style={{
                          width: `${Math.min(100, share * 100)}%`,
                          backgroundColor: multiplierColor(Number.parseFloat(label)),
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Recent Results" subtitle={`last ${Math.min(60, rounds.length)} rounds, newest first`}>
          {rounds.length === 0 ? (
            <EmptyState compact title="No results yet" />
          ) : (
            <div className="space-y-3">
              <Sparkline values={recent.slice(-60)} width={720} height={52} className="w-full" />
              <div className="flex flex-wrap gap-1.5">
                {rounds.slice(0, 60).map((round) => (
                  <span
                    key={round.id}
                    className="rounded-md border border-border/50 bg-muted/20 px-2 py-1 font-mono text-[11px] font-semibold tabular-nums"
                    style={{ color: multiplierColor(round.multiplier) }}
                  >
                    {round.multiplier.toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <p className="px-2 text-center text-[10px] leading-relaxed text-muted-foreground/60">
          Charts describe what already happened. Past distribution does not determine the next round.
        </p>
      </div>
    </AppShell>
  );
}
