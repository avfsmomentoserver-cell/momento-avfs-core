import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { integer, percent } from "@/lib/format";
import type { BandHistogramEntry } from "@/lib/types";

interface BandDistributionProps {
  histogram: BandHistogramEntry[];
  height?: number;
}

interface TooltipEntry {
  payload?: BandHistogramEntry;
}

function DistributionTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  const entry = payload?.[0]?.payload;
  if (!active || !entry) return null;

  return (
    <div className="rounded-md border border-border bg-popover/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-xs font-semibold" style={{ color: entry.color }}>
        {entry.label}
      </p>
      <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
        {entry.lo.toFixed(2)}x — {entry.hi === null ? "∞" : `${entry.hi.toFixed(2)}x`}
      </p>
      <p className="mt-1 font-mono text-[11px] tabular-nums text-foreground">
        {integer(entry.count)} rounds · {percent(entry.share, 1)}
      </p>
    </div>
  );
}

/** Per-band round counts, coloured with the linguistics band palette. */
export function BandDistribution({ histogram, height = 210 }: BandDistributionProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={histogram} margin={{ top: 8, right: 6, bottom: 0, left: -22 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.45} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
          stroke="hsl(var(--border))"
          tickLine={false}
          interval={0}
          angle={-32}
          textAnchor="end"
          height={46}
        />
        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} stroke="hsl(var(--border))" tickLine={false} width={40} />
        <Tooltip content={<DistributionTooltip />} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.25 }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={38}>
          {histogram.map((entry) => (
            <Cell key={entry.band} fill={entry.color} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
