/**
 * MomentoFX v2.0 Constants
 * 
 * Centralized constants for configuration and defaults
 */

import type { Timeframe, TimeframeConfig } from '../types';

// ============================================================================
// TIMEFRAME CONFIGURATION
// ============================================================================

export const TIMEFRAME_CONFIG: Record<Timeframe, TimeframeConfig> = {
  '1m': { roundsPerCandle: 1, label: '1 Minute', seconds: 60 },
  '5m': { roundsPerCandle: 5, label: '5 Minutes', seconds: 300 },
  '15m': { roundsPerCandle: 15, label: '15 Minutes', seconds: 900 },
  '1h': { roundsPerCandle: 60, label: '1 Hour', seconds: 3600 },
  '4h': { roundsPerCandle: 240, label: '4 Hours', seconds: 14400 },
  '1D': { roundsPerCandle: 1440, label: '1 Day', seconds: 86400 },
};

export const DEFAULT_TIMEFRAME: Timeframe = '1h';

export const AVAILABLE_TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1D'];

// ============================================================================
// POLLING INTERVALS
// ============================================================================

export const POLL_INTERVALS = {
  FAST: 1000,      // 1 second - live prices
  NORMAL: 5000,    // 5 seconds - candle data
  SLOW: 10000,     // 10 seconds - technical analysis
  VERY_SLOW: 30000, // 30 seconds - pattern detection
} as const;

// ============================================================================
// API LIMITS
// ============================================================================

export const API_LIMITS = {
  MAX_CANDLES: 50,
  MAX_ROUNDS: 1000,
  MAX_HISTORY_DAYS: 365,
} as const;

// ============================================================================
// CHART CONFIGURATION
// ============================================================================

export const CHART_CONFIG = {
  DEFAULT_HEIGHT: 600,
  MIN_HEIGHT: 300,
  MAX_HEIGHT: 1200,
  DEFAULT_CANDLE_COUNT: 50,
  MAX_CANDLE_COUNT: 200,
  ZOOM_SENSITIVITY: 0.1,
} as const;

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const COLORS = {
  // Semantic colors for analytics
  bullish: '#10b981',      // green-500
  bearish: '#ef4444',      // red-500
  neutral: '#6b7280',      // gray-500
  
  // Pressure levels
  pressure_low: '#10b981',    // green-500
  pressure_medium: '#f59e0b', // amber-500
  pressure_high: '#ef4444',    // red-500
  
  // Confidence levels
  confidence_high: '#10b981',   // green-500
  confidence_medium: '#f59e0b', // amber-500
  confidence_low: '#ef4444',    // red-500
  
  // Chart colors
  candle_up: '#10b981',
  candle_down: '#ef4444',
  volume_up: 'rgba(16, 185, 129, 0.5)',
  volume_down: 'rgba(239, 68, 68, 0.5)',
  
  // Indicator colors
  rsi: '#8b5cf6',           // violet-500
  macd: '#06b6d4',          // cyan-500
  macd_signal: '#f97316',   // orange-500
  bollinger: '#eab308',     // yellow-500
  ma_20: '#3b82f6',         // blue-500
  ma_50: '#ec4899',         // pink-500
  
  // Drawing tool colors
  trendline: '#3b82f6',
  support: '#10b981',
  resistance: '#ef4444',
  fibonacci: '#8b5cf6',
} as const;

// ============================================================================
// THRESHOLDS
// ============================================================================

export const THRESHOLDS = {
  // Pressure thresholds
  PRESSURE_LOW: 0.33,
  PRESSURE_MEDIUM: 0.66,
  PRESSURE_HIGH: 1.0,
  
  // Confidence thresholds
  CONFIDENCE_LOW: 0.5,
  CONFIDENCE_MEDIUM: 0.7,
  CONFIDENCE_HIGH: 0.85,
  
  // RSI thresholds
  RSI_OVERBOUGHT: 70,
  RSI_OVERSOLD: 30,
  
  // Volatility thresholds
  VOLATILITY_LOW: 0.5,
  VOLATILITY_MEDIUM: 1.0,
  VOLATILITY_HIGH: 2.0,
  
  // Trend strength thresholds
  TRENGTH_WEAK: 0.3,
  TRENGTH_MODERATE: 0.6,
  TRENGTH_STRONG: 1.0,
} as const;

// ============================================================================
// PERFORMANCE TARGETS
// ============================================================================

export const PERFORMANCE_TARGETS = {
  // Model performance
  PATTERN_RECOGNITION_ACCURACY: 0.85,
  PREDICTION_PRECISION: 0.80,
  PREDICTION_RECALL: 0.75,
  F1_SCORE: 0.77,
  BRIER_SCORE: 0.25,
  
  // System performance
  MAX_LATENCY_MS: 100,
  MAX_THROUGHPUT_EVENTS_PER_SECOND: 1000,
  MIN_AVAILABILITY_PERCENT: 99.5,
  MAX_RESPONSE_TIME_MS: 2000,
  MAX_MEMORY_MB: 2048,
  
  // User experience
  MAX_LOAD_TIME_MS: 3000,
  MAX_INTERACTION_LATENCY_MS: 100,
  MIN_FRAME_RATE: 60,
} as const;

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

