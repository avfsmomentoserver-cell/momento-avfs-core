/**
 * Analytics Utilities
 * 
 * Pure functions for analytics calculations
 * No side effects, no external dependencies
 */

/**
 * Calculate moving average
 */
export function movingAverage(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

/**
 * Calculate exponential moving average
 */
export function exponentialMovingAverage(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
    result.push(ema);
  }
  
  return result;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function rsi(data: number[], period: number = 14): number[] {
  const result: number[] = [];
  const changes: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) gains += changes[i];
    else losses -= changes[i];
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  result.push(100 - (100 / (1 + avgGain / avgLoss)));
  
  for (let i = period; i < changes.length; i++) {
    if (changes[i] > 0) {
      avgGain = (avgGain * (period - 1) + changes[i]) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - changes[i]) / period;
    }
    
    result.push(100 - (100 / (1 + avgGain / avgLoss)));
  }
  
  return result;
}

/**
 * Calculate Bollinger Bands
 */
export function bollingerBands(data: number[], period: number = 20, stdDev: number = 2): {
  middle: number[];
  upper: number[];
  lower: number[];
} {
  const middle = movingAverage(data, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < middle.length; i++) {
    const slice = data.slice(i, i + period);
    const mean = middle[i];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    upper.push(mean + stdDev * std);
    lower.push(mean - stdDev * std);
  }
  
  return { middle, upper, lower };
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function macd(data: number[], fast: number = 12, slow: number = 26, signal: number = 9): {
  macd: number[];
  signal: number[];
  histogram: number[];
} {
  const fastEma = exponentialMovingAverage(data, fast);
  const slowEma = exponentialMovingAverage(data, slow);
  
  const macdLine: number[] = [];
  const startIndex = slow - fast;
  
  for (let i = 0; i < slowEma.length; i++) {
    macdLine.push(fastEma[i + startIndex] - slowEma[i]);
  }
  
  const signalLine = exponentialMovingAverage(macdLine, signal);
  const histogram: number[] = [];
  
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + signal - 1] - signalLine[i]);
  }
  
  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Calculate ATR (Average True Range)
 */
export function atr(high: number[], low: number[], close: number[], period: number = 14): number[] {
  const trueRanges: number[] = [];
  
  for (let i = 0; i < high.length; i++) {
    const tr = Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1] || 0),
      Math.abs(low[i] - close[i - 1] || 0)
    );
    trueRanges.push(tr);
  }
  
  return movingAverage(trueRanges, period);
}

/**
 * Calculate volatility (standard deviation)
 */
export function volatility(data: number[], period: number = 20): number[] {
  const result: number[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    result.push(Math.sqrt(variance));
  }
  
  return result;
}

/**
 * Calculate trend direction
 */
export function trendDirection(data: number[], period: number = 20): 'up' | 'down' | 'neutral' {
  const recent = data.slice(-period);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const change = (last - first) / first;
  
  if (change > 0.02) return 'up';
  if (change < -0.02) return 'down';
  return 'neutral';
}

/**
 * Calculate trend strength
 */
export function trendStrength(data: number[], period: number = 20): number {
  const recent = data.slice(-period);
  const ma = movingAverage(recent, Math.floor(period / 2));
  const deviations = recent.map((val, i) => Math.abs(val - ma[i] || val));
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const range = Math.max(...recent) - Math.min(...recent);
  
  return avgDeviation / (range || 1);
}

/**
 * Calculate pressure score from multiple indicators
 */
export function calculatePressureScore(
  energyBuildup: number,
  bandMomentum: number,
  timeDecay: number,
  shapeConsistency: number,
  volatility: number
): number {
  return (
    energyBuildup * 0.3 +
    bandMomentum * 0.25 +
    timeDecay * 0.2 +
    shapeConsistency * 0.15 +
    volatility * 0.1
  );
}

/**
 * Normalize value to 0-1 range
 */
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

/**
 * Calculate percentile
 */
export function percentile(data: number[], value: number): number {
  const sorted = [...data].sort((a, b) => a - b);
  const index = sorted.indexOf(value);
  return index / (sorted.length - 1);
}

/**
 * Detect peak in data
 */
export function detectPeaks(data: number[], threshold: number = 0.1): number[] {
  const peaks: number[] = [];
  
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
      const localMax = data[i];
      const localMin = Math.min(...data.slice(Math.max(0, i - 5), Math.min(data.length, i + 6)));
      if ((localMax - localMin) / localMin > threshold) {
        peaks.push(i);
      }
    }
  }
  
  return peaks;
}

/**
 * Detect trough in data
 */
export function detectTroughs(data: number[], threshold: number = 0.1): number[] {
  const troughs: number[] = [];
  
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] < data[i - 1] && data[i] < data[i + 1]) {
      const localMin = data[i];
      const localMax = Math.max(...data.slice(Math.max(0, i - 5), Math.min(data.length, i + 6)));
      if ((localMax - localMin) / localMin > threshold) {
        troughs.push(i);
      }
    }
  }
  
  return troughs;
}

/**
 * Calculate correlation coefficient
 */
export function correlation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
  const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
  const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate linear regression
 */
export function linearRegression(x: number[], y: number[]): {
  slope: number;
  intercept: number;
  r2: number;
} {
  const n = Math.min(x.length, y.length);
  const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
  const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
  const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const yMean = sumY / n;
  const ssTotal = y.slice(0, n).reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const ssResidual = y.slice(0, n).reduce((sum, yi, i) => {
    const predicted = slope * x[i] + intercept;
    return sum + Math.pow(yi - predicted, 2);
  }, 0);
  
  const r2 = ssTotal === 0 ? 1 : 1 - ssResidual / ssTotal;
  
  return { slope, intercept, r2 };
}
