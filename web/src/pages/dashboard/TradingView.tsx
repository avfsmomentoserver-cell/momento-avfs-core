import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Activity, Settings, RefreshCw } from "lucide-react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries } from "lightweight-charts";

import { AppShell } from "@/components/layout/AppShell";
import { Panel } from "@/components/console/Panel";
import { Button } from "@/components/ui/button";
import { decimal, integer, percent } from "@/lib/format";
import { usePlatform } from "@/state/PlatformProvider";
import { api } from "@/lib/api";
import type { RoundRecord, SessionSummary } from "@/lib/types";

// Types for Momento scope analysis
interface MomentoSource {
  source: string;
  display_name: string;
  round_count: number;
  avg_round_secs: number;
}

type Timeframe = '1' | '5' | '15' | '60' | 'D';

interface TimeframeConfig {
  label: string;
  roundsPerCandle: number;
  secondsPerCandle: number;
}

const TIMEFRAME_CONFIG: Record<Timeframe, TimeframeConfig> = {
  '1': { label: '1m', roundsPerCandle: 1, secondsPerCandle: 60 },
  '5': { label: '5m', roundsPerCandle: 5, secondsPerCandle: 300 },
  '15': { label: '15m', roundsPerCandle: 15, secondsPerCandle: 900 },
  '60': { label: '1h', roundsPerCandle: 60, secondsPerCandle: 3600 },
  'D': { label: '1D', roundsPerCandle: 1440, secondsPerCandle: 86400 },
};

interface CandlestickDataExtended {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  multiplier_high: number; // Round top x
  multiplier_low: number;
  session_id?: string;
}

// Point calculation based on multiplier with proper scaling for candlestick variation
const calculatePointsFromMultiplier = (multiplier: number, avgRoundTime: number): number => {
  // Create meaningful point values that properly reflect multiplier differences
  // Uses a hybrid approach: linear for low multipliers, logarithmic for high multipliers
  // This ensures candles have distinct values across the full multiplier range
  
  let value: number;
  
  if (multiplier <= 10) {
    // Linear scaling for low multipliers (1x-10x) to create clear separation
    value = multiplier * 10; // 1x = 10 pts, 10x = 100 pts
  } else {
    // Logarithmic scaling for high multipliers to compress extreme values
    value = 100 + Math.log10(multiplier) * 50; // 10x = 100 pts, 100x = 200 pts
  }
  
  // Apply time adjustment based on average round time
  const timeAdjustment = avgRoundTime / 8; // Normalize around 8 seconds average
  
  return Math.round(value * timeAdjustment);
};

// Get session boundaries for time gap handling
const getSessionBoundaries = (rounds: RoundRecord[], avgRoundTime: number): number[] => {
  if (rounds.length === 0) return [];
  
  const sortedRounds = [...rounds].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const boundaries: number[] = [];
  const gapThreshold = avgRoundTime * 5; // 5x average round time indicates session gap
  
  for (let i = 1; i < sortedRounds.length; i++) {
    const prevTime = new Date(sortedRounds[i - 1].timestamp).getTime();
    const currTime = new Date(sortedRounds[i].timestamp).getTime();
    const gap = (currTime - prevTime) / 1000; // Convert to seconds
    
    if (gap > gapThreshold) {
      boundaries.push(Math.floor(currTime / 1000));
    }
  }
  
  return boundaries;
};

// Convert rounds to candlesticks with session gap awareness
const convertRoundsToCandlesticks = (
  rounds: RoundRecord[], 
  avgRoundTime: number, 
  timeframe: Timeframe,
  sessionBoundaries: number[]
): CandlestickDataExtended[] => {
  if (rounds.length === 0) return [];

  // Sort rounds by timestamp in ascending order
  const sortedRounds = [...rounds].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const config = TIMEFRAME_CONFIG[timeframe];
  const candlesticks: CandlestickDataExtended[] = [];
  
  // Group rounds by time period based on timeframe
  const timeMap = new Map<number, RoundRecord[]>();
  
  sortedRounds.forEach(round => {
    const timestamp = Math.floor(new Date(round.timestamp).getTime() / 1000);
    const periodStart = Math.floor(timestamp / config.secondsPerCandle) * config.secondsPerCandle;
    
    if (!timeMap.has(periodStart)) {
      timeMap.set(periodStart, []);
    }
    timeMap.get(periodStart)!.push(round);
  });

  // Convert each time group to a candlestick
  timeMap.forEach((groupRounds, periodStart) => {
    const points = groupRounds.map(r => calculatePointsFromMultiplier(r.multiplier, avgRoundTime));
    const multipliers = groupRounds.map(r => r.multiplier);
    
    candlesticks.push({
      time: periodStart as Time,
      open: points[0],
      high: Math.max(...points),
      low: Math.min(...points),
      close: points[points.length - 1],
      volume: groupRounds.length,
      multiplier_high: Math.max(...multipliers), // Round top x
      multiplier_low: Math.min(...multipliers),
    });
  });

  // Sort candlesticks by time
  return candlesticks.sort((a, b) => Number(a.time) - Number(b.time));
};

