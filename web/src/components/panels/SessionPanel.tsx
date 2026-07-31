import { Clock } from "lucide-react";

import { Panel } from "@/components/console/Panel";
import { decimal, duration, integer, multiplier, relativeTime } from "@/lib/format";
import type { HouseEdge, Regime, SessionSummary } from "@/lib/types";

interface SessionPanelProps {
  session: SessionSummary | undefined;
  regime?: Regime;
  houseEdge?: HouseEdge;
  actions?: React.ReactNode;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/30 py-1.5 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="font-mono text-[11px] font-medium tabular-nums">{value}</span>
    </div>
  );
}

/** Session shape, volatility regime and the fitted operator edge. */
export function SessionPanel({ session, regime, houseEdge, actions }: SessionPanelProps) {
  return (
    <Panel title="Session" subtitle={session?.active ? "active" : "idle"} icon={<Clock className="h-3.5 w-3.5" />} actions={actions}>
      <div className="space-y-0.5">
        <Row label="Rounds in session" value={integer(session?.count)} />
        <Row label="Rounds available" value={integer(session?.rounds_available)} />
        <Row label="Sessions on record" value={integer(session?.sessions_total)} />
        <Row label="Avg round" value={session?.avg_round_secs ? `${decimal(session.avg_round_secs, 1)}s` : "—"} />
        <Row label="Duration" value={duration(session?.duration_secs)} />
        <Row label="Peak" value={multiplier(session?.peak)} />
        <Row label="Mean / median" value={`${multiplier(session?.mean)} / ${multiplier(session?.median)}`} />
        <Row label="Log volatility" value={decimal(session?.volatility, 3)} />
        {regime && <Row label="Regime" value={<span className="uppercase tracking-wider">{regime.regime}</span>} />}
        {houseEdge && (
          <Row
            label="Fitted edge"
            value={
              houseEdge.samples >= 25 ? (
                <span className="text-caution">
                  {decimal(houseEdge.estimate_pct, 2)}% · RTP {decimal(houseEdge.expected_rtp_pct, 1)}%
                </span>
              ) : (
                <span className="text-muted-foreground">needs {25 - houseEdge.samples} more</span>
              )
            }
          />
        )}
        {session?.ended_at && <Row label="Last round" value={relativeTime(session.ended_at)} />}
      </div>
    </Panel>
  );
}
