import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { clockTime, decimal, multiplier } from "@/lib/format";
import type { PointSample, ResistanceLevel } from "@/lib/types";

interface PointsChartProps {
  series: PointSample[];
  height?: number;
  resistance?: ResistanceLevel[];
  showEnvelope?: boolean;
}

interface TooltipEntry {
  payload?: PointSample;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  const sample = payload?.[0]?.payload;
  if (!active || !sample) return null;

  return (
    <div className="rounded-md border border-border bg-popover/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="font-mono text-sm font-semibold tabular-nums" style={{ color: sample.color }}>
        {multiplier(sample.multiplier)}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{sample.band_label} band</p>
      <div className="mt-1.5 space-y-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
        <p>points {decimal(sample.points, 1)}</p>
        <p>
          floor {decimal(sample.floor, 1)} · ceil {decimal(sample.ceiling, 1)}
        </p>
        <p>{clockTime(sample.time)}</p>
      </div>
    </div>
  );
}

/**
 * The primary market chart: multipliers mapped into Momento point space with a
 * rolling floor/ceiling envelope and horizontal resistance zones.
 */
export function PointsChart({ series, height = 320, resistance = [], showEnvelope = true }: PointsChartProps) {
  const data = useMemo(() => series.map((sample, index) => ({ ...sample, index })), [series]);

  const domain = useMemo<[number, number]>(() => {
    if (data.length === 0) return [80, 220];
    const values = data.flatMap((sample) => [sample.points, sample.floor, sample.ceiling]);
    const levels = resistance.map((level) => level.points);
    const all = [...values, ...levels].filter((value) => Number.isFinite(value));
    const min = Math.min(...all);
    const max = Math.max(...all);
    const pad = Math.max(6, (max - min) * 0.12);
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [data, resistance]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 10, bottom: 4, left: -14 }}>
        <defs>
          <linearGradient id="pointsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--signal))" stopOpacity={0.26} />
            <stop offset="100%" stopColor="hsl(var(--signal))" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
        <XAxis
          dataKey="index"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          stroke="hsl(var(--border))"
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          domain={domain}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          stroke="hsl(var(--border))"
          tickLine={false}
          width={46}
        />
        <Tooltip content={<ChartTooltip />} />

        {resistance.slice(0, 5).map((level) => (
          <ReferenceLine
            key={`resistance-${level.points}`}
            y={level.points}
            stroke="hsl(var(--caution))"
            strokeDasharray="4 5"
            strokeOpacity={0.28 + Math.min(0.4, level.weight)}
            label={{
              value: `${level.multiplier.toFixed(1)}x`,
              position: "right",
              fill: "hsl(var(--caution))",
              fontSize: 9,
            }}
          />
        ))}

        {showEnvelope && (
          <>
            <Line type="monotone" dataKey="ceiling" stroke="hsl(var(--critical))" strokeWidth={1} strokeOpacity={0.4} dot={false} strokeDasharray="3 4" />
            <Line type="monotone" dataKey="floor" stroke="hsl(var(--info))" strokeWidth={1} strokeOpacity={0.4} dot={false} strokeDasharray="3 4" />
          </>
        )}

        <Area type="monotone" dataKey="points" stroke="none" fill="url(#pointsFill)" />
        <Line
          type="monotone"
          dataKey="points"
          stroke="hsl(var(--signal))"
          strokeWidth={1.9}
          dot={false}
          activeDot={{ r: 3.5, fill: "hsl(var(--signal))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
