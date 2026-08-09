/**
 * FX State Machine Type Definitions
 * 
 * TypeScript interfaces for the FX-style market physics and state machine architecture.
 * These types correspond to the backend Python structures in momento_fx_state.py.
 */

// ============================================================================
// MARKET STATE ENUMERATIONS
// ============================================================================

export type FXMarketState =
  | 'consolidation'
  | 'compression'
  | 'expansion'
  | 'liquidity_build'
  | 'liquidity_sweep'
  | 'momentum'
  | 'exhaustion'
  | 'reaccumulation'
  | 'distribution'
  | 'transition'
  | 'mean_reversion'
  | 'shock'
  | 'recovery';

export type TrendState =
  | 'strong_bull'
  | 'weak_bull'
  | 'neutral'
  | 'weak_bear'
  | 'strong_bear';

export type VolatilityState =
  | 'very_low'
  | 'low'
  | 'normal'
  | 'high'
  | 'extreme';

// ============================================================================
// POINT PHYSICS TYPES
// ============================================================================

export interface PointPhysics {
  raw_multiplier: number;
  points: number;
  band: string;
  energy: string;
  
  // Micro features
  velocity: number;
  acceleration: number;
  displacement: number;
  impulse: number;
  
  // Physics measurements
  compression: number;
  expansion: number;
  momentum: number;
  liquidity_potential: number;
  entropy: number;
  
  // State indicators
  state: FXMarketState;
  trend: TrendState;
  volatility: VolatilityState;
}

// ============================================================================
// MARKET STATE SNAPSHOT TYPES
// ============================================================================

export interface CompositeIndices {
  compression: number;
  expansion: number;
  liquidity: number;
  momentum: number;
  exhaustion: number;
  entropy: number;
  volatility: number;
  persistence: number;
  efficiency: number;
  fractal_alignment: number;
}

export interface StateTransition {
  state: FXMarketState;
  probability: number;
}

export interface StateTransitions {
  previous_state: FXMarketState | null;
  transition_probability: number;
  expected_next_states: StateTransition[];
}

export interface DnaSignature {
  signature: string;
  confidence: number;
}

