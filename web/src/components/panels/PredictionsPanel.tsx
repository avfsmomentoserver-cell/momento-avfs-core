import { Target } from "lucide-react";

import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { multiplier, percent } from "@/lib/format";
import type { PredictionCandidate } from "@/lib/types";

interface PredictionsPanelProps {
  predictions: PredictionCandidate[];
  limit?: number;
}

/** Ranked next-round state candidates with probability bars and target ranges. */
export function PredictionsPanel({ predictions, limit = 7 }: PredictionsPanelProps) {
  const rows = predictions.slice(0, limit);
  const top = rows[0]?.probability ?? 1;

  return (
    <Panel
      title="Prediction Candidates"
      subtitle="Markov · percentile · DNA blend"
      icon={<Target className="h-3.5 w-3.5" />}
    >
      {rows.length === 0 ? (
        <EmptyState compact title="Forecast engine idle" description="At least eight rounds are needed before candidates are produced." />
      ) : (
        <ol className="space-y-2">
          {rows.map((candidate, index) => (
            <li key={candidate.state} className="group">
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">{String(index + 1).padStart(2, "0")}</span>
                  <span className="font-medium" style={{ color: candidate.color }}>
                    {candidate.state}
                  </span>
                </span>
                <span className="font-mono text-xs font-semibold tabular-nums">{percent(candidate.probability, 1)}</span>
              </div>

              <div className="mt-1 meter-track">
                <div
                  className="meter-fill"
                  style={{
                    width: `${(candidate.probability / Math.max(top, 0.0001)) * 100}%`,
                    backgroundColor: candidate.color,
                  }}
                />
              </div>

              <p className="mt-1 font-mono text-[10px] tabular-nums text-muted-foreground">
                {multiplier(candidate.range_lo)} — {multiplier(candidate.range_hi)}
                {candidate.survival_estimate !== undefined && ` · survival ${percent(candidate.survival_estimate, 1)}`}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
