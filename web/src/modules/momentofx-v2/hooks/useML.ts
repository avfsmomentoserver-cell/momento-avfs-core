/**
 * useML Hook
 * 
 * Custom hook for ML model inference and pattern detection
 * Uses React Query for caching and automatic refetching
 */

import { useQuery } from '@tanstack/react-query';
import { mlService } from '../services/MLService';
import type { PatternPrediction, SurvivalEstimate } from '../types';
import { POLL_INTERVALS } from '../constants';

/**
 * Hook for detecting patterns using ML models
 */
export function usePatterns(source: string, timeframe: string, enabled = true) {
  return useQuery({
    queryKey: ['patterns', source, timeframe],
    queryFn: () => mlService.detectPatterns(source, timeframe),
    refetchInterval: POLL_INTERVALS.VERY_SLOW,
    staleTime: POLL_INTERVALS.VERY_SLOW * 2,
    enabled,
  });
}

/**
 * Hook for generating survival estimates
 */
export function useSurvivalEstimate(source: string, enabled = true) {
  return useQuery({
    queryKey: ['survival', source],
    queryFn: () => mlService.generateSurvivalEstimate(source),
    refetchInterval: POLL_INTERVALS.NORMAL,
    staleTime: POLL_INTERVALS.NORMAL / 2,
    enabled,
  });
}

/**
 * Hook for getting model performance metrics
 */
export function useModelPerformance(modelId: string, enabled = true) {
  return useQuery({
    queryKey: ['model-performance', modelId],
    queryFn: () => mlService.getModelPerformance(modelId),
    refetchInterval: false,
    staleTime: 300000, // 5 minutes
    enabled,
  });
}
