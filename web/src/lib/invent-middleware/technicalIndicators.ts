/**
 * Technical Indicators Module
 * 
 * Professional-grade technical indicator calculations for forex-style analysis
 * All calculations are pure functions for testability and performance
 * Follows gemini.md principles: no side effects, memoization ready
 */

import type { TechnicalIndicator, IndicatorLineData, ExtendedCandleData } from './momentoFX-types';

/**
 * Calculate RSI (Relative Strength Index)
 * 
 * @param prices - Array of closing prices
 * @param period - RSI period (default: 14)
 * @returns RSI value (0-100)
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - i] - prices[prices.length - i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Calculate SMA (Simple Moving Average)
 * 
 * @param prices - Array of prices
 * @param period - SMA period
 * @returns SMA value
 */
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((sum, val) => sum + val, 0) / period;
}

/**
 * Calculate EMA (Exponential Moving Average)
 * 
 * @param prices - Array of prices
 * @param period - EMA period
 * @returns EMA value
 */
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }

  return ema;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * 
 * @param prices - Array of closing prices
 * @param fastPeriod - Fast EMA period (default: 12)
 * @param slowPeriod - Slow EMA period (default: 26)
 * @param signalPeriod - Signal line period (default: 9)
 * @returns MACD values { macd, signal, histogram }
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number; signal: number; histogram: number } {
  if (prices.length < slowPeriod + signalPeriod) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  const macd = fastEMA - slowEMA;

  // Calculate signal line (EMA of MACD)
  const macdHistory: number[] = [];
  for (let i = signalPeriod; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    const fast = calculateEMA(slice, fastPeriod);
    const slow = calculateEMA(slice, slowPeriod);
    macdHistory.push(fast - slow);
  }

  const signal = calculateEMA(macdHistory, signalPeriod);
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

/**
 * Calculate Bollinger Bands
 * 
 * @param prices - Array of closing prices
 * @param period - Period for SMA and standard deviation (default: 20)
 * @param stdDev - Number of standard deviations (default: 2)
 * @returns Bollinger Bands { upper, middle, lower }
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number; middle: number; lower: number; squeeze: boolean } {
  if (prices.length < period) {
    const price = prices[prices.length - 1] || 0;
    return { upper: price, middle: price, lower: price, squeeze: false };
  }

  const slice = prices.slice(-period);
  const middle = calculateSMA(prices, period);

  // Calculate standard deviation
  const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
  const std = Math.sqrt(variance);

  const upper = middle + stdDev * std;
  const lower = middle - stdDev * std;

  // Detect squeeze (bands are contracting)
  const bandwidth = (upper - lower) / middle;
  const squeeze = bandwidth < 0.1; // Threshold for squeeze detection

  return { upper, middle, lower, squeeze };
}

/**
 * Calculate Stochastic Oscillator
 * 
 * @param candles - Array of candle data with high, low, close
 * @param kPeriod - %K period (default: 14)
 * @param dPeriod - %D period (default: 3)
 * @returns Stochastic values { k, d }
 */
export function calculateStochastic(
  candles: ExtendedCandleData[],
  kPeriod: number = 14,
  dPeriod: number = 3
): { k: number; d: number } {
  if (candles.length < kPeriod + dPeriod) {
    return { k: 50, d: 50 };
  }

  const recent = candles.slice(-kPeriod);
  const high = Math.max(...recent.map((c) => c.high));
  const low = Math.min(...recent.map((c) => c.low));
  const close = candles[candles.length - 1].close;

  const k = ((close - low) / (high - low)) * 100;

  // Calculate %D (SMA of %K)
  const kHistory: number[] = [];
  for (let i = kPeriod; i <= candles.length; i++) {
    const slice = candles.slice(i - kPeriod, i);
    const h = Math.max(...slice.map((c) => c.high));
    const l = Math.min(...slice.map((c) => c.low));
    const c = slice[slice.length - 1].close;
    kHistory.push(((c - l) / (h - l)) * 100);
  }

  const d = calculateSMA(kHistory, dPeriod);

  return { k, d };
}

/**
 * Calculate ATR (Average True Range)
 * 
 * @param candles - Array of candle data with high, low, close
 * @param period - ATR period (default: 14)
 * @returns ATR value
 */
export function calculateATR(candles: ExtendedCandleData[], period: number = 14): number {
  if (candles.length < period + 1) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    trueRanges.push(tr);
  }

  return calculateSMA(trueRanges, period);
}

/**
 * Calculate all technical indicators for a dataset
 * 
 * @param candles - Array of candle data
 * @returns Complete technical indicator set
 */
