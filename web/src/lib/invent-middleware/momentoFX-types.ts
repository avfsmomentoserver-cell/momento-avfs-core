/**
 * MomentoFX Professional Type Definitions
 * 
 * Strict TypeScript interfaces for professional forex trading interface
 * Following gemini.md principles: no 'any' types, explicit interfaces
 */

import type { Time } from 'lightweight-charts';

// ============================================================================
// TIMEFRAME TYPES
// ============================================================================

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';

export const TIMEFRAME_CONFIG: Record<Timeframe, { roundsPerCandle: number; label: string }> = {
  '1m': { roundsPerCandle: 1, label: '1 Minute' },
  '5m': { roundsPerCandle: 5, label: '5 Minutes' },
  '15m': { roundsPerCandle: 15, label: '15 Minutes' },
  '1h': { roundsPerCandle: 60, label: '1 Hour' },
  '4h': { roundsPerCandle: 240, label: '4 Hours' },
  '1D': { roundsPerCandle: 1440, label: '1 Day' },
};

// ============================================================================
// DATA TYPES
// ============================================================================

/**
 * Forex pair representation (mapped to platform sources)
 */
export interface ForexPair {
  id: string;
  name: string;
  active: boolean;
  round_count: number;
  latest_multiplier: number | null;
}

/**
 * Live price data with linguistics conversion
 */
export interface LivePrice {
  source: string;
  multiplier: number;
  points: number;
  band: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  timestamp: string;
}

/**
 * Crash game state
 */
export interface CrashGame {
  status: 'waiting' | 'running' | 'crashed';
  current_multiplier: number;
  current_points: number;
  recent_outcomes: Array<{
    multiplier: number;
    timestamp: string;
  }>;
}

/**
 * Technical indicator values
 */
export interface TechnicalIndicator {
  rsi: number;
  macd: number;
  macd_signal: number;
  macd_histogram: number;
  ma_20: number;
  ma_50: number;
  bollinger_upper: number;
  bollinger_middle: number;
  bollinger_lower: number;
  stochastic_k: number;
  stochastic_d: number;
  atr: number;
  volume: number;
}

/**
 * Pattern detection result
 */
export interface Pattern {
  id: string;
  name: string;
  type: 'reversal' | 'continuation';
  description: string;
  bullish: boolean;
  confidence: number;
  timeframe: Timeframe;
  detected_at: string;
  target_price?: number;
  stop_loss?: number;
}

/**
 * Position data
 */
export interface Position {
  id: string;
  source: string;
  amount: number;
  entry_multiplier: number;
  entry_points: number;
  current_multiplier: number;
  current_points: number;
  pnl: number;
  timestamp: string;
}

/**
 * Portfolio data
 */
export interface Portfolio {
  balance: number;
  total_pnl: number;
  win_rate: number;
  total_trades: number;
  positions: Position[];
}

// ============================================================================
// DRAWING TOOL TYPES
// ============================================================================

export type DrawingToolType = 
  | 'trendline'
  | 'horizontal'
  | 'fibonacci'
  | 'support'
  | 'resistance'
  | 'rectangle'
  | 'channel'
  | 'pitchfork';

/**
 * Drawing tool data structure
 */
export interface DrawingTool {
  id: string;
  type: DrawingToolType;
  points: Array<{ x: number; y: number }>;
  color: string;
  lineWidth: number;
  style: 'solid' | 'dashed' | 'dotted';
  label?: string;
  metadata?: {
    angle?: number;
    length?: number;
    fibLevels?: number[];
    strength?: number;
  };
  timestamp: string;
  source: string;
  timeframe: Timeframe;
}

/**
 * Smart suggestion for drawing tools
 */
export interface DrawingSuggestion {
  type: DrawingToolType;
  points: Array<{ x: number; y: number }>;
  confidence: number;
  reason: string;
  suggested_at: string;
}

// ============================================================================
// PATTERN DETECTION TYPES
// ============================================================================

export type PatternType = 
  | 'double_top'
  | 'double_bottom'
  | 'ascending_triangle'
  | 'descending_triangle'
  | 'symmetrical_triangle'
  | 'bull_flag'
  | 'bear_flag'
  | 'head_and_shoulders'
  | 'inverse_head_and_shoulders'
  | 'wedge'
  | 'rectangle';

/**
 * Pattern detection configuration
 */
export interface PatternDetectionConfig {
  enabledPatterns: PatternType[];
  minConfidence: number;
  lookbackPeriod: number;
  timeframe: Timeframe;
}

