import { Gauge } from "lucide-react";

import { EmptyState } from "@/components/console/EmptyState";
import { Meter } from "@/components/console/Meter";
import { Panel } from "@/components/console/Panel";
import { percent, multiplier } from "@/lib/format";
import type { PressureData } from "@/lib/types";

interface PressurePanelProps {
  pressure: PressureData | undefined;
}

/** Resistance ceiling pressure analysis panel. */
export function PressurePanel({ pressure }: PressurePanelProps) {
  if (!pressure) {
    return (
      <Panel title="Pressure Analysis" subtitle="Resistance ceiling detection" icon={<Gauge className="h-3.5 w-3.5" />}>
        <EmptyState compact title="No pressure data" description="Pressure analysis requires at least 20 rounds of history." />
      </Panel>
    );
  }

  const { pressure_percent, dominant_ceiling, release_probability, imminent_ranges, status } = pressure;

  const statusColor = {
    critical: "hsl(var(--critical))",
    high: "hsl(var(--caution))",
    moderate: "hsl(var(--info))",
    low: "hsl(var(--muted-foreground))",
  }[status || "low"];

  return (
    <Panel title="Pressure Analysis" subtitle="Resistance ceiling detection" icon={<Gauge className="h-3.5 w-3.5" />}>
      <div className="space-y-3.5">
        <Meter
          label="Overall pressure"
          value={pressure_percent / 100}
          active={pressure_percent > 50}
          color={statusColor}
          detail={`${percent(pressure_percent)} · ${(status || "low").toUpperCase()}`}
        />

        <Meter
          label="Release probability"
          value={release_probability}
          active={release_probability > 0.6}
          color="hsl(var(--signal))"
          detail={percent(release_probability)}
        />

        {dominant_ceiling && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <p className="hud-label mb-1">Dominant ceiling</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-semibold text-signal">
                {multiplier(dominant_ceiling.level)}
              </span>
              <span className="text-xs text-muted-foreground">
                {dominant_ceiling.touches} touches · {dominant_ceiling.archetype}
              </span>
            </div>
          </div>
        )}

        {imminent_ranges && imminent_ranges.length > 0 && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <p className="hud-label mb-1">Imminent breakout ranges</p>
            <div className="flex flex-wrap gap-1.5">
              {imminent_ranges.map((range, idx) => (
                <span key={idx} className="chip-info">
                  {multiplier(range[0])}–{multiplier(range[1])}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
