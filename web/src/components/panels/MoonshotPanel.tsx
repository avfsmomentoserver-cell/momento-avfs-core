import { Rocket } from "lucide-react";

import { EmptyState } from "@/components/console/EmptyState";
import { Meter } from "@/components/console/Meter";
import { Panel } from "@/components/console/Panel";
import { percent, multiplier } from "@/lib/format";
import type { MoonshotData } from "@/lib/types";

interface MoonshotPanelProps {
  moonshot: MoonshotData | undefined;
}

/** Moonshot scanner analysis panel. */
export function MoonshotPanel({ moonshot }: MoonshotPanelProps) {
  if (!moonshot) {
    return (
      <Panel title="Moonshot Scanner" subtitle="High-multiplier prediction" icon={<Rocket className="h-3.5 w-3.5" />}>
        <EmptyState compact title="No moonshot data" description="Moonshot analysis requires at least 20 rounds of history." />
      </Panel>
    );
  }

  const { imminent, confidence, factors, patterns, historical_moonshots, distance_targets } = moonshot;

  const confidenceColor = (confidence || 0) > 0.8 ? "hsl(var(--signal))" : (confidence || 0) > 0.6 ? "hsl(var(--info))" : "hsl(var(--muted-foreground))";

  return (
    <Panel title="Moonshot Scanner" subtitle="High-multiplier prediction" icon={<Rocket className="h-3.5 w-3.5" />}>
      <div className="space-y-3.5">
        <Meter
          label="Moonshot confidence"
          value={confidence || 0}
          active={(confidence || 0) > 0.7}
          color={confidenceColor}
          detail={percent(confidence || 0)}
        />

        {factors && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <p className="hud-label mb-2">Key factors</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Pressure</span>
                <span className="ml-1.5 font-mono font-medium text-signal">{percent(factors.pressure || 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Ceiling proximity</span>
                <span className="ml-1.5 font-mono font-medium text-info">{percent(factors.ceiling_proximity || 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Compression</span>
                <span className="ml-1.5 font-mono font-medium text-caution">{percent(factors.compression || 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">20x distance</span>
                <span className="ml-1.5 font-mono font-medium">
                  {factors.momentum_distance_20x?.found ? `${factors.momentum_distance_20x.distance} rounds` : "N/A"}
                </span>
              </div>
            </div>
          </div>
        )}

        {patterns && patterns.patterns && patterns.patterns.length > 0 && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <p className="hud-label mb-2">Pattern matching</p>
            <div className="space-y-1.5">
              {patterns.patterns.slice(0, 3).map((pattern, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Pattern {idx + 1}</span>
                  <span className="font-mono font-medium text-signal">{percent(pattern.confidence || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
          <p className="hud-label mb-1">Historical context</p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total moonshots</span>
            <span className="font-mono font-semibold text-signal">{historical_moonshots || 0}</span>
          </div>
        </div>

        {distance_targets && distance_targets.length > 0 && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <p className="hud-label mb-1">Distance targets</p>
            <div className="flex flex-wrap gap-1.5">
              {distance_targets.map((target, idx) => (
                <span key={idx} className="chip-info text-xs">
                  {multiplier(target)}x
                </span>
              ))}
            </div>
          </div>
        )}

        {imminent && (
          <div className="rounded-lg border border-signal/50 bg-signal/10 p-3">
            <p className="text-xs font-semibold text-signal">Moonshot conditions detected</p>
          </div>
        )}
      </div>
    </Panel>
  );
}
