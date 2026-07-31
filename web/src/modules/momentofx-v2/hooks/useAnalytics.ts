/**
 * useAnalytics Hook
 * 
 * Custom hook for fetching analytics metrics
 * Uses React Query for caching and automatic refetching
 */

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/AnalyticsService';
import type { AnalyticsMetrics, AnalyticsHistory, PressureScore } from '../types';
import type { Timeframe } from '../types';
import { POLL_INTERVALS } from '../constants';

/**
 * Hook for fetching real-time analytics metrics
 */
export function useAnalytics(source: string, timeframe: Timeframe, enabled = true) {
  return useQuery({
    queryKey: ['analytics', source, timeframe],
    queryFn: () => analyticsService.calculateMetrics(source, timeframe),
    refetchInterval: POLL_INTERVALS.NORMAL,
    staleTime: POLL_INTERVALS.NORMAL / 2,
    enabled,
  });
}

/**
 * Hook for fetching historical analytics data
 */
export function useAnalyticsHistory(source: string, timeframe: Timeframe, limit = 100, enabled = true) {
  return useQuery({
    queryKey: ['analytics-history', source, timeframe, limit],
    queryFn: () => analyticsService.getHistory(source, timeframe, limit),
    refetchInterval: POLL_INTERVALS.SLOW,
    staleTime: POLL_INTERVALS.SLOW * 2,
    enabled,
  });
}

/**
 * Hook for fetching pressure score
 */
export function usePressureScore(source: string, enabled = true) {
  return useQuery({
    queryKey: ['pressure-score', source],
    queryFn: () => analyticsService.calculatePressureScore(source),
    refetchInterval: POLL_INTERVALS.NORMAL,
    staleTime: POLL_INTERVALS.NORMAL / 2,
    enabled,
  });
}