/**
 * Pattern analysis result
 */
export interface PatternAnalysis {
  patterns: Pattern[];
  confidence_distribution: {
    high: number;
    medium: number;
    low: number;
  };
  pattern_frequency: Record<PatternType, number>;
  last_updated: string;
}

// ============================================================================
// TECHNICAL INDICATOR TYPES
// ============================================================================

export type IndicatorType = 
  | 'rsi'
  | 'macd'
  | 'bollinger'
  | 'stochastic'
  | 'atr'
  | 'ma'
  | 'volume';

/**
 * Indicator configuration
 */
export interface IndicatorConfig {
  type: IndicatorType;
  enabled: boolean;
  parameters: Record<string, number>;
  display: {
    overlay: boolean;
    color: string;
    lineWidth: number;
  };
}

/**
 * Indicator signal
 */
export interface IndicatorSignal {
  indicator: IndicatorType;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number;
  reason: string;
  timestamp: string;
}

// ============================================================================
// CHART DATA TYPES
// ============================================================================

/**
 * Extended candle data for Lightweight Charts
 */
export interface ExtendedCandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  peak_multiplier: number;
  volume: number;
  points?: number;
  band?: string;
}

/**
 * Volume data for histogram
 */
export interface VolumeData {
  time: Time;
  value: number;
  color: string;
}

/**
 * Indicator line data
 */
export interface IndicatorLineData {
  time: Time;
  value: number;
}

// ============================================================================
// ANALYSIS ENGINE TYPES
// ============================================================================

/**
 * Platform forecast integration
 */
export interface PlatformForecast {
  id: string;
  source: string;
  timestamp: string;
  prediction: {
    min: number;
    max: number;
    confidence: number;
  };
  explanation: {
    markov_score: number;
    percentile_score: number;
    dna_score: number;
  };
}

/**
 * DNA pattern match result
 */
export interface DnaPatternMatch {
  pattern_id: string;
  similarity: number;
  confidence: number;
  historical_outcome: number;
  matched_at: string;
}

/**
 Linguistics-based analysis
 */
export interface LinguisticsAnalysis {
  current_band: string;
  band_history: Array<{
    band: string;
    timestamp: string;
  }>;
  band_transitions: Record<string, number>;
  semantic_summary: string;
}

// ============================================================================
// MULTI-TIMEFRAME TYPES
// ============================================================================

/**
 * Multi-timeframe correlation data
 */
export interface MultiTimeframeCorrelation {
  timeframe: Timeframe;
  trend: 'up' | 'down' | 'neutral';
  strength: number;
  patterns: Pattern[];
  indicators: TechnicalIndicator;
}

/**
 * Timeframe synchronization state
 */
export interface TimeframeSyncState {
  primary: Timeframe;
  secondary: Timeframe[];
  synced: boolean;
  correlation_score: number;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Chart layout preset
 */
export type ChartLayoutPreset = 
  | 'single'
  | 'dual'
  | 'triple'
  | 'quad';

/**
 * Chart workspace configuration
 */
export interface ChartWorkspace {
  layout: ChartLayoutPreset;
  panels: Array<{
    id: string;
    type: 'candles' | 'indicator' | 'volume';
    height: number;
    indicators: IndicatorType[];
  }>;
  drawings: DrawingTool[];
  timeframes: Timeframe[];
  activeTimeframe: Timeframe;
}

/**
 * User preferences
 */
export interface UserPreferences {
  theme: 'dark' | 'light';
  colorScheme: 'default' | 'professional' | 'high-contrast';
  autoSave: boolean;
  keyboardShortcuts: boolean;
  soundAlerts: boolean;
  defaultTimeframe: Timeframe;
  defaultLayout: ChartLayoutPreset;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * MomentoFX error types
 */
export class MomentoFXError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MomentoFXError';
  }
}

export class DataFetchError extends MomentoFXError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DATA_FETCH_ERROR', context);
    this.name = 'DataFetchError';
  }
}

export class CalculationError extends MomentoFXError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CALCULATION_ERROR', context);
    this.name = 'CalculationError';
  }
}

export class PatternDetectionError extends MomentoFXError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'PATTERN_DETECTION_ERROR', context);
    this.name = 'PatternDetectionError';
  }
}

export class DrawingToolError extends MomentoFXError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DRAWING_TOOL_ERROR', context);
    this.name = 'DrawingToolError';
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Deep partial type for nested updates
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Required keys from type
 */
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Optional keys from type
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
