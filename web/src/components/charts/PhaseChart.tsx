import { useMemo } from "react";
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";

import { clockTime, decimal, multiplier, percent } from "@/lib/format";
import type { PhaseSample } from "@/lib/types";

interface PhaseChartProps {
  phases: PhaseSample[];
  height?: number;
}

interface TooltipEntry {
  payload?: PhaseSample & { index: number };
}

function PhaseTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  const sample = payload?.[0]?.payload;
  if (!active || !sample) return null;

  return (
    <div className="rounded-md border border-border bg-popover/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: sample.phase_color }}>
        {sample.phase}
      </p>
      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{multiplier(sample.multiplier)}</p>
      <div className="mt-1 space-y-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
        <p>points {decimal(sample.points, 1)}</p>
        <p>ladder {percent(sample.ascending_strength)}</p>
        <p>collapse {percent(sample.collapse_strength)}</p>
        <p>{clockTime(sample.time)}</p>
      </div>
    </div>
  );
}

/**
 * Phase ladder: the point series with every round coloured by its live market
 * state, plus the two ladder-strength traces underneath.
 */
export function PhaseChart({ phases, height = 340 }: PhaseChartProps) {
  const data = useMemo(
    () =>
      phases.map((sample, index) => ({
        ...sample,
        index,
        ascending_scaled: sample.ascending_strength,
        collapse_scaled: sample.collapse_strength,
      })),
    [phases],
  );

  const domain = useMemo<[number, number]>(() => {
    if (data.length === 0) return [80, 220];
    const values = data.map((sample) => sample.points);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max(6, (max - min) * 0.12);
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -14 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.45} vertical={false} />
        <XAxis
          dataKey="index"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          stroke="hsl(var(--border))"
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          yAxisId="points"
          domain={domain}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          stroke="hsl(var(--border))"
          tickLine={false}
          width={46}
        />
        <YAxis yAxisId="strength" orientation="right" domain={[0, 1]} hide />
        <Tooltip content={<PhaseTooltip />} />

        <Line
          yAxisId="strength"
          type="monotone"
          dataKey="ascending_scaled"
          stroke="hsl(var(--signal))"
          strokeWidth={1.1}
          strokeOpacity={0.45}
          dot={false}
        />
        <Line
          yAxisId="strength"
          type="monotone"
          dataKey="collapse_scaled"
          stroke="hsl(var(--critical))"
          strokeWidth={1.1}
          strokeOpacity={0.45}
          dot={false}
        />

        <Line
          yAxisId="points"
          type="monotone"
          dataKey="points"
          stroke="hsl(var(--foreground))"
          strokeOpacity={0.35}
          strokeWidth={1.2}
          dot={false}
        />
        <Scatter
          yAxisId="points"
          dataKey="points"
          shape={(props: unknown) => {
            const { cx, cy, payload } = props as { cx: number; cy: number; payload: PhaseSample };
            if (!Number.isFinite(cx) || !Number.isFinite(cy)) return <g />;
            return <circle cx={cx} cy={cy} r={2.6} fill={payload.phase_color} fillOpacity={0.95} />;
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
