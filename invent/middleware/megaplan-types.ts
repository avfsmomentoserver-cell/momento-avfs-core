/**
 * Megaplan Moonshot Prediction System - Type Definitions
 * 
 * Comprehensive type definitions for the megaplan prediction system
 * that analyzes multiplier sequences, time-based candlesticks, and market state
 */

// ============================================================================
// MAIN PREDICTION TYPES
// ============================================================================

export interface MegaplanPrediction {
  market_state: 'compression' | 'release' | 'transition';
  next_range_targets: {
    min: number;
    max: number;
    confidence: number;
  };
  forward_structure: {
    predicted_sequence: number[];
    angle: number;
    direction: 'upward' | 'downward' | 'sideways';
  };
  momentum_forecast: {
    current_momentum: number;
    release_probability: number;
    cluster_prediction: {
      likely: boolean;
      timing: number; // rounds until cluster
    };
  };
  consensus_score: number; // 0-1, weighted average of valid factors
  factors: {
    sequence_angle: boolean;
    momentum_compression: boolean;
    time_candlestick: boolean;
    market_state: boolean;
  };
  timestamp: string;
}

// ============================================================================
// SEQUENCE ANALYSIS TYPES
// ============================================================================

export interface SequenceAngleAnalysis {
  sequence: number[];
  angle: number;
  rate_of_change: number[];
  acceleration: number[];
  direction: 'upward' | 'downward' | 'sideways';
  target_range: { min: number; max: number };
  confidence: number;
  predicted_sequence?: number[]; // Optional forward structure prediction
}

export interface SequencePattern {
  type: 'geometric' | 'arithmetic' | 'exponential' | 'irregular';
  growth_rate: number;
  consistency: number;
  description: string;
}

// ============================================================================
// TIME-BASED CANDLESTICK TYPES
// ============================================================================

export type MegaplanTimeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';

export const MEGAPLAN_TIMEFRAME_CONFIG: Record<MegaplanTimeframe, { 
  durationMinutes: number; 
  label: string 
}> = {
  '1m': { durationMinutes: 1, label: '1 Minute' },
  '5m': { durationMinutes: 5, label: '5 Minutes' },
  '15m': { durationMinutes: 15, label: '15 Minutes' },
  '1h': { durationMinutes: 60, label: '1 Hour' },
  '4h': { durationMinutes: 240, label: '4 Hours' },
  '1D': { durationMinutes: 1440, label: '1 Day' },
};

export interface TimeBasedCandlestick {
  time: number; // timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  round_times: number[]; // time from previous round for each round in candle (ms)
  large_multiplier_divisions: Array<{
    original_multiplier: number;
    divisions: Array<{ timeframe: MegaplanTimeframe; portion: number }>;
  }>;
  round_count: number;
  peak_multiplier: number;
}

export interface RoundTimeData {
  round_id: number;
  multiplier: number;
  timestamp: string;
  time_from_previous: number; // milliseconds
}

// ============================================================================
// MOMENTUM COMPRESSION TYPES
// ============================================================================

export interface MomentumCompressionAnalysis {
  compression_points: number[];
  release_points: number[];
  momentum_score: number;
  compression_ratio: number;
  cluster_probability: number;
  expected_cluster_timing: number;
  pattern: string;
  confidence: number;
}

export interface CompressionReleasePattern {
  compression_rounds: number[];
  release_rounds: number[];
  compression_duration: number;
  release_magnitude: number;
  pattern_type: 'gradual' | 'sudden' | 'oscillating';
}

// ============================================================================
// MARKET STATE TYPES
// ============================================================================

export interface MarketStateAnalysis {
  current_state: 'compression' | 'release' | 'transition';
  energy_buildup: number;
  pressure_score: number;
  transition_signals: Array<{
    type: string;
    strength: number;
    description: string;
  }>;
  confidence: number;
}

export interface EnergyIndicator {
  type: 'volatility' | 'frequency' | 'magnitude' | 'timing';
  value: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  significance: 'low' | 'medium' | 'high';
}

// ============================================================================
// FACTOR CORRELATION TYPES
// ============================================================================

export interface FactorPrediction {
  factor_name: string;
  valid: boolean;
  confidence: number;
  prediction: any;
  reasoning: string;
}

export interface ConsensusResult {
  consensus_score: number;
  valid_factors: string[];
  invalid_factors: string[];
  combined_prediction: MegaplanPrediction;
  explanation: string;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface MegaplanConfig {
  analysis_window: number; // number of rounds to analyze (100-500)
  timeframes: MegaplanTimeframe[];
  computed_consensus: boolean;
  confidence_threshold: number;
  large_multiplier_threshold: number; // multiplier above which to divide across timeframes
  performance_mode: 'accuracy' | 'speed' | 'balanced';
}

export const DEFAULT_MEGAPLAN_CONFIG: MegaplanConfig = {
  analysis_window: 300,
  timeframes: ['1m', '5m', '15m', '1h'],
  computed_consensus: true,
  confidence_threshold: 0.7,
  large_multiplier_threshold: 1000,
  performance_mode: 'balanced',
};

// ============================================================================
// ERROR TYPES
// ============================================================================

export class MegaplanError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MegaplanError';
  }
}

export class SequenceAnalysisError extends MegaplanError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'SEQUENCE_ANALYSIS_ERROR', context);
    this.name = 'SequenceAnalysisError';
  }
}

export class CandlestickProcessingError extends MegaplanError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CANDLESTICK_PROCESSING_ERROR', context);
    this.name = 'CandlestickProcessingError';
  }
}

export class MomentumAnalysisError extends MegaplanError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'MOMENTUM_ANALYSIS_ERROR', context);
    this.name = 'MomentumAnalysisError';
  }
}

export class ConsensusError extends MegaplanError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONSENSUS_ERROR', context);
    this.name = 'ConsensusError';
  }
}