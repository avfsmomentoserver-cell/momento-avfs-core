/**
 * Data Processing Utilities
 * 
 * Pure functions for data processing and transformation
 * No side effects, no external dependencies
 */

import type { ExtendedCandleData } from '../types';

/**
 * Aggregate candles to target timeframe
 */
export function aggregateCandles(
  candles: ExtendedCandleData[],
  targetRoundsPerCandle: number
): ExtendedCandleData[] {
  if (targetRoundsPerCandle === 1) return candles;

  const aggregated: ExtendedCandleData[] = [];
  
  for (let i = 0; i < candles.length; i += targetRoundsPerCandle) {
    const group = candles.slice(i, i + targetRoundsPerCandle);
    
    if (group.length === 0) continue;

    aggregated.push({
      time: group[0].time,
      open: group[0].open,
      high: Math.max(...group.map(c => c.high)),
      low: Math.min(...group.map(c => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, c) => sum + c.volume, 0),
      timestamp: group[0].timestamp,
    });
  }

  return aggregated;
}

/**
 * Resample data to fixed interval
 */
export function resampleData(
  data: ExtendedCandleData[],
  intervalSeconds: number
): ExtendedCandleData[] {
  if (data.length === 0) return [];

  const result: ExtendedCandleData[] = [];
  const startTime = data[0].time;
  const endTime = data[data.length - 1].time;
  
  let currentIndex = 0;
  
  for (let time = startTime; time <= endTime; time += intervalSeconds) {
    const bucket: ExtendedCandleData[] = [];
    
    while (currentIndex < data.length && data[currentIndex].time < time + intervalSeconds) {
      bucket.push(data[currentIndex]);
      currentIndex++;
    }
    
    if (bucket.length > 0) {
      result.push({
        time,
        open: bucket[0].open,
        high: Math.max(...bucket.map(c => c.high)),
        low: Math.min(...bucket.map(c => c.low)),
        close: bucket[bucket.length - 1].close,
        volume: bucket.reduce((sum, c) => sum + c.volume, 0),
        timestamp: new Date(time * 1000).toISOString(),
      });
    }
  }
  
  return result;
}

/**
 * Fill missing data points
 */
export function fillMissingData(
  data: ExtendedCandleData[],
  intervalSeconds: number,
  method: 'forward' | 'linear' = 'forward'
): ExtendedCandleData[] {
  if (data.length === 0) return [];

  const result: ExtendedCandleData[] = [data[0]];
  
  for (let i = 1; i < data.length; i++) {
    const prev = result[result.length - 1];
    const curr = data[i];
    const expectedTime = prev.time + intervalSeconds;
    
    if (curr.time === expectedTime) {
      result.push(curr);
    } else if (curr.time > expectedTime) {
      // Fill missing points
      for (let time = expectedTime; time < curr.time; time += intervalSeconds) {
        if (method === 'forward') {
          result.push({
            time,
            open: prev.close,
            high: prev.close,
            low: prev.close,
            close: prev.close,
            volume: 0,
            timestamp: new Date(time * 1000).toISOString(),
          });
        } else {
          // Linear interpolation
          const ratio = (time - prev.time) / (curr.time - prev.time);
          result.push({
            time,
            open: prev.open + (curr.open - prev.open) * ratio,
            high: prev.high + (curr.high - prev.high) * ratio,
            low: prev.low + (curr.low - prev.low) * ratio,
            close: prev.close + (curr.close - prev.close) * ratio,
            volume: 0,
            timestamp: new Date(time * 1000).toISOString(),
          });
        }
      }
      result.push(curr);
    }
  }
  
  return result;
}

/**
 * Calculate returns from price data
 */
export function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  
  return returns;
}

/**
 * Calculate log returns from price data
 */
export function calculateLogReturns(prices: number[]): number[] {
  const returns: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  
  return returns;
}

/**
 * Calculate cumulative returns
 */
export function calculateCumulativeReturns(returns: number[]): number[] {
  const cumulative: number[] = [0];
  
  for (let i = 0; i < returns.length; i++) {
    cumulative.push(cumulative[i] + returns[i]);
  }
  
  return cumulative;
}

/**
 * Calculate drawdown
 */
export function calculateDrawdown(prices: number[]): number[] {
  const drawdowns: number[] = [0];
  let peak = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > peak) {
      peak = prices[i];
    }
    drawdowns.push((peak - prices[i]) / peak);
  }
  
  return drawdowns;
}

/**
 * Calculate maximum drawdown
 */