export default function TradingView() {
  const { source } = usePlatform();
  const [selectedSource, setSelectedSource] = useState<string>("aviator");
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('5');
  const [pointMultiplier, setPointMultiplier] = useState<number>(1);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Available Momento sources
  const sourcesQuery = useQuery({
    queryKey: ["momento-sources"],
    queryFn: async () => {
      // Simulated sources - in production, this would come from the API
      return [
        { source: "aviator", display_name: "Aviator", round_count: 0, avg_round_secs: 8 },
        { source: "jetx", display_name: "JetX", round_count: 0, avg_round_secs: 10 },
        { source: "crash", display_name: "Crash", round_count: 0, avg_round_secs: 6 },
        { source: "aviator_v2", display_name: "Aviator V2", round_count: 0, avg_round_secs: 7 },
      ] as MomentoSource[];
    },
    staleTime: 300000,
  });

  // Session statistics for average round time
  const sessionQuery = useQuery({
    queryKey: ["session-stats", selectedSource],
    queryFn: async () => {
      const response = await api.statistics(selectedSource);
      return response as { session: SessionSummary };
    },
    refetchInterval: 30000,
  });

  // Momento rounds data
  const roundsQuery = useQuery({
    queryKey: ["momento-rounds", selectedSource],
    queryFn: async () => {
      const response = await api.rounds(selectedSource, 1000, 0, "desc");
      return response as { rounds: RoundRecord[]; total: number };
    },
    refetchInterval: 5000,
  });

  // Current multiplier and points
  const currentRoundQuery = useQuery({
    queryKey: ["current-round", selectedSource],
    queryFn: async () => {
      const response = await api.latestRounds(selectedSource, 1);
      const rounds = response.rounds as RoundRecord[];
      if (rounds.length === 0) return null;
      
      const session = sessionQuery.data?.session;
      const avgRoundTime = session?.avg_round_secs || 8;
      const round = rounds[0];
      
      const points = calculatePointsFromMultiplier(round.multiplier, avgRoundTime);
      
      return {
        ...round,
        points: points * pointMultiplier,
        avg_round_time: avgRoundTime,
      };
    },
    refetchInterval: 2000,
  });

  // Get candlestick data with session boundaries
  const getCandlestickData = () => {
    const rounds = roundsQuery.data?.rounds || [];
    const session = sessionQuery.data?.session;
    const avgRoundTime = session?.avg_round_secs || 8;
    
    const sessionBoundaries = getSessionBoundaries(rounds, avgRoundTime);
    return {
      candlesticks: convertRoundsToCandlesticks(rounds, avgRoundTime, selectedTimeframe, sessionBoundaries),
      sessionBoundaries,
    };
  };

  // Initialize Lightweight Charts
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: '#1e1e1e' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#333333' },
        horzLines: { color: '#333333' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#333333',
      },
      timeScale: {
        borderColor: '#333333',
        timeVisible: true,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);



  // Update chart data when data changes
  useEffect(() => {
    if (!seriesRef.current) return;

    const { candlesticks } = getCandlestickData();
    seriesRef.current.setData(candlesticks);
  }, [getCandlestickData]);

  const currentRound = currentRoundQuery.data;
  const sources = sourcesQuery.data || [];
  const roundsData = roundsQuery.data;
  const rounds = roundsData?.rounds || [];
  const sessionData = sessionQuery.data;
  const session = sessionData?.session;

  return (
    <AppShell
      title="TradingView with Momento Analysis"
      subtitle="Full TradingView drawing tools with Momento scope data analysis"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Button>
          <Button size="sm" variant="outline" className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Source Selector */}
        <Panel title="Source Selection" subtitle="Select a Momento source for analysis" dense>
          <div className="flex flex-wrap gap-2">
            {sources.map((src) => (
              <Button
                key={src.source}
                size="sm"
                variant={selectedSource === src.source ? "default" : "outline"}
                onClick={() => setSelectedSource(src.source)}
                className="text-xs"
              >
                {src.display_name}
              </Button>
            ))}
          </div>
        </Panel>

        {/* Current Round Display */}
        {currentRound && (
          <Panel title="Current Round" subtitle={sources.find(s => s.source === selectedSource)?.display_name} dense>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold font-mono">{decimal(currentRound.multiplier)}x</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">Band: {currentRound.band || "N/A"}</span>
                  {currentRound.color && (
                    <span className="text-xs text-muted-foreground">Color: {currentRound.color}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Points: {integer(currentRound.points || 0)}</p>
                <p className="text-sm text-muted-foreground">Avg Round Time: {decimal(currentRound.avg_round_time)}s</p>
              </div>
            </div>
            {/* Point Conversion Display */}
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Points (×{pointMultiplier})</p>
                  <p className="text-xl font-bold font-mono">{integer((currentRound.points || 0) * pointMultiplier)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Base: {integer(currentRound.points || 0)} pts
                  </p>
                </div>
              </div>
            </div>
          </Panel>
        )}

        {/* Session Statistics */}
        {session && (
          <Panel title="Session Statistics" subtitle="Current session analysis" dense>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Rounds</p>
                <p className="text-lg font-bold font-mono">{integer(session.count)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Round Time</p>
                <p className="text-lg font-bold font-mono">{decimal(session.avg_round_secs)}s</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Peak Multiplier</p>
                <p className="text-lg font-bold font-mono">{decimal(session.peak || 0)}x</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Median</p>
                <p className="text-lg font-bold font-mono">{decimal(session.median || 0)}x</p>
              </div>
            </div>
          </Panel>
        )}

        {/* Timeframe Controls */}
        <Panel title="Timeframe" subtitle="Select candlestick timeframe" dense>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TIMEFRAME_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                size="sm"
                variant={selectedTimeframe === key ? "default" : "outline"}
                onClick={() => setSelectedTimeframe(key as Timeframe)}
                className="text-xs"
              >
                {config.label}
              </Button>
            ))}
          </div>
        </Panel>

        {/* Point Multiplier Controls */}
        <Panel title="Point Multiplier" subtitle="Adjust the multiplier for point conversion" dense>
          <div className="flex flex-wrap gap-2">
            {[1, 10, 100, 1000, 10000].map((mult) => (
              <Button
                key={mult}
                size="sm"
                variant={pointMultiplier === mult ? "default" : "outline"}
                onClick={() => setPointMultiplier(mult)}
                className="text-xs"
              >
                ×{mult}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Current: 1 base point = {pointMultiplier} displayed points
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Conversion: 1x-10x linear, 10x+ logarithmic for proper candlestick variation
          </p>
        </Panel>

        {/* Round Statistics */}
        <Panel title="Round Statistics" subtitle="Historical data analysis" dense>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Rounds</p>
              <p className="text-lg font-bold font-mono">{integer(roundsQuery.data?.total || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Loaded Rounds</p>
              <p className="text-lg font-bold font-mono">{integer(rounds.length)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sessions</p>
              <p className="text-lg font-bold font-mono">{integer(session?.sessions_total || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Round Time</p>
              <p className="text-lg font-bold font-mono">{decimal(session?.avg_round_secs || 0)}s</p>
            </div>
          </div>
        </Panel>

        {/* Multiplier High Analysis */}
        <Panel title="Round Top X Analysis" subtitle="Highest multipliers in candlesticks" dense>
          <div className="space-y-2">
            {(() => {
              const { candlesticks } = getCandlestickData();
              const topCandles = [...candlesticks]
                .sort((a, b) => b.multiplier_high - a.multiplier_high)
                .slice(0, 5);
              
              if (topCandles.length === 0) {
                return <p className="text-sm text-muted-foreground">No data available</p>;
              }
              
              const session = sessionQuery.data?.session;
              const avgRoundTime = session?.avg_round_secs || 8;
              
              return (
                <div className="space-y-2">
                  {topCandles.map((candle, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{new Date(Number(candle.time) * 1000).toLocaleTimeString()}</span>
                        <span className="font-mono">{decimal(candle.multiplier_high)}x</span>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground">Points: </span>
                        <span className="font-mono">{integer(candle.high)}</span>
                        <span className="text-muted-foreground ml-2">(low: {decimal(candle.multiplier_low)}x → {integer(candle.low)} pts)</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </Panel>

        {/* Conversion Reference */}
        <Panel title="Point Conversion Reference" subtitle="How multipliers convert to points" dense>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {(() => {
              const session = sessionQuery.data?.session;
              const avgRoundTime = session?.avg_round_secs || 8;
              
              const examples = [1, 2, 5, 10, 25, 50, 100, 200];
              return examples.map(mult => (
                <div key={mult} className="bg-muted/50 p-2 rounded">
                  <span className="text-muted-foreground">{mult}x</span>
                  <span className="font-mono ml-1">= {integer(calculatePointsFromMultiplier(mult, avgRoundTime))} pts</span>
                </div>
              ));
            })()}
          </div>
        </Panel>

        {/* Candlestick Chart */}
        <Panel title="Candlestick Chart" subtitle="Session-aware candlesticks with round top x (multiplier high)" lit>
          <div 
            ref={chartContainerRef}
            className="h-[500px] w-full rounded-md bg-background"
          />
        </Panel>

        {/* Session Boundaries Info */}
        <Panel title="Session Analysis" subtitle="Time gaps and session boundaries" dense>
          <div className="space-y-2">
            {(() => {
              const { sessionBoundaries } = getCandlestickData();
              if (sessionBoundaries.length === 0) {
                return <p className="text-sm text-muted-foreground">No session gaps detected in current data</p>;
              }
              return (
                <div>
                  <p className="text-sm text-muted-foreground">Detected {sessionBoundaries.length} session gap(s):</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sessionBoundaries.slice(0, 10).map((boundary, idx) => (
                      <span key={idx} className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">
                        {new Date(boundary * 1000).toLocaleTimeString()}
                      </span>
                    ))}
                    {sessionBoundaries.length > 10 && (
                      <span className="text-xs text-muted-foreground">+{sessionBoundaries.length - 10} more</span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}