export function calculateAllIndicators(candles: ExtendedCandleData[]): TechnicalIndicator {
  if (candles.length < 20) {
    return {
      rsi: 50,
      macd: 0,
      macd_signal: 0,
      macd_histogram: 0,
      ma_20: candles[candles.length - 1]?.close || 0,
      ma_50: candles[candles.length - 1]?.close || 0,
      bollinger_upper: candles[candles.length - 1]?.close || 0,
      bollinger_middle: candles[candles.length - 1]?.close || 0,
      bollinger_lower: candles[candles.length - 1]?.close || 0,
      stochastic_k: 50,
      stochastic_d: 50,
      atr: 0,
      volume: candles.reduce((sum, c) => sum + c.volume, 0),
    };
  }

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  const rsi = calculateRSI(closes);
  const { macd, signal: macd_signal, histogram: macd_histogram } = calculateMACD(closes);
  const ma_20 = calculateSMA(closes, 20);
  const ma_50 = calculateSMA(closes, 50);
  const { upper: bollinger_upper, middle: bollinger_middle, lower: bollinger_lower } =
    calculateBollingerBands(closes);
  const { k: stochastic_k, d: stochastic_d } = calculateStochastic(candles);
  const atr = calculateATR(candles);
  const volume = volumes.reduce((sum, v) => sum + v, 0);

  return {
    rsi,
    macd,
    macd_signal,
    macd_histogram,
    ma_20,
    ma_50,
    bollinger_upper,
    bollinger_middle,
    bollinger_lower,
    stochastic_k,
    stochastic_d,
    atr,
    volume,
  };
}

/**
 * Generate indicator line data for charting
 * 
 * @param candles - Array of candle data
 * @param indicatorType - Type of indicator to generate
 * @returns Array of indicator line data points
 */
export function generateIndicatorLineData(
  candles: ExtendedCandleData[],
  indicatorType: 'ma-20' | 'ma-50' | 'rsi' | 'macd' | 'bollinger-upper' | 'bollinger-lower'
): IndicatorLineData[] {
  const closes = candles.map((c) => c.close);
  const data: IndicatorLineData[] = [];

  for (let i = 0; i < candles.length; i++) {
    const slice = closes.slice(0, i + 1);
    let value: number;

    switch (indicatorType) {
      case 'ma-20':
        value = calculateSMA(slice, 20);
        break;
      case 'ma-50':
        value = calculateSMA(slice, 50);
        break;
      case 'rsi':
        value = calculateRSI(slice);
        break;
      case 'macd':
        const macdData = calculateMACD(slice);
        value = macdData.macd;
        break;
      case 'bollinger-upper':
        const bbUpper = calculateBollingerBands(slice);
        value = bbUpper.upper;
        break;
      case 'bollinger-lower':
        const bbLower = calculateBollingerBands(slice);
        value = bbLower.lower;
        break;
      default:
        value = 0;
    }

    data.push({
      time: candles[i].time,
      value,
    });
  }

  return data;
}

/**
 * Detect indicator signals
 * 
 * @param indicators - Technical indicator values
 * @returns Array of detected signals
 */
export function detectIndicatorSignals(indicators: TechnicalIndicator): Array<{
  type: string;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number;
  reason: string;
}> {
  const signals: Array<{ type: string; signal: 'buy' | 'sell' | 'neutral'; strength: number; reason: string }> = [];

  // RSI signals
  if (indicators.rsi < 30) {
    signals.push({
      type: 'rsi',
      signal: 'buy',
      strength: (30 - indicators.rsi) / 30,
      reason: 'RSI oversold',
    });
  } else if (indicators.rsi > 70) {
    signals.push({
      type: 'rsi',
      signal: 'sell',
      strength: (indicators.rsi - 70) / 30,
      reason: 'RSI overbought',
    });
  }

  // MACD signals
  if (indicators.macd_histogram > 0 && indicators.macd > indicators.macd_signal) {
    signals.push({
      type: 'macd',
      signal: 'buy',
      strength: Math.min(1, indicators.macd_histogram / 0.5),
      reason: 'MACD bullish crossover',
    });
  } else if (indicators.macd_histogram < 0 && indicators.macd < indicators.macd_signal) {
    signals.push({
      type: 'macd',
      signal: 'sell',
      strength: Math.min(1, Math.abs(indicators.macd_histogram) / 0.5),
      reason: 'MACD bearish crossover',
    });
  }

  // MA crossover signals
  if (indicators.ma_20 > indicators.ma_50) {
    signals.push({
      type: 'ma',
      signal: 'buy',
      strength: 0.6,
      reason: '20 MA above 50 MA (bullish)',
    });
  } else if (indicators.ma_20 < indicators.ma_50) {
    signals.push({
      type: 'ma',
      signal: 'sell',
      strength: 0.6,
      reason: '20 MA below 50 MA (bearish)',
    });
  }

  // Stochastic signals
  if (indicators.stochastic_k < 20 && indicators.stochastic_d < 20) {
    signals.push({
      type: 'stochastic',
      signal: 'buy',
      strength: (20 - indicators.stochastic_k) / 20,
      reason: 'Stochastic oversold',
    });
  } else if (indicators.stochastic_k > 80 && indicators.stochastic_d > 80) {
    signals.push({
      type: 'stochastic',
      signal: 'sell',
      strength: (indicators.stochastic_k - 80) / 20,
      reason: 'Stochastic overbought',
    });
  }

  return signals;
}
