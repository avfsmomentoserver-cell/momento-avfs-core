import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface RingProps {
  value: number;
  size?: number;
  thickness?: number;
  color?: string;
  label?: ReactNode;
  sublabel?: ReactNode;
  className?: string;
}

/** Animated SVG progress ring — the primary "ripeness / confidence" readout. */
export function Ring({ value, size = 132, thickness = 9, color, label, sublabel, className }: RingProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);
  const stroke =
    color ?? (clamped >= 0.66 ? "hsl(var(--signal))" : clamped >= 0.38 ? "hsl(var(--caution))" : "hsl(var(--critical))");

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1), stroke 400ms ease",
            filter: `drop-shadow(0 0 10px ${stroke})`,
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center">
        {label !== undefined && <div className="font-mono text-2xl font-semibold tabular-nums leading-none">{label}</div>}
        {sublabel !== undefined && (
          <div className="max-w-[80%] text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{sublabel}</div>
        )}
      </div>
    </div>
  );
}
