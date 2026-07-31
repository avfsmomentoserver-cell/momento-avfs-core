import { useState, useCallback } from 'react';
import type { Timeframe } from '@/lib/invent-middleware/momentoFX-types';
import { TIMEFRAME_CONFIG } from '@/lib/invent-middleware/momentoFX-types';

interface TimeframeManagerProps {
  activeTimeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
  availableTimeframes?: Timeframe[];
  showLabels?: boolean;
  compact?: boolean;
}

/**
 * Timeframe Manager Component
 * 
 * Provides synchronized timeframe switching across multiple chart components
 * Features:
 * - Multi-timeframe support (1m, 5m, 15m, 1h, 4h, 1D)
 * - Synchronized switching across components
 * - Visual feedback for active timeframe
 * - Compact and full display modes
 * 
 * Follows professional forex trading interface patterns
 */
export function TimeframeManager({
  activeTimeframe,
  onTimeframeChange,
  availableTimeframes = ['1m', '5m', '15m', '1h', '4h', '1D'],
  showLabels = true,
  compact = false,
}: TimeframeManagerProps) {
  const handleTimeframeClick = useCallback(
    (timeframe: Timeframe) => {
      onTimeframeChange(timeframe);
    },
    [onTimeframeChange]
  );

  return (
    <div className="flex items-center gap-2">
      {availableTimeframes.map((timeframe) => (
        <TimeframeButton
          key={timeframe}
          timeframe={timeframe}
          isActive={activeTimeframe === timeframe}
          onClick={handleTimeframeClick}
          showLabel={showLabels}
          compact={compact}
        />
      ))}
    </div>
  );
}

interface TimeframeButtonProps {
  timeframe: Timeframe;
  isActive: boolean;
  onClick: (timeframe: Timeframe) => void;
  showLabel: boolean;
  compact: boolean;
}

function TimeframeButton({
  timeframe,
  isActive,
  onClick,
  showLabel,
  compact,
}: TimeframeButtonProps) {
  const config = TIMEFRAME_CONFIG[timeframe];
  const label = showLabel ? config.label : timeframe;

  return (
    <button
      onClick={() => onClick(timeframe)}
      className={`
        px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
        ${
          isActive
            ? 'bg-purple-600 text-white border-purple-600'
            : 'bg-[#13131a] text-[#8891b0] border-[#1e1e2e] hover:border-purple-600 hover:text-purple-400'
        }
        border
        ${compact ? 'px-2 py-1' : ''}
      `}
      title={config.label}
    >
      {label}
    </button>
  );
}

/**
 * Hook for managing timeframe state with persistence
 */
export function useTimeframeManager(
  defaultTimeframe: Timeframe = '15m',
  storageKey: string = 'momentofx-timeframe'
) {
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved && isValidTimeframe(saved)) {
          return saved as Timeframe;
        }
      } catch (error) {
        console.warn('Failed to load timeframe from localStorage:', error);
      }
    }
    return defaultTimeframe;
  });

  const handleTimeframeChange = useCallback(
    (timeframe: Timeframe) => {
      setActiveTimeframe(timeframe);
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, timeframe);
        } catch (error) {
          console.warn('Failed to save timeframe to localStorage:', error);
        }
      }
    },
    [storageKey]
  );

  return {
    activeTimeframe,
    handleTimeframeChange,
  };
}

/**
 * Validate timeframe string
 */
function isValidTimeframe(value: string): value is Timeframe {
  return ['1m', '5m', '15m', '1h', '4h', '1D'].includes(value);
}

/**
 * Calculate candle aggregation based on timeframe
 */
export function calculateCandleAggregation(
  rounds: number[],
  timeframe: Timeframe
): Array<{ open: number; high: number; low: number; close: number }> {
  const roundsPerCandle = TIMEFRAME_CONFIG[timeframe].roundsPerCandle;
  const aggregated: Array<{ open: number; high: number; low: number; close: number }> = [];

  for (let i = 0; i < rounds.length; i += roundsPerCandle) {
    const chunk = rounds.slice(i, i + roundsPerCandle);
    if (chunk.length === 0) continue;

    const open = chunk[0];
    const close = chunk[chunk.length - 1];
    const high = Math.max(...chunk);
    const low = Math.min(...chunk);

    aggregated.push({ open, high, low, close });
  }

  return aggregated;
}

/**
 * Get timeframe display label
 */
export function getTimeframeLabel(timeframe: Timeframe): string {
  return TIMEFRAME_CONFIG[timeframe].label;
}

/**
 * Get all available timeframes
 */
export function getAllTimeframes(): Timeframe[] {
  return Object.keys(TIMEFRAME_CONFIG) as Timeframe[];
}
