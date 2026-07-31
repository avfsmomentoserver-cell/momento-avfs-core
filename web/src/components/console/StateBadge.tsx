import { cn } from "@/lib/utils";
import type { MarketState } from "@/lib/types";

const STATE_STYLE: Record<string, string> = {
  Moonshot: "border-info/40 bg-info/12 text-info",
  Ignition: "border-signal/40 bg-signal/12 text-signal",
  Collapse: "border-critical/40 bg-critical/12 text-critical",
  Exhaustion: "border-caution/40 bg-caution/12 text-caution",
  Bait: "border-caution/40 bg-caution/12 text-caution",
  Shelf: "border-border bg-muted/50 text-muted-foreground",
  Normal: "border-border bg-muted/40 text-foreground/80",
  Idle: "border-border bg-muted/30 text-muted-foreground",
};

interface StateBadgeProps {
  state: MarketState | string | null | undefined;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

/** The canonical market-state pill used across every dashboard. */
export function StateBadge({ state, size = "md", pulse = false, className }: StateBadgeProps) {
  const label = state ?? "—";
  const style = STATE_STYLE[String(label)] ?? STATE_STYLE.Normal;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border font-mono font-semibold uppercase tracking-[0.14em]",
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-[11px]",
        size === "lg" && "px-3.5 py-1.5 text-sm",
        style,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full bg-current", pulse && "animate-pulse")} />
      {label}
    </span>
  );
}
