import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "signal" | "info" | "caution" | "critical" | "violet" | "neutral";
  icon?: ReactNode;
  progress?: number;
  className?: string;
  emphasis?: boolean;
}

const ACCENT_TEXT: Record<NonNullable<StatTileProps["accent"]>, string> = {
  signal: "text-signal",
  info: "text-info",
  caution: "text-caution",
  critical: "text-critical",
  violet: "text-violet",
  neutral: "text-foreground",
};

const ACCENT_BG: Record<NonNullable<StatTileProps["accent"]>, string> = {
  signal: "bg-signal",
  info: "bg-info",
  caution: "bg-caution",
  critical: "bg-critical",
  violet: "bg-violet",
  neutral: "bg-muted-foreground",
};

/** A single hero readout: label, big monospaced value, optional meter. */
export function StatTile({
  label,
  value,
  hint,
  accent = "neutral",
  icon,
  progress,
  className,
  emphasis = false,
}: StatTileProps) {
  return (
    <div className={cn("panel-raised flex flex-col gap-2 px-4 py-3", emphasis && "panel-lit", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="hud-label">{label}</span>
        {icon && <span className={cn("shrink-0 opacity-70", ACCENT_TEXT[accent])}>{icon}</span>}
      </div>

      <div className={cn("font-mono font-semibold tabular-nums leading-none", emphasis ? "text-3xl" : "text-2xl", ACCENT_TEXT[accent])}>
        {value}
      </div>

      {progress !== undefined && (
        <div className="meter-track">
          <div
            className={cn("meter-fill", ACCENT_BG[accent])}
            style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
          />
        </div>
      )}

      {hint && <div className="text-[11px] leading-snug text-muted-foreground">{hint}</div>}
    </div>
  );
}
