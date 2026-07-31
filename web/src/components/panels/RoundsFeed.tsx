import { List } from "lucide-react";

import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { clockTime, decimal, multiplier, multiplierColor } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RoundRecord } from "@/lib/types";

interface RoundsFeedProps {
  rounds: RoundRecord[];
  flashRoundId?: number | null;
  limit?: number;
  actions?: React.ReactNode;
  height?: string;
}

/** Live round tape. The newest row flashes when it arrives over the socket. */
export function RoundsFeed({ rounds, flashRoundId, limit = 60, actions, height = "max-h-[420px]" }: RoundsFeedProps) {
  const rows = rounds.slice(0, limit);

  return (
    <Panel
      title="Round Feed"
      subtitle={`${rounds.length} in buffer`}
      icon={<List className="h-3.5 w-3.5" />}
      actions={actions}
      bodyClassName="p-0"
    >
      {rows.length === 0 ? (
        <div className="p-4">
          <EmptyState compact title="No rounds yet" description="Start the live engine or import a file from the Ingest console." />
        </div>
      ) : (
        <div className={cn("no-scrollbar overflow-y-auto", height)}>
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <tr className="border-b border-border/60">
                <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Time</th>
                <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mult</th>
                <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pts</th>
                <th className="px-4 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Band</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((round) => (
                <tr
                  key={round.id}
                  className={cn(
                    "border-b border-border/25 transition-colors hover:bg-muted/25",
                    flashRoundId === round.id && "animate-ticker-in bg-signal/8",
                  )}
                >
                  <td className="px-4 py-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">{clockTime(round.timestamp)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs font-semibold tabular-nums" style={{ color: multiplierColor(round.multiplier) }}>
                    {multiplier(round.multiplier)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                    {decimal(round.points ?? 0, 1)}
                  </td>
                  <td className="px-4 py-1.5 text-right text-[10px] uppercase tracking-wider text-muted-foreground">{round.band ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
