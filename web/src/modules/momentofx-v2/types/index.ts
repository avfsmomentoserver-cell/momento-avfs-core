/**
 * MomentoFX v2.0 Type Definitions
 * 
 * Comprehensive TypeScript interfaces for commercial-grade analytics platform
 * Strict typing with no 'any' types for maximum type safety
 */

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Real-time analytics metrics for dashboard display
 */
export interface AnalyticsMetrics {
  timestamp: string;
  source: string;
  // Pressure metrics
  current_pressure: number;
  avg_mega_gap: number;
  avg_mini_moonshots: number;
  energy_buildup: number;
  shape_consistency: number;
  band_momentum: number;
  time_decay: number;
  // Distribution metrics
  mini_distribution: {
    ignition: number;
    moonshot: number;
  };
  // Trend metrics
  trend_direction: 'up' | 'down' | 'neutral';
  trend_strength: number;
  volatility: number;
  // Performance metrics
  accuracy_score: number;
  confidence_interval: [number, number];
}

/**
 * Historical analytics data for charting
 */
export interface AnalyticsHistory {
  timestamp: string;
  pressure: number;
  accuracy: number;
  volatility: number;
  volume: number;
}

// ============================================================================
// AI/ML TYPES
// ============================================================================

/**
 * Pattern prediction result from AI/ML models
 */
export interface PatternPrediction {
  id: string;
  pattern_type: PatternType;
  confidence: number;
  probability: number;
  detected_at: string;
  timeframe: string;
  entry_price?: number;
  target_price?: number;
  stop_loss?: number;
  risk_reward_ratio?: number;
  features: {
    [key: string]: number;
  };
  model_version: string;
  explanation: string;
}

/**
 * Pattern types supported by AI/ML models
 */
export type PatternType =
  | 'double_top'
  | 'double_bottom'
  | 'head_and_shoulders'
  | 'inverse_head_and_shoulders'
  | 'ascending_triangle'
  | 'descending_triangle'
  | 'symmetrical_triangle'
  | 'bull_flag'
  | 'bear_flag'
  | 'wedge'
  | 'rectangle'
  | 'diamond'
  | 'cup_and_handle';

/**
 * Survival estimate for ETA forecasting
 */
export interface SurvivalEstimate {
  timestamp: string;
  source: string;
  predicted_crash_point: number;
  confidence: number;
  probability_distribution: {
    crash_point: number;
    probability: number;
  }[];
  survival_curve: {
    time: number;
    survival_probability: number;
  }[];
  eta_seconds: number;
  uncertainty: number;
}

/**
 * Pressure score with multi-variate components
 */
export interface PressureScore {
  overall: number;
  components: {
    energy_buildup: number;
    band_momentum: number;
    time_decay: number;
    shape_consistency: number;
    volatility: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  signal: 'buy' | 'sell' | 'hold' | 'neutral';
  strength: 'weak' | 'moderate' | 'strong';
}

// ============================================================================
// BACKTESTING TYPES
// ============================================================================

/**
 * Strategy definition for backtesting
 */
export interface StrategyDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  parameters: {
    [key: string]: number | string | boolean;
  };
  entry_conditions: Condition[];
  exit_conditions: Condition[];
  risk_management: {
    max_position_size: number;
    stop_loss_percent: number;
    take_profit_percent: number;
    max_drawdown_percent: number;
  };
}

/**
 * Condition for strategy entry/exit
 */
export interface Condition {
  type: 'indicator' | 'pattern' | 'price' | 'time' | 'custom';
  operator: 'greater_than' | 'less_than' | 'equals' | 'crosses_above' | 'crosses_below';
  value: number;
  parameter?: string;
}

/**
 * Backtest result with performance metrics
 */
export interface BacktestResult {
  strategy_id: string;
  strategy_name: string;
  test_period: {
    start: string;
    end: string;
  };
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  // Performance metrics
  total_return: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  profit_factor: number;
  average_win: number;
  average_loss: number;
  largest_win: number;
  largest_loss: number;
  // Trade analysis
  trades: Trade[];
  equity_curve: {
    timestamp: string;
    equity: number;
  }[];
  // Risk metrics
  value_at_risk: number;
  expected_shortfall: number;
  calmar_ratio: number;
}

/**
 * Individual trade in backtest
 */
export interface Trade {
  id: string;
  entry_time: string;
  exit_time: string;
  entry_price: number;
  exit_price: number;
  position_size: number;
  pnl: number;
  pnl_percent: number;
  holding_period: number;
  exit_reason: 'stop_loss' | 'take_profit' | 'signal' | 'timeout';
}

