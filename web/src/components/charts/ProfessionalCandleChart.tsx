import { useEffect, useRef, useState } from 'react';
import { useLightweightChart } from './LightweightChartWrapper';
import type { ExtendedCandleData, VolumeData, IndicatorLineData } from '@/lib/invent-middleware/momentoFX-types';

interface ProfessionalCandleChartProps {
  candles: ExtendedCandleData[];
  volume?: VolumeData[];
  indicators?: Map<string, IndicatorLineData[]>;
  height?: number;
  onCrosshairMove?: (data: { time: number; price: number }) => void;
  showVolume?: boolean;
  showIndicators?: boolean;
}

/**
 * Professional Candlestick Chart Component
 * 
 * Uses Lightweight Charts for professional-grade forex-style charting
 * Features:
 * - OHLC candlestick visualization with professional styling
 * - Volume bars on separate axis (dual-axis zoom)
 * - Multiple indicator overlays
 * - Crosshair with OHLC values display
 * - Zoom/pan with mouse wheel and drag
 * - Responsive design
 * 
 * Follows patterns from market-ladder.html implementation
 */
export function ProfessionalCandleChart({
  candles,
  volume = [],
  indicators = new Map(),
  height = 600,
  onCrosshairMove,
  showVolume = true,
  showIndicators = true,
}: ProfessionalCandleChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    chart,
    candleSeries,
    volumeSeries,
    indicatorSeries,
    setCandleData,
    setVolumeData,
    addIndicatorSeries,
    setIndicatorData,
    fitContent,
  } = useLightweightChart({
    container: chartContainerRef.current,
    height,
    onCrosshairMove: onCrosshairMove ? (data) => {
      // Convert Time to number for the callback
      // Lightweight Charts Time can be number (Unix timestamp) or BusinessDay (string 'yyyy-mm-dd')
      let time: number;
      if (typeof data.time === 'string') {
        // BusinessDay format: 'yyyy-mm-dd'
        time = Math.floor(new Date(data.time).getTime() / 1000);
      } else {
        // Already a Unix timestamp
        time = data.time;
      }
      onCrosshairMove({ time, price: data.price });
    } : undefined,
  });

  // Initialize chart and set data
  useEffect(() => {
    if (!chart || !candleSeries || !isInitialized) return;

    // Set candle data
    setCandleData(candles);

    // Set volume data if enabled
    if (showVolume && volumeSeries && volume.length > 0) {
      setVolumeData(volume);
    }

    // Set indicator data if enabled
    if (showIndicators && indicators.size > 0) {
      indicators.forEach((data, id) => {
        const color = getIndicatorColor(id);
        const series = addIndicatorSeries(id, color);
        setIndicatorData(id, data);
      });
    }

    // Fit content to show all data
    setTimeout(() => {
      fitContent();
    }, 100);
  }, [chart, candleSeries, isInitialized, candles, volume, indicators, showVolume, showIndicators]);

  // Mark as initialized when chart is ready
  useEffect(() => {
    if (chart && candleSeries && !isInitialized) {
      setIsInitialized(true);
    }
  }, [chart, candleSeries, isInitialized]);

  return (
    <div
      ref={chartContainerRef}
      style={{
        width: '100%',
        height: `${height}px`,
        background: '#0b0b0f',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  );
}

/**
 * Get color for indicator based on ID
 */
function getIndicatorColor(id: string): string {
  const colors: Record<string, string> = {
    'ma-20': '#38bdf8',
    'ma-50': '#f59e0b',
    'rsi': '#22c55e',
    'macd': '#7c3aed',
    'bollinger-upper': '#ef4444',
    'bollinger-lower': '#ef4444',
    'bollinger-middle': '#38bdf8',
    'stochastic-k': '#22c55e',
    'stochastic-d': '#f59e0b',
    'atr': '#7c3aed',
  };
  return colors[id] || '#38bdf8';
}

/**
 * Convert platform candle data to Lightweight Charts format
 * Lightweight Charts v4+ requires Unix timestamp (number) for intraday data
 */
export function convertToLightweightCandles(candles: ExtendedCandleData[]) {
  return candles.map((candle) => {
    // Convert time to Unix timestamp if it's a string
    const time = typeof candle.time === 'string' 
      ? Math.floor(new Date(candle.time).getTime() / 1000)
      : candle.time;
    
    return {
      time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    };
  });
}

/**
 * Convert volume data to Lightweight Charts format
 */
export function convertToLightweightVolume(volume: VolumeData[]) {
  return volume.map((v) => {
    // Convert time to Unix timestamp if it's a string
    const time = typeof v.time === 'string' 
      ? Math.floor(new Date(v.time).getTime() / 1000)
      : v.time;
    
    return {
      time,
      value: v.value,
      color: v.color,
    };
  });
}

/**
 * Convert indicator data to Lightweight Charts format
 */
export function convertToLightweightIndicator(data: IndicatorLineData[]) {
  return data.map((d) => {
    // Convert time to Unix timestamp if it's a string
    const time = typeof d.time === 'string' 
      ? Math.floor(new Date(d.time).getTime() / 1000)
      : d.time;
    
    return {
      time,
      value: d.value,
    };
  });
}
