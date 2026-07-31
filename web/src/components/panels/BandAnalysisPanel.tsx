import { Layers } from "lucide-react";

import { EmptyState } from "@/components/console/EmptyState";
import { Meter } from "@/components/console/Meter";
import { Panel } from "@/components/console/Panel";
import { decimal, percent } from "@/lib/format";
import type { BandAnalysisData, BandRelativityData } from "@/lib/types";

interface BandAnalysisPanelProps {
  bands: BandAnalysisData | undefined;
  bandRelativity: BandRelativityData | undefined;
}

/** Band ladder collapse and relativity analysis panel. */
export function BandAnalysisPanel({ bands, bandRelativity }: BandAnalysisPanelProps) {
  if (!bands && !bandRelativity) {
    return (
      <Panel title="Band Analysis" subtitle="Ladder collapse and relativity" icon={<Layers className="h-3.5 w-3.5" />}>
        <EmptyState compact title="No band data" description="Band analysis requires at least 20 rounds of history." />
      </Panel>
    );
  }

  const bandEntries = bands ? Object.entries(bands) : [];
  const syncScore = bandRelativity?.synchronization || 0;

  return (
    <Panel title="Band Analysis" subtitle="Ladder collapse and relativity" icon={<Layers className="h-3.5 w-3.5" />}>
      <div className="space-y-3.5">
        {bandRelativity && (
          <Meter
            label="Band synchronization"
            value={syncScore}
            active={syncScore > 0.6}
            color="hsl(var(--info))"
            detail={percent(syncScore)}
          />
        )}

        {bandEntries.length > 0 && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <p className="hud-label mb-2">Ladder collapse frequency</p>
            <div className="space-y-1.5">
              {bandEntries.slice(0, 4).map(([bandName, bandData]) => (
                <div key={bandName} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground capitalize">{bandName.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">{bandData.total_sequences || 0} seqs</span>
                    <span
                      className={`font-mono font-medium ${
                        (bandData.collapse_frequency || 0) > 0.03 ? "text-critical" : (bandData.collapse_frequency || 0) > 0.01 ? "text-caution" : "text-signal"
                      }`}
                    >
                      {percent(bandData.collapse_frequency || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bandRelativity && bandRelativity.lead_lag && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <p className="hud-label mb-2">Lead-lag relationships</p>
            <div className="space-y-1.5">
              {Object.entries(bandRelativity.lead_lag).slice(0, 3).map(([band, relation]) => (
                <div key={band} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground capitalize">{band.replace(/_/g, " ")}</span>
                  <span className="font-mono text-info">
                    {relation.lead} → {relation.lag} ({decimal(relation.correlation, 2)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {bandEntries.length > 0 && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <p className="hud-label mb-1">Recent ladder sequences</p>
            <div className="space-y-1">
              {bandEntries.slice(0, 2).map(([bandName, bandData]) => (
                <div key={bandName} className="text-xs">
                  <span className="text-muted-foreground capitalize">{bandName.replace(/_/g, " ")}:</span>
                  <span className="ml-1.5 font-mono">
                    avg length {decimal(bandData.avg_ladder_length || 0, 1)} · {bandData.sequences?.length || 0} total
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