export const DEFAULT_USER_PREFERENCES = {
  theme: 'dark' as const,
  default_timeframe: DEFAULT_TIMEFRAME,
  default_source: '',
  chart_settings: {
    show_volume: true,
    show_indicators: true,
    show_crosshair: true,
    auto_scale: true,
  },
  indicator_settings: {
    rsi: { enabled: true, parameters: { period: 14 } },
    macd: { enabled: true, parameters: { fast: 12, slow: 26, signal: 9 } },
    bollinger: { enabled: true, parameters: { period: 20, stdDev: 2 } },
    stochastic: { enabled: false, parameters: { k: 14, d: 3, smooth: 3 } },
    atr: { enabled: true, parameters: { period: 14 } },
  },
  notification_settings: {
    enabled: true,
    types: ['pattern', 'pressure', 'survival', 'indicator'],
  },
  layout: {
    panels: [],
  },
} as const;

// ============================================================================
// WORKSPACE TEMPLATES
// ============================================================================

export const WORKSPACE_TEMPLATES = {
  trading: {
    id: 'trading-default',
    name: 'Default Trading Workspace',
    description: 'Standard trading layout with charts and indicators',
    category: 'trading' as const,
    layout: [
      {
        id: 'main-chart',
        type: 'candle-chart',
        position: { x: 0, y: 0, width: 12, height: 8 },
        minimized: false,
      },
      {
        id: 'indicators',
        type: 'indicator-panel',
        position: { x: 0, y: 8, width: 6, height: 4 },
        minimized: false,
      },
      {
        id: 'patterns',
        type: 'pattern-panel',
        position: { x: 6, y: 8, width: 6, height: 4 },
        minimized: false,
      },
    ],
    default_settings: DEFAULT_USER_PREFERENCES,
  },
  analysis: {
    id: 'analysis-default',
    name: 'Analysis Workspace',
    description: 'Deep analysis layout with multiple charts',
    category: 'analysis' as const,
    layout: [
      {
        id: 'main-chart',
        type: 'candle-chart',
        position: { x: 0, y: 0, width: 8, height: 8 },
        minimized: false,
      },
      {
        id: 'pressure-chart',
        type: 'pressure-chart',
        position: { x: 8, y: 0, width: 4, height: 4 },
        minimized: false,
      },
      {
        id: 'survival-chart',
        type: 'survival-chart',
        position: { x: 8, y: 4, width: 4, height: 4 },
        minimized: false,
      },
      {
        id: 'analytics',
        type: 'analytics-panel',
        position: { x: 0, y: 8, width: 12, height: 4 },
        minimized: false,
      },
    ],
    default_settings: DEFAULT_USER_PREFERENCES,
  },
  backtesting: {
    id: 'backtesting-default',
    name: 'Backtesting Workspace',
    description: 'Strategy backtesting and validation layout',
    category: 'backtesting' as const,
    layout: [
      {
        id: 'strategy-config',
        type: 'strategy-config',
        position: { x: 0, y: 0, width: 4, height: 6 },
        minimized: false,
      },
      {
        id: 'backtest-results',
        type: 'backtest-results',
        position: { x: 4, y: 0, width: 8, height: 6 },
        minimized: false,
      },
      {
        id: 'equity-chart',
        type: 'equity-chart',
        position: { x: 0, y: 6, width: 12, height: 6 },
        minimized: false,
      },
    ],
    default_settings: DEFAULT_USER_PREFERENCES,
  },
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  DATA_FETCH_FAILED: 'Failed to fetch data from server',
  CALCULATION_FAILED: 'Calculation failed',
  MODEL_INFERENCE_FAILED: 'Model inference failed',
  VALIDATION_FAILED: 'Validation failed',
  WEBSOCKET_DISCONNECTED: 'WebSocket connection lost',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  UNAUTHORIZED: 'Unauthorized access',
  NETWORK_ERROR: 'Network error occurred',
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const SUCCESS_MESSAGES = {
  DATA_SAVED: 'Data saved successfully',
  STRATEGY_CREATED: 'Strategy created successfully',
  BACKTEST_COMPLETED: 'Backtest completed successfully',
  WORKSPACE_SAVED: 'Workspace saved successfully',
  PREFERENCES_UPDATED: 'Preferences updated successfully',
} as const;

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

export const KEYBOARD_SHORTCUTS = {
  ZOOM_IN: ['+', '='],
  ZOOM_OUT: ['-'],
  PAN_LEFT: ['ArrowLeft'],
  PAN_RIGHT: ['ArrowRight'],
  RESET_VIEW: ['r', 'R'],
  TOGGLE_FULLSCREEN: ['f', 'F'],
  TOGGLE_VOLUME: ['v', 'V'],
  TOGGLE_INDICATORS: ['i', 'I'],
  SAVE_WORKSPACE: ['s', 'S'],
  LOAD_WORKSPACE: ['l', 'L'],
  NEW_STRATEGY: ['n', 'N'],
  RUN_BACKTEST: ['b', 'B'],
} as const;
