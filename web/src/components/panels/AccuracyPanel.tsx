import { Crosshair } from "lucide-react";

import { EmptyState } from "@/components/console/EmptyState";
import { Meter } from "@/components/console/Meter";
import { Panel } from "@/components/console/Panel";
import { decimal, integer, percent } from "@/lib/format";
import type { AccuracyReport } from "@/lib/types";

interface AccuracyPanelProps {
  accuracy: AccuracyReport | undefined;
  pending?: number;
  actions?: React.ReactNode;
}

/**
 * Realised forecast accuracy. Every number here comes from forecasts that were
 * recorded before the round landed, then scored against reality.
 */
export function AccuracyPanel({ accuracy, pending, actions }: AccuracyPanelProps) {
  const total = accuracy?.total ?? 0;

  return (
    <Panel
      title="Forecast Accuracy"
      subtitle={total > 0 ? `${integer(total)} resolved` : "awaiting resolutions"}
      icon={<Crosshair className="h-3.5 w-3.5" />}
      actions={actions}
    >
      {total === 0 ? (
        <EmptyState
          compact
          title="No resolved forecasts"
          description="Record a forecast, then let the next rounds land — accuracy is measured against real outcomes only."
        />
      ) : (
        <div className="space-y-3.5">
          <Meter label="Overall hit rate" value={accuracy?.overall ?? 0} />
          <div className="grid grid-cols-2 gap-3">
            <Meter label="Last 10" value={accuracy?.last_10 ?? 0} />
            <Meter label="Last 50" value={accuracy?.last_50 ?? 0} />
          </div>

          <dl className="grid grid-cols-3 gap-2 border-t border-border/50 pt-3 text-center">
            <div>
              <dt className="hud-label">Brier</dt>
              <dd className="mt-0.5 font-mono text-sm tabular-nums">{decimal(accuracy?.brier, 3)}</dd>
            </div>
            <div>
              <dt className="hud-label">Calibration</dt>
              <dd className="mt-0.5 font-mono text-sm tabular-nums">{percent(accuracy?.calibration, 0)}</dd>
            </div>
            <div>
              <dt className="hud-label">Pending</dt>
              <dd className="mt-0.5 font-mono text-sm tabular-nums">{integer(pending ?? 0)}</dd>
            </div>
          </dl>

          {accuracy?.by_state && Object.keys(accuracy.by_state).length > 0 && (
            <div className="space-y-1.5 border-t border-border/50 pt-3">
              <p className="hud-label">By predicted state</p>
              {Object.entries(accuracy.by_state)
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 5)
                .map(([state, bucket]) => (
                  <div key={state} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-muted-foreground">{state}</span>
                    <span className="font-mono tabular-nums">
                      {percent(bucket.accuracy)} <span className="text-muted-foreground/60">({bucket.hits}/{bucket.total})</span>
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