export function calculateMaxDrawdown(prices: number[]): number {
  const drawdowns = calculateDrawdown(prices);
  return Math.max(...drawdowns);
}

/**
 * Calculate Sharpe ratio
 */
export function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0): number {
  if (returns.length === 0) return 0;
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  
  return (mean - riskFreeRate) / stdDev;
}

/**
 * Calculate Sortino ratio
 */
export function calculateSortinoRatio(returns: number[], riskFreeRate: number = 0): number {
  if (returns.length === 0) return 0;
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const downsideReturns = returns.filter(r => r < 0);
  const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length;
  const downsideDeviation = Math.sqrt(downsideVariance);
  
  if (downsideDeviation === 0) return 0;
  
  return (mean - riskFreeRate) / downsideDeviation;
}

/**
 * Calculate Calmar ratio
 */
export function calculateCalmarRatio(returns: number[]): number {
  if (returns.length === 0) return 0;
  
  const cumulativeReturn = calculateCumulativeReturns(returns);
  const totalReturn = cumulativeReturn[cumulativeReturn.length - 1];
  const prices = returns.map((r, i) => 1 + cumulativeReturn[i]);
  const maxDrawdown = calculateMaxDrawdown(prices);
  
  if (maxDrawdown === 0) return 0;
  
  return totalReturn / maxDrawdown;
}

/**
 * Calculate Value at Risk (VaR)
 */
export function calculateVaR(returns: number[], confidence: number = 0.95): number {
  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sorted.length);
  return sorted[index];
}

/**
 * Calculate Expected Shortfall (ES)
 */
export function calculateExpectedShortfall(returns: number[], confidence: number = 0.95): number {
  const varValue = calculateVaR(returns, confidence);
  const tailReturns = returns.filter(r => r <= varValue);
  
  if (tailReturns.length === 0) return varValue;
  
  return tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length;
}

/**
 * Calculate win rate
 */
export function calculateWinRate(trades: { pnl: number }[]): number {
  if (trades.length === 0) return 0;
  
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  return winningTrades / trades.length;
}

/**
 * Calculate profit factor
 */
export function calculateProfitFactor(trades: { pnl: number }[]): number {
  const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
  
  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  
  return grossProfit / grossLoss;
}

/**
 * Calculate average win/loss ratio
 */
export function calculateAverageWinLossRatio(trades: { pnl: number }[]): number {
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  
  if (winningTrades.length === 0 || losingTrades.length === 0) return 0;
  
  const avgWin = winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length;
  const avgLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0)) / losingTrades.length;
  
  if (avgLoss === 0) return 0;
  
  return avgWin / avgLoss;
}

/**
 * Smooth data using moving average
 */
export function smoothData(data: number[], period: number = 5): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - period + 1);
    const slice = data.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  
  return result;
}

/**
 * Detect outliers using IQR method
 */
export function detectOutliers(data: number[], multiplier: number = 1.5): number[] {
  const sorted = [...data].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;
  
  return data.filter(d => d < lowerBound || d > upperBound);
}

/**
 * Remove outliers from data
 */
export function removeOutliers(data: number[], multiplier: number = 1.5): number[] {
  const outliers = detectOutliers(data, multiplier);
  const outlierSet = new Set(outliers);
  
  return data.filter(d => !outlierSet.has(d));
}

/**
 * Normalize data to 0-1 range
 */
export function normalizeData(data: number[]): number[] {
  const min = Math.min(...data);
  const max = Math.max(...data);
  
  if (max === min) return data.map(() => 0.5);
  
  return data.map(d => (d - min) / (max - min));
}

/**
 * Standardize data (z-score)
 */
export function standardizeData(data: number[]): number[] {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return data.map(() => 0);
  
  return data.map(d => (d - mean) / stdDev);
}

/**
 * Calculate rolling statistics
 */
export function rollingStats(data: number[], period: number): {
  mean: number[];
  std: number[];
  min: number[];
  max: number[];
} {
  const mean: number[] = [];
  const std: number[] = [];
  const min: number[] = [];
  const max: number[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sliceMean = slice.reduce((a, b) => a + b, 0) / period;
    const sliceVariance = slice.reduce((sum, d) => sum + Math.pow(d - sliceMean, 2), 0) / period;
    
    mean.push(sliceMean);
    std.push(Math.sqrt(sliceVariance));
    min.push(Math.min(...slice));
    max.push(Math.max(...slice));
  }
  
  return { mean, std, min, max };
}