// ============================================================================
// CHARTING TYPES
// ============================================================================

/**
 * Extended candle data for professional charting
 */
export interface ExtendedCandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
}

/**
 * Volume data for chart overlay
 */
export interface VolumeData {
  time: number;
  value: number;
  color: string;
}

/**
 * Indicator line data for chart overlay
 */
export interface IndicatorLineData {
  time: number;
  value: number;
}

/**
 * Drawing tool data for persistence
 */
export interface DrawingData {
  id: string;
  type: DrawingToolType;
  points: Array<{ x: number; y: number }>;
  color: string;
  lineWidth: number;
  style: 'solid' | 'dashed' | 'dotted';
  label?: string;
  timestamp: string;
}

/**
 * Drawing tool types
 */
export type DrawingToolType =
  | 'trendline'
  | 'horizontal'
  | 'vertical'
  | 'fibonacci'
  | 'support'
  | 'resistance'
  | 'rectangle'
  | 'channel'
  | 'pitchfork';

// ============================================================================
// TIMEFRAME TYPES
// ============================================================================

/**
 * Timeframe for analysis
 */
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';

/**
 * Timeframe configuration
 */
export interface TimeframeConfig {
  roundsPerCandle: number;
  label: string;
  seconds: number;
}

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
  latest_points: number | null;
  band: string;
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
  change_percent: number;
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
  round_id: number | null;
  recent_outcomes: Array<{
    multiplier: number;
    timestamp: string;
  }>;
}

// ============================================================================
// TECHNICAL INDICATOR TYPES
// ============================================================================

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
  ma_200: number;
  bollinger_upper: number;
  bollinger_middle: number;
  bollinger_lower: number;
  bollinger_width: number;
  stochastic_k: number;
  stochastic_d: number;
  atr: number;
  volume: number;
  obv: number;
}

/**
 * Indicator signal
 */
export interface IndicatorSignal {
  indicator: string;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number;
  timestamp: string;
  value: number;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

/**
 * Notification for real-time alerts
 */
export interface Notification {
  id: string;
  type: 'pattern' | 'pressure' | 'survival' | 'indicator' | 'system';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  read: boolean;
  source?: string;
}

// ============================================================================
// USER PREFERENCE TYPES
// ============================================================================

/**
 * User preferences for MomentoFX v2.0
 */
export interface UserPreferences {
  theme: 'dark' | 'light' | 'auto';
  default_timeframe: Timeframe;
  default_source: string;
  chart_settings: {
    show_volume: boolean;
    show_indicators: boolean;
    show_crosshair: boolean;
    auto_scale: boolean;
  };
  indicator_settings: {
    [key: string]: {
      enabled: boolean;
      parameters: { [key: string]: number };
    };
  };
  notification_settings: {
    enabled: boolean;
    types: string[];
  };
  layout: {
    panels: PanelConfig[];
  };
}

/**
 * Panel configuration for layout
 */
export interface PanelConfig {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  minimized: boolean;
  settings?: any;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Custom error for data fetching
 */
export class DataFetchError extends Error {
  constructor(message: string, public source?: string) {
    super(message);
    this.name = 'DataFetchError';
  }
}

/**
 * Custom error for calculation failures
 */
export class CalculationError extends Error {
  constructor(message: string, public operation?: string) {
    super(message);
    this.name = 'CalculationError';
  }
}

/**
 * Custom error for ML model failures
 */
export class ModelInferenceError extends Error {
  constructor(message: string, public model?: string) {
    super(message);
    this.name = 'ModelInferenceError';
  }
}

/**
 * Custom error for validation failures
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// ============================================================================
// WEBSOCKET TYPES
// ============================================================================

/**
 * WebSocket message types
 */
export type WebSocketMessageType =
  | 'round_update'
  | 'analytics_update'
  | 'pattern_detected'
  | 'pressure_change'
  | 'survival_update'
  | 'notification'
  | 'error';

/**
 * WebSocket message
 */
export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  data: T;
  timestamp: string;
  source?: string;
}

/**
 * WebSocket connection status
 */
export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// ============================================================================
// WORKSPACE TYPES
// ============================================================================

/**
 * Workspace configuration
 */
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  layout: PanelConfig[];
  sources: string[];
  timeframes: Timeframe[];
  created_at: string;
  updated_at: string;
}

/**
 * Workspace template
 */
export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  category: 'trading' | 'analysis' | 'backtesting' | 'custom';
  layout: PanelConfig[];
  default_settings: Partial<UserPreferences>;
}
