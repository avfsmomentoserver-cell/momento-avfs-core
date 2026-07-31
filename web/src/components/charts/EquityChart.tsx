import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { clockTime, currency, percent } from "@/lib/format";
import type { EquityPoint } from "@/lib/types";

interface EquityChartProps {
  points: EquityPoint[];
  height?: number;
}

interface TooltipEntry {
  payload?: EquityPoint;
}

function EquityTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="rounded-md border border-border bg-popover/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className={`font-mono text-sm font-semibold tabular-nums ${point.equity >= 0 ? "text-signal" : "text-critical"}`}>
        {currency(point.equity)}
      </p>
      <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
        decision #{point.index} · {point.action}
      </p>
      <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
        {currency(point.pnl)} this trade · {percent(point.confidence)} confidence
      </p>
      <p className="font-mono text-[10px] text-muted-foreground/70">{clockTime(point.time)}</p>
    </div>
  );
}

/** Cumulative paper P&L for the autopilot decision ledger. */
export function EquityChart({ points, height = 260 }: EquityChartProps) {
  const positive = points.length === 0 || points[points.length - 1].equity >= 0;
  const stroke = positive ? "hsl(var(--signal))" : "hsl(var(--critical))";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 8, right: 10, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.45} vertical={false} />
        <XAxis
          dataKey="index"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          stroke="hsl(var(--border))"
          tickLine={false}
          minTickGap={30}
        />
        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} stroke="hsl(var(--border))" tickLine={false} width={50} />
        <Tooltip content={<EquityTooltip />} />
        <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 4" />
        <Area type="monotone" dataKey="equity" stroke={stroke} strokeWidth={2} fill="url(#equityFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
