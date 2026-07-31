import { useMemo } from "react";
import { Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

import { clockTime, decimal, multiplier } from "@/lib/format";
import type { Candle } from "@/lib/types";

interface CandleChartProps {
  candles: Candle[];
  height?: number;
}

interface CandleRow extends Candle {
  index: number;
  bodyBase: number;
  bodyHeight: number;
  wickBase: number;
  wickHeight: number;
  bullish: boolean;
}

interface TooltipEntry {
  payload?: CandleRow;
}

function CandleTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div className="rounded-md border border-border bg-popover/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className={`font-mono text-xs font-semibold ${row.bullish ? "text-signal" : "text-critical"}`}>
        {row.bullish ? "▲" : "▼"} {decimal(row.close - row.open, 1)} pts
      </p>
      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
        <span>O {decimal(row.open, 1)}</span>
        <span>H {decimal(row.high, 1)}</span>
        <span>L {decimal(row.low, 1)}</span>
        <span>C {decimal(row.close, 1)}</span>
      </div>
      <p className="mt-1 font-mono text-[10px] tabular-nums text-muted-foreground">
        peak {multiplier(row.peak_multiplier)} · {row.volume} rounds
      </p>
      <p className="font-mono text-[10px] text-muted-foreground/70">{clockTime(row.time)}</p>
    </div>
  );
}

/**
 * OHLC candles rendered with stacked bars: a thin wick bar behind a thicker
 * body bar. Recharts has no native candlestick, and this keeps the whole chart
 * layer on one dependency.
 */
export function CandleChart({ candles, height = 340 }: CandleChartProps) {
  const rows = useMemo<CandleRow[]>(
    () =>
      candles.map((candle, index) => ({
        ...candle,
        index,
        bodyBase: Math.min(candle.open, candle.close),
        bodyHeight: Math.max(0.35, Math.abs(candle.close - candle.open)),
        wickBase: candle.low,
        wickHeight: Math.max(0.35, candle.high - candle.low),
        bullish: candle.close >= candle.open,
      })),
    [candles],
  );

  const domain = useMemo<[number, number]>(() => {
    if (rows.length === 0) return [80, 220];
    const min = Math.min(...rows.map((row) => row.low));
    const max = Math.max(...rows.map((row) => row.high));
    const pad = Math.max(4, (max - min) * 0.1);
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [rows]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: 10, bottom: 4, left: -14 }} barGap={0}>
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
        <Tooltip content={<CandleTooltip />} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.25 }} />

        {/* transparent spacer so both bars share one baseline */}
        <Bar dataKey="wickBase" stackId="wick" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="wickHeight" stackId="wick" barSize={1.5} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={`wick-${row.index}`} fill={row.bullish ? "hsl(var(--signal))" : "hsl(var(--critical))"} fillOpacity={0.55} />
          ))}
        </Bar>

        <Bar dataKey="bodyBase" stackId="body" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="bodyHeight" stackId="body" barSize={7} radius={[1, 1, 0, 0]} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={`body-${row.index}`} fill={row.bullish ? "hsl(var(--signal))" : "hsl(var(--critical))"} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
