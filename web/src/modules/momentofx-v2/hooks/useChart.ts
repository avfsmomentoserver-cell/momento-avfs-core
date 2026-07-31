/**
 * useChart Hook
 * 
 * Custom hook for chart data fetching
 * Uses React Query for caching and automatic refetching
 */

import { useQuery } from '@tanstack/react-query';
import { chartService } from '../services/ChartService';
import type { ExtendedCandleData, VolumeData, IndicatorLineData } from '../types';
import type { Timeframe } from '../types';
import { POLL_INTERVALS } from '../constants';

/**
 * Hook for fetching candle data
 */
export function useCandles(source: string, timeframe: Timeframe, limit = 50, enabled = true) {
  return useQuery({
    queryKey: ['candles', source, timeframe, limit],
    queryFn: () => chartService.getCandles(source, timeframe, limit),
    refetchInterval: POLL_INTERVALS.NORMAL,
    staleTime: POLL_INTERVALS.NORMAL / 2,
    enabled,
  });
}

/**
 * Hook for fetching volume data
 */
export function useVolume(source: string, timeframe: Timeframe, limit = 50, enabled = true) {
  return useQuery({
    queryKey: ['volume', source, timeframe, limit],
    queryFn: () => chartService.getVolume(source, timeframe, limit),
    refetchInterval: POLL_INTERVALS.NORMAL,
    staleTime: POLL_INTERVALS.NORMAL / 2,
    enabled,
  });
}

/**
 * Hook for fetching indicator data
 */
export function useIndicatorData(
  source: string,
  timeframe: Timeframe,
  indicator: string,
  limit = 50,
  enabled = true
) {
  return useQuery({
    queryKey: ['indicator', source, timeframe, indicator, limit],
    queryFn: () => chartService.getIndicatorData(source, timeframe, indicator, limit),
    refetchInterval: POLL_INTERVALS.NORMAL,
    staleTime: POLL_INTERVALS.NORMAL / 2,
    enabled,
  });
}
