import { Telescope, BarChart3 } from "lucide-react";

import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { Ring } from "@/components/console/Ring";
import { StateBadge } from "@/components/console/StateBadge";
import { decimal, multiplier, percent, stateColor } from "@/lib/format";
import type { ForecastResult } from "@/lib/types";

interface ForecastPanelProps {
  forecast: ForecastResult | null | undefined;
  actions?: React.ReactNode;
  metrics?: {
    precision?: number;
    recall?: number;
    f1_score?: number;
    linguistic_metrics?: {
      overall_score: number;
      factor_contributions: Record<string, number>;
      dominant_factor: string;
    };
  };
}

/** The headline forecast: predicted state, confidence ring and target range. */
export function ForecastPanel({ forecast, actions, metrics }: ForecastPanelProps) {
  return (
    <Panel title="Forecast" subtitle="Next-round projection" icon={<Telescope className="h-3.5 w-3.5" />} actions={actions} lit>
      {!forecast ? (
        <EmptyState compact title="Forecast engine idle" description="Enable the forecast engine and ingest more rounds." />
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Ring
            value={forecast.confidence}
            size={124}
            color={stateColor(forecast.predicted_state)}
            label={percent(forecast.confidence)}
            sublabel={forecast.confidence_label ?? "confidence"}
          />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StateBadge state={forecast.predicted_state} pulse />
              <span className="chip-muted">{forecast.predicted_band} band</span>
              <span className="chip-info">h+{forecast.horizon}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="hud-label">Expected</p>
                <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-signal">
                  {multiplier(forecast.expected_multiplier)}
                </p>
              </div>
              <div>
                <p className="hud-label">Range</p>
                <p className="mt-0.5 font-mono text-sm tabular-nums">
                  {multiplier(forecast.range_lo)} — {multiplier(forecast.range_hi)}
                </p>
              </div>
            </div>

            {forecast.note && <p className="text-[11px] leading-relaxed text-muted-foreground">{forecast.note}</p>}

            {forecast.components && (
              <div className="flex flex-wrap gap-1.5 border-t border-border/50 pt-2.5">
                <span className="chip-muted">markov {decimal(forecast.components.markov_mid as number, 2)}</span>
                <span className="chip-muted">pctile {decimal(forecast.components.percentile_mid as number, 2)}</span>
                <span className="chip-muted">dna {decimal(forecast.components.dna_mid as number, 2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {metrics && (
        <div className="mt-4 border-t border-border/50 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prediction Metrics</p>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-3">
            {metrics.precision !== undefined && (
              <div>
                <p className="hud-label">Precision</p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-signal">
                  {percent(metrics.precision)}
                </p>
              </div>
            )}
            {metrics.recall !== undefined && (
              <div>
                <p className="hud-label">Recall</p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-info">
                  {percent(metrics.recall)}
                </p>
              </div>
            )}
            {metrics.f1_score !== undefined && (
              <div>
                <p className="hud-label">F1 Score</p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-violet">
                  {percent(metrics.f1_score)}
                </p>
              </div>
            )}
          </div>

          {metrics.linguistic_metrics && (
            <div className="border-t border-border/30 pt-3">
              <p className="hud-label mb-2">Linguistic Factors</p>
              <div className="flex flex-wrap gap-2">
                <span className="chip-muted">overall {percent(metrics.linguistic_metrics.overall_score)}</span>
                <span className="chip-info">dominant {metrics.linguistic_metrics.dominant_factor}</span>
                {Object.entries(metrics.linguistic_metrics.factor_contributions).slice(0, 3).map(([factor, contribution]) => (
                  <span key={factor} className="chip-muted">{factor} {percent(contribution)}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
