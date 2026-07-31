import { ArrowRight, GitBranch } from "lucide-react";

import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { clockTime, multiplier, stateTextClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TransitionEntry } from "@/lib/types";

/** Chronological state-change log for the active window. */
export function TransitionsPanel({ transitions, limit = 12 }: { transitions: TransitionEntry[]; limit?: number }) {
  const rows = [...transitions].reverse().slice(0, limit);

  return (
    <Panel title="State Transitions" subtitle={`${transitions.length} recorded`} icon={<GitBranch className="h-3.5 w-3.5" />}>
      {rows.length === 0 ? (
        <EmptyState compact title="No transitions yet" description="At least a dozen rounds are needed to trace state changes." />
      ) : (
        <ol className="space-y-1.5">
          {rows.map((entry) => (
            <li
              key={`${entry.index}-${entry.to}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-muted/15 px-2.5 py-1.5"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-[11px]">
                <span className="truncate text-muted-foreground">{entry.from}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                <span className={cn("truncate font-medium", stateTextClass(entry.to))}>{entry.to}</span>
              </span>
              <span className="shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                <span className="block">{multiplier(entry.multiplier)}</span>
                <span className="block text-muted-foreground/60">{clockTime(entry.timestamp)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
