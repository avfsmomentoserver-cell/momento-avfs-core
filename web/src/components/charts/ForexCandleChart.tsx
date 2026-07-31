import { useMemo, useState, useRef, useEffect } from "react";
import { Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, ReferenceLine } from "recharts";
import { decimal, multiplier } from "@/lib/format";
import type { Candle } from "@/lib/types";
import type { DrawingTool } from "@/lib/invent-middleware/momentoFX";

interface ForexCandleChartProps {
  candles: Candle[];
  height?: number;
  drawings?: DrawingTool[];
  onDrawingAdd?: (drawing: DrawingTool) => void;
  onDrawingRemove?: (drawingId: string) => void;
  showBollingerBands?: boolean;
  bollingerBands?: { upper: number; middle: number; lower: number };
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
      <p className="font-mono text-[10px] text-muted-foreground/70">{new Date(row.time).toLocaleTimeString()}</p>
    </div>
  );
}

/**
 * Enhanced candlestick chart with drawing tools support
 * Renders OHLC candles with interactive drawing capabilities
 */
export function ForexCandleChart({ 
  candles, 
  height = 400, 
  drawings = [],
  onDrawingAdd,
  onDrawingRemove,
  showBollingerBands = false,
  bollingerBands
}: ForexCandleChartProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<Partial<DrawingTool> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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
    
    // Include Bollinger Bands in domain calculation
    let bandMin = min;
    let bandMax = max;
    if (showBollingerBands && bollingerBands) {
      bandMin = Math.min(min, bollingerBands.lower);
      bandMax = Math.max(max, bollingerBands.upper);
    }
    
    const pad = Math.max(4, (bandMax - bandMin) * 0.1);
    return [Math.floor(bandMin - pad), Math.ceil(bandMax + pad)];
  }, [rows, showBollingerBands, bollingerBands]);

  const handleChartClick = (e: React.MouseEvent) => {
    if (!isDrawing || !currentDrawing || !svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentDrawing.points && currentDrawing.points.length === 1) {
      // Complete the drawing
      const completedDrawing: DrawingTool = {
        id: `drawing-${Date.now()}`,
        type: currentDrawing.type || 'trendline',
        points: [...currentDrawing.points, { x, y }],
        color: currentDrawing.color || '#3b82f6',
        timestamp: new Date().toISOString()
      };
      onDrawingAdd?.(completedDrawing);
      setCurrentDrawing(null);
      setIsDrawing(false);
    } else {
      // Start new drawing
      setCurrentDrawing({
        ...currentDrawing,
        points: [{ x, y }]
      });
    }
  };

  const renderDrawing = (drawing: DrawingTool) => {
    if (drawing.points.length < 2) return null;

    const points = drawing.points.map(p => `${p.x},${p.y}`).join(' ');

    switch (drawing.type) {
      case 'trendline':
        return (
          <line
            x1={drawing.points[0].x}
            y1={drawing.points[0].y}
            x2={drawing.points[1].x}
            y2={drawing.points[1].y}
            stroke={drawing.color}
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        );
      case 'horizontal':
        return (
          <line
            x1={0}
            y1={drawing.points[0].y}
            x2="100%"
            y2={drawing.points[0].y}
            stroke={drawing.color}
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        );
      case 'fibonacci':
        return (
          <g>
            <line
              x1={drawing.points[0].x}
              y1={drawing.points[0].y}
              x2={drawing.points[1].x}
              y2={drawing.points[1].y}
              stroke={drawing.color}
              strokeWidth={1}
            />
            {/* Fibonacci levels */}
            {[0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].map(level => {
              const y = drawing.points[0].y + (drawing.points[1].y - drawing.points[0].y) * level;
              return (
                <line
                  key={level}
                  x1={drawing.points[0].x}
                  y1={y}
                  x2={drawing.points[1].x}
                  y2={y}
                  stroke={drawing.color}
                  strokeWidth={1}
                  strokeDasharray="3,3"
                  opacity={0.5}
                />
              );
            })}
          </g>
        );
      case 'support':
      case 'rectangle':
        const width = Math.abs(drawing.points[1].x - drawing.points[0].x);
        const height = Math.abs(drawing.points[1].y - drawing.points[0].y);
        const x = Math.min(drawing.points[0].x, drawing.points[1].x);
        const y = Math.min(drawing.points[0].y, drawing.points[1].y);
        return (
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={drawing.color}
            fillOpacity={0.1}
            stroke={drawing.color}
            strokeWidth={1}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative" onClick={handleChartClick}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart 
          data={rows} 
          margin={{ top: 8, right: 10, bottom: 4, left: -14 }} 
          barGap={0}
        >
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

          {/* Bollinger Bands */}
          {showBollingerBands && bollingerBands && (
            <>
              <ReferenceLine y={bollingerBands.upper} stroke="hsl(var(--caution))" strokeDasharray="3 3" strokeOpacity={0.5} />
              <ReferenceLine y={bollingerBands.middle} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.3} />
              <ReferenceLine y={bollingerBands.lower} stroke="hsl(var(--caution))" strokeDasharray="3 3" strokeOpacity={0.5} />
            </>
          )}

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

      {/* Drawing overlay */}
      <svg 
        ref={svgRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Render existing drawings */}
        {drawings.map(renderDrawing)}
        
        {/* Render current drawing in progress */}
        {currentDrawing && currentDrawing.points && currentDrawing.points.length > 0 && (
          <g>
            {currentDrawing.points.map((point, i) => (
              <circle
                key={i}
                cx={point.x}
                cy={point.y}
                r={4}
                fill={currentDrawing.color || '#3b82f6'}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
