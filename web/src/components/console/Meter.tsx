import { cn } from "@/lib/utils";
import { percent } from "@/lib/format";

interface MeterProps {
  label: string;
  value: number;
  color?: string;
  detail?: string;
  active?: boolean;
  showPercent?: boolean;
  className?: string;
}

/** Horizontal signal-strength meter with a label row and optional detail line. */
export function Meter({ label, value, color, detail, active, showPercent = true, className }: MeterProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const fill = color ?? (clamped >= 0.66 ? "hsl(var(--signal))" : clamped >= 0.38 ? "hsl(var(--caution))" : "hsl(var(--critical))");

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/85">
          {active !== undefined && (
            <span
              className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-signal glow-signal" : "bg-muted-foreground/40")}
              aria-hidden
            />
          )}
          {label}
        </span>
        {showPercent && <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{percent(clamped)}</span>}
      </div>

      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${clamped * 100}%`, backgroundColor: fill }} />
      </div>

      {detail && <p className="text-[10px] leading-snug text-muted-foreground/80">{detail}</p>}
    </div>
  );
}
