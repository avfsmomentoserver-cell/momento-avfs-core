import { useMemo } from "react";

import { cn } from "@/lib/utils";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  className?: string;
  strokeWidth?: number;
}

/**
 * Dependency-free sparkline. Used inside dense tiles where a full chart would
 * be too heavy. Values are plotted in order, oldest to newest.
 */
export function Sparkline({
  values,
  width = 180,
  height = 40,
  color = "hsl(var(--signal))",
  fill = true,
  className,
  strokeWidth = 1.6,
}: SparklineProps) {
  const geometry = useMemo<{ line: string; area: string } | null>(() => {
    const clean = values.filter((value) => Number.isFinite(value));
    if (clean.length < 2) return null;

    const min = Math.min(...clean);
    const max = Math.max(...clean);
    const span = max - min || 1;
    const stepX = width / (clean.length - 1);

    const points = clean.map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / span) * (height - strokeWidth * 2) - strokeWidth;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    return {
      line: `M ${points.join(" L ")}`,
      area: `M 0,${height} L ${points.join(" L ")} L ${width},${height} Z`,
    };
  }, [values, width, height, strokeWidth]);

  if (!geometry) {
    return <div className={cn("h-10 rounded bg-muted/30", className)} style={{ width }} aria-hidden />;
  }

  const gradientId = `spark-${color.replace(/[^a-z0-9]/gi, "")}-${width}-${height}`;

  return (
    <svg width={width} height={height} className={cn("overflow-visible", className)} aria-hidden>
      {fill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={geometry.area} fill={`url(#${gradientId})`} />
        </>
      )}
      <path d={geometry.line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