export interface MarketStateSnapshot {
  timestamp: string;
  physics: PointPhysics;
  composite_indices: CompositeIndices;
  state_transitions: StateTransitions;
  dna: DnaSignature;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface MarketPhysicsResponse {
  source: string;
  count: number;
  physics: PointPhysics[];
}

export interface MarketStateResponse {
  source: string;
  state: MarketStateSnapshot | null;
  error?: string;
}

export interface StateSequenceResponse {
  source: string;
  count: number;
  sequence: MarketStateSnapshot[];
  error?: string;
}

export interface CompositeIndicesResponse {
  source: string;
  indices: CompositeIndices;
  physics: PointPhysics;
  error?: string;
}

export interface TransitionMatrix {
  [fromState: string]: {
    [toState: string]: number;
  };
}

export interface StateTransitionsResponse {
  source: string;
  transition_matrix: TransitionMatrix;
  current_expected_transitions: StateTransition[];
  transition_probability: number;
  error?: string;
}

export interface DnaHistoryEntry {
  timestamp: string;
  signature: string;
  confidence: number;
  state: FXMarketState;
}

export interface DnaAnalysisResponse {
  source: string;
  current_dna: DnaSignature;
  dna_history: DnaHistoryEntry[];
  signature_count: number;
  error?: string;
}

// ============================================================================
// CANDLESTICK GROUPING TYPES
// ============================================================================

export interface CandleMultiplierData {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CandlePointsData {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Candlestick {
  time: string;
  rounds_count: number;
  multiplier: CandleMultiplierData;
  points: CandlePointsData;
  band: string;
  energy: string;
}

export interface CandlestickGroupResponse {
  source: string;
  rounds_per_candle: number;
  candle_count: number;
  candles: Candlestick[];
  error?: string;
}

// ============================================================================
// STATE DEFINITION TYPES
// ============================================================================

export interface StateDefinition {
  value: string;
  description: string;
}

export interface StateDefinitionsResponse {
  states: StateDefinition[];
  trends: StateDefinition[];
  volatility_states: StateDefinition[];
}

// ============================================================================
// UI HELPER TYPES
// ============================================================================

export interface MarketStateConfig {
  color: string;
  icon: string;
  label: string;
  description: string;
}

export const MARKET_STATE_CONFIG: Record<FXMarketState, MarketStateConfig> = {
  consolidation: {
    color: '#8b95b7',
    icon: '🔄',
    label: 'Consolidation',
    description: 'Market stores energy with small point movement'
  },
  compression: {
    color: '#f59e0b',
    icon: '🔥',
    label: 'Compression',
    description: 'Market compressing like a spring with very low variance'
  },
  expansion: {
    color: '#2ee6c0',
    icon: '🚀',
    label: 'Expansion',
    description: 'Stored energy releases with high velocity and acceleration'
  },
  liquidity_build: {
    color: '#38bdf8',
    icon: '💧',
    label: 'Liquidity Build',
    description: 'Liquidity accumulating at key levels'
  },
  liquidity_sweep: {
    color: '#ef4444',
    icon: '🌊',
    label: 'Liquidity Sweep',
    description: 'Market grabs liquidity with fast impulse and reversal'
  },
  momentum: {
    color: '#22c55e',
    icon: '⚡',
    label: 'Momentum',
    description: 'Strong directional force with high persistence'
  },
  exhaustion: {
    color: '#f97316',
    icon: '📉',
    label: 'Exhaustion',
    description: 'Momentum decreases with failed highs and lower efficiency'
  },
  reaccumulation: {
    color: '#a855f7',
    icon: '🔄',
    label: 'Reaccumulation',
    description: 'Trend pauses before continuing with preserved momentum'
  },
  distribution: {
    color: '#ec4899',
    icon: '📊',
    label: 'Distribution',
    description: 'Large participants reducing positions'
  },
  transition: {
    color: '#fbbf24',
    icon: '⚠️',
    label: 'Transition',
    description: 'Market changing personality with shifting momentum'
  },
  mean_reversion: {
    color: '#6366f1',
    icon: '↩️',
    label: 'Mean Reversion',
    description: 'Market deviating from equilibrium with opposing liquidity'
  },
  shock: {
    color: '#dc2626',
    icon: '💥',
    label: 'Shock',
    description: 'Unexpected movement with acceleration spike'
  },
  recovery: {
    color: '#14b8a6',
    icon: '🛡️',
    label: 'Recovery',
    description: 'Market stabilizes with normalizing volatility'
  }
};

export const TREND_STATE_CONFIG: Record<TrendState, MarketStateConfig> = {
  strong_bull: {
    color: '#22c55e',
    icon: '📈',
    label: 'Strong Bull',
    description: 'Strong upward trend with high persistence'
  },
  weak_bull: {
    color: '#86efac',
    icon: '📈',
    label: 'Weak Bull',
    description: 'Moderate upward trend with some volatility'
  },
  neutral: {
    color: '#8b95b7',
    icon: '➡️',
    label: 'Neutral',
    description: 'No clear directional bias'
  },
  weak_bear: {
    color: '#fca5a5',
    icon: '📉',
    label: 'Weak Bear',
    description: 'Moderate downward trend with some volatility'
  },
  strong_bear: {
    color: '#ef4444',
    icon: '📉',
    label: 'Strong Bear',
    description: 'Strong downward trend with high persistence'
  }
};

export const VOLATILITY_STATE_CONFIG: Record<VolatilityState, MarketStateConfig> = {
  very_low: {
    color: '#1e40af',
    icon: '🔵',
    label: 'Very Low',
    description: 'Extremely low volatility with very narrow ranges'
  },
  low: {
    color: '#3b82f6',
    icon: '🟢',
    label: 'Low',
    description: 'Low volatility with narrow ranges'
  },
  normal: {
    color: '#8b95b7',
    icon: '⚪',
    label: 'Normal',
    description: 'Normal market volatility'
  },
  high: {
    color: '#f59e0b',
    icon: '🟠',
    label: 'High',
    description: 'High volatility with wide ranges'
  },
  extreme: {
    color: '#dc2626',
    icon: '🔴',
    label: 'Extreme',
    description: 'Extreme volatility with unpredictable movement'
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getMarketStateConfig(state: FXMarketState): MarketStateConfig {
  return MARKET_STATE_CONFIG[state] || MARKET_STATE_CONFIG.consolidation;
}

export function getTrendStateConfig(trend: TrendState): MarketStateConfig {
  return TREND_STATE_CONFIG[trend] || TREND_STATE_CONFIG.neutral;
}

export function getVolatilityStateConfig(volatility: VolatilityState): MarketStateConfig {
  return VOLATILITY_STATE_CONFIG[volatility] || VOLATILITY_STATE_CONFIG.normal;
}

export function formatMarketState(state: FXMarketState): string {
  return getMarketStateConfig(state).label;
}

export function formatTrendState(trend: TrendState): string {
  return getTrendStateConfig(trend).label;
}

export function formatVolatilityState(volatility: VolatilityState): string {
  return getVolatilityStateConfig(volatility).label;
}