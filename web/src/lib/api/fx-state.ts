/**
 * FX State API Client
 * 
 * API client functions for interacting with the FX state machine endpoints.
 * These functions provide type-safe access to market physics, state analysis,
 * and DNA pattern matching data.
 */

import { api } from '../api';
import type {
  MarketPhysicsResponse,
  MarketStateResponse,
  StateSequenceResponse,
  CompositeIndicesResponse,
  StateTransitionsResponse,
  DnaAnalysisResponse,
  CandlestickGroupResponse,
  StateDefinitionsResponse,
  FXMarketState,
} from '../types/fx-state';

// ============================================================================
// MARKET PHYSICS ENDPOINTS
// ============================================================================

/**
 * Get market physics measurements for a source
 */
export async function getMarketPhysics(
  source: string,
  limit: number = 100
): Promise<MarketPhysicsResponse> {
  return await api.fxStatePhysics(source, limit) as MarketPhysicsResponse;
}

/**
 * Get current market state analysis
 */
export async function getMarketState(
  source: string,
  limit: number = 100
): Promise<MarketStateResponse> {
  return await api.fxState(source, limit) as MarketStateResponse;
}

/**
 * Get market state sequence over time
 */
export async function getStateSequence(
  source: string,
  limit: number = 200
): Promise<StateSequenceResponse> {
  return await api.fxStateSequence(source, limit) as StateSequenceResponse;
}

// ============================================================================
// COMPOSITE INDICES ENDPOINTS
// ============================================================================

/**
 * Get composite market physics indices
 */
export async function getCompositeIndices(
  source: string,
  limit: number = 100
): Promise<CompositeIndicesResponse> {
  return await api.fxIndices(source, limit) as CompositeIndicesResponse;
}

// ============================================================================
// STATE TRANSITIONS ENDPOINTS
// ============================================================================

/**
 * Get state transition analysis
 */
export async function getStateTransitions(
  source: string,
  limit: number = 200
): Promise<StateTransitionsResponse> {
  return await api.fxTransitions(source, limit) as StateTransitionsResponse;
}

// ============================================================================
// DNA ANALYSIS ENDPOINTS
// ============================================================================

/**
 * Get DNA signature analysis
 */
export async function getDnaAnalysis(
  source: string,
  limit: number = 200
): Promise<DnaAnalysisResponse> {
  return await api.fxDna(source, limit) as DnaAnalysisResponse;
}

// ============================================================================
// CANDLESTICK GROUPING ENDPOINTS
// ============================================================================

/**
 * Get candlestick-grouped data by timeframe
 */
export async function getCandlestickGroups(
  source: string,
  roundsPerCandle: number = 5,
  limit: number = 200
): Promise<CandlestickGroupResponse> {
  return await api.fxCandles(source, roundsPerCandle, limit) as CandlestickGroupResponse;
}

// ============================================================================
// STATE DEFINITIONS ENDPOINTS
// ============================================================================

/**
 * Get definitions of all market states
 */
export async function getStateDefinitions(): Promise<StateDefinitionsResponse> {
  return await api.fxStateDefinitions() as StateDefinitionsResponse;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get complete FX state analysis for a source
 * Combines physics, state, indices, and DNA data
 */
export async function getCompleteFXStateAnalysis(
  source: string,
  limit: number = 200
): Promise<{
  physics: MarketPhysicsResponse;
  state: MarketStateResponse;
  indices: CompositeIndicesResponse;
  transitions: StateTransitionsResponse;
  dna: DnaAnalysisResponse;
}> {
  const [physics, state, indices, transitions, dna] = await Promise.all([
    getMarketPhysics(source, limit),
    getMarketState(source, limit),
    getCompositeIndices(source, limit),
    getStateTransitions(source, limit),
    getDnaAnalysis(source, limit),
  ]);

  return { physics, state, indices, transitions, dna };
}

/**
 * Get current market state as a simple enum
 */
export async function getCurrentMarketState(
  source: string,
  limit: number = 100
): Promise<FXMarketState | null> {
  const response = await getMarketState(source, limit);
  return response.state?.physics.state || null;
}

/**
 * Get candlestick data for multiple timeframes
 */
export async function getMultiTimeframeCandles(
  source: string,
  limit: number = 200
): Promise<Record<string, CandlestickGroupResponse>> {
  const timeframes = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '1h': 60,
    '4h': 240,
  };

  const promises = Object.entries(timeframes).map(([tf, rounds]) =>
    getCandlestickGroups(source, rounds, limit)
  );

  const results = await Promise.all(promises);

  return Object.keys(timeframes).reduce((acc, tf, index) => {
    acc[tf] = results[index];
    return acc;
  }, {} as Record<string, CandlestickGroupResponse>);
}