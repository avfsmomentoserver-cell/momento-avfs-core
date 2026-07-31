import { Radar } from "lucide-react";

import { EmptyState } from "@/components/console/EmptyState";
import { Meter } from "@/components/console/Meter";
import { Panel } from "@/components/console/Panel";
import { decimal, multiplier, percent } from "@/lib/format";
import type { Signals } from "@/lib/types";

interface SignalPanelProps {
  signals: Signals | undefined;
}

/** Structural signal strengths: ladders, compression, shelf, bait, resistance. */
export function SignalPanel({ signals }: SignalPanelProps) {
  const ascending = signals?.ascending_ladder;
  const collapse = signals?.collapse_ladder;
  const nested = signals?.nested;
  const shelf = signals?.shelf;
  const bait = signals?.bait;
  const resistance = signals?.upper_resistance;

  const hasAny = Boolean(ascending || collapse || nested || shelf || bait);

  return (
    <Panel title="Signal Strength" subtitle="Structural pressure readouts" icon={<Radar className="h-3.5 w-3.5" />}>
      {!hasAny ? (
        <EmptyState compact title="No signals yet" description="Signals activate once at least a handful of rounds are ingested." />
      ) : (
        <div className="space-y-3.5">
          {ascending && (
            <Meter
              label="Ascending ladder"
              value={ascending.strength}
              active={ascending.active}
              color="hsl(var(--signal))"
              detail={`${ascending.length ?? 0} rounds · floor ${multiplier(ascending.floor)} · slope ${decimal(ascending.slope, 1)}`}
            />
          )}

          {collapse && (
            <Meter
              label="Collapse ladder"
              value={collapse.strength}
              active={collapse.active}
              color="hsl(var(--critical))"
              detail={`${collapse.run ?? 0} rounds · ceiling ${multiplier(collapse.ceiling)} · gap ${percent(collapse.breakout_pct)}`}
            />
          )}

          {nested && (
            <Meter
              label="Nested compression"
              value={nested.compression}
              active={nested.detected}
              color="hsl(var(--info))"
              detail={`spread ${decimal(nested.early_spread, 0)} → ${decimal(nested.late_spread, 0)} over ${nested.rounds} rounds`}
            />
          )}

          {shelf && (
            <Meter
              label="Variance shelf"
              value={shelf.strength}
              active={shelf.active}
              color="hsl(var(--muted-foreground))"
              detail={`level ${multiplier(shelf.level)} · variance ${decimal(shelf.variance, 1)}`}
            />
          )}

          {bait && (
            <Meter
              label="Bait risk"
              value={bait.strength}
              active={bait.active}
              color="hsl(var(--caution))"
              detail={`spike ${multiplier(bait.spike)} vs context ${multiplier(bait.context_mean)} (${decimal(bait.ratio, 2)}x)`}
            />
          )}

          {resistance && (
            <Meter
              label="Resistance pressure"
              value={resistance.pressure}
              active={resistance.pressure > 0.45}
              color="hsl(var(--violet))"
              detail={
                resistance.nearest
                  ? `next wall ${multiplier(resistance.nearest.multiplier)} · ${resistance.nearest.touches} touches · ${resistance.recently_cleared} cleared`
                  : `${resistance.levels.length} zones mapped`
              }
            />
          )}
        </div>
      )}
    </Panel>
  );
}
