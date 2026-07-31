import { TrendingUp } from "lucide-react";

import { EmptyState } from "@/components/console/EmptyState";
import { Meter } from "@/components/console/Meter";
import { Panel } from "@/components/console/Panel";
import { decimal } from "@/lib/format";
import type { BaselineData } from "@/lib/types";

interface BaselinePanelProps {
  baseline: BaselineData | undefined;
}

/** Equal baseline momentum analysis panel. */
export function BaselinePanel({ baseline }: BaselinePanelProps) {
  if (!baseline) {
    return (
      <Panel title="Baseline Momentum" subtitle="Normalized trendline analysis" icon={<TrendingUp className="h-3.5 w-3.5" />}>
        <EmptyState compact title="No baseline data" description="Baseline analysis requires at least 20 rounds of history." />
      </Panel>
    );
  }

  const { values, trendlines, shifts } = baseline;
  const momentumArray = trendlines.momentum || [];
  const shortArray = trendlines.short || [];
  const longArray = trendlines.long || [];
  const latestMomentum = momentumArray[momentumArray.length - 1] || 0;
  const latestShort = shortArray[shortArray.length - 1] || 0;
  const latestLong = longArray[longArray.length - 1] || 0;

  const momentumDirection = latestMomentum > 5 ? "up" : latestMomentum < -5 ? "down" : "neutral";
  const momentumColor = {
    up: "hsl(var(--signal))",
    down: "hsl(var(--critical))",
    neutral: "hsl(var(--muted-foreground))",
  }[momentumDirection];

  const recentShifts = shifts.slice(-3);

  return (
    <Panel title="Baseline Momentum" subtitle="Normalized trendline analysis" icon={<TrendingUp className="h-3.5 w-3.5" />}>
      <div className="space-y-3.5">
        <Meter
          label="Current momentum"
          value={Math.min(1, Math.abs(latestMomentum) / 20)}
          active={Math.abs(latestMomentum) > 5}
          color={momentumColor}
          detail={`${decimal(latestMomentum, 1)} · ${momentumDirection.toUpperCase()}`}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5">
            <p className="hud-label text-[10px]">Short trend</p>
            <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-signal">
              {decimal(latestShort, 1)}
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5">
            <p className="hud-label text-[10px]">Long trend</p>
            <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-info">
              {decimal(latestLong, 1)}
            </p>
          </div>
        </div>

        {recentShifts.length > 0 && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <p className="hud-label mb-2">Recent momentum shifts</p>
            <div className="space-y-1.5">
              {recentShifts.map((shift, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Shift #{shift.index}</span>
                  <span
                    className={`font-mono font-medium ${
                      shift.direction === "up" ? "text-signal" : shift.direction === "down" ? "text-critical" : "text-muted-foreground"
                    }`}
                  >
                    {shift.direction === "up" ? "↑" : shift.direction === "down" ? "↓" : "→"} {decimal(shift.momentum, 1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
          <p className="hud-label mb-1">Baseline values (last 5)</p>
          <div className="flex flex-wrap gap-1">
            {values.slice(-5).map((val, idx) => (
              <span key={idx} className="chip-muted text-xs">
                {decimal(val, 0)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
