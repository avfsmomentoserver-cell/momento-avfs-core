/**
 * State Manager - Local state management for inventions
 * 
 * Manages invention-specific state without touching main system database.
 * Provides React Query integration and caching.
 */

import { NormalizedRound, NormalizedAnalysis } from './transformProcessor';
import { PatternMatch, AnomalyDetection, PredictionResult } from './analysisEngine';

// State is managed through React Query hooks - no separate store needed
// This file provides the React Query hooks for data fetching

/**
 * React Query hooks for data fetching
 */
import { useQuery } from '@tanstack/react-query';
import { dataIngester } from './dataIngester';
import { transformProcessor } from './transformProcessor';
import { analysisEngine } from './analysisEngine';

const POLL_INTERVAL = 5000; // 5 seconds

/**
 * Hook to fetch and process rounds
 */
export function useInventionRounds(source: string = 'aviator') {
  return useQuery({
    queryKey: ['invention-rounds', source],
    queryFn: async () => {
      const rawRounds = await dataIngester.getRounds(source, 100);
      return transformProcessor.normalizeRounds(rawRounds);
    },
    refetchInterval: POLL_INTERVAL,
    staleTime: 2000,
  });
}

/**
 * Hook to fetch and process analysis
 */
export function useInventionAnalysis(source: string = 'aviator') {
  return useQuery({
    queryKey: ['invention-analysis', source],
    queryFn: async () => {
      const rawAnalysis = await dataIngester.getAnalysis(source, 600);
      return transformProcessor.normalizeAnalysis(rawAnalysis);
    },
    refetchInterval: POLL_INTERVAL * 2,
    staleTime: 10000,
  });
}

/**
 * Hook to run pattern detection
 */
export function usePatternDetection(source: string = 'aviator', rounds: NormalizedRound[] = []) {
  return useQuery({
    queryKey: ['invention-patterns', source, rounds.length],
    queryFn: () => {
      return analysisEngine.detectPatterns(rounds);
    },
    enabled: rounds.length > 0,
    refetchInterval: POLL_INTERVAL * 3,
    staleTime: 15000,
  });
}

/**
 * Hook to run anomaly detection
 */
export function useAnomalyDetection(source: string = 'aviator', rounds: NormalizedRound[] = []) {
  return useQuery({
    queryKey: ['invention-anomalies', source, rounds.length],
    queryFn: () => {
      return analysisEngine.detectAnomalies(rounds);
    },
    enabled: rounds.length > 0,
    refetchInterval: POLL_INTERVAL * 3,
    staleTime: 15000,
  });
}

/**
 * Hook to generate predictions
 */
export function usePrediction(source: string = 'aviator', rounds: NormalizedRound[] = [], analysis: NormalizedAnalysis | null = null) {
  return useQuery({
    queryKey: ['invention-prediction', source, rounds.length],
    queryFn: () => {
      return analysisEngine.generatePrediction(rounds, analysis);
    },
    enabled: rounds.length > 0,
    refetchInterval: POLL_INTERVAL * 4,
    staleTime: 20000,
  });
}
