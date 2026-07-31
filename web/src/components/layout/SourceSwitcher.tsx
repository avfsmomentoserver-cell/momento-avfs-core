import { Check, ChevronDown, Database } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { integer, multiplier, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/state/PlatformProvider";

/** Switches the active data source across every screen at once. */
export function SourceSwitcher() {
  const { source, setSource, sources } = usePlatform();
  const active = sources.find((entry) => entry.id === source);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-border bg-card/70 px-2.5 py-1.5 text-xs transition-colors hover:border-signal/40 hover:bg-card"
        >
          <Database className="h-3.5 w-3.5 text-signal/70" />
          <span className="font-mono font-semibold uppercase tracking-wider">{active?.name ?? source}</span>
          {active && (
            <span className="hidden font-mono text-[10px] tabular-nums text-muted-foreground sm:inline">
              {integer(active.round_count)}
            </span>
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Data sources</DropdownMenuLabel>
        {sources.length === 0 && <DropdownMenuItem disabled>No sources registered</DropdownMenuItem>}
        {sources.map((entry) => (
          <DropdownMenuItem key={entry.id} onSelect={() => setSource(entry.id)} className="flex items-start gap-2">
            <Check className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", entry.id === source ? "text-signal" : "opacity-0")} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium">{entry.name}</span>
                {!entry.active && <span className="chip-muted">idle</span>}
              </span>
              <span className="mt-0.5 block font-mono text-[10px] tabular-nums text-muted-foreground">
                {integer(entry.round_count)} rounds
                {entry.latest_multiplier !== null && ` · last ${multiplier(entry.latest_multiplier)}`}
              </span>
              {entry.latest_timestamp && (
                <span className="block font-mono text-[10px] text-muted-foreground/70">{relativeTime(entry.latest_timestamp)}</span>
              )}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
