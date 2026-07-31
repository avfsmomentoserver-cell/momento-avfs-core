/**
 * Pattern Recognition Utilities
 * 
 * Pure functions for technical pattern detection
 * No side effects, no external dependencies
 */

import type { PatternType } from '../types';
import { detectPeaks, detectTroughs, linearRegression } from './analytics';

/**
 * Detect double top pattern
 */
export function detectDoubleTop(
  data: number[],
  threshold: number = 0.02,
  lookback: number = 20
): boolean {
  const peaks = detectPeaks(data, threshold);
  
  if (peaks.length < 2) return false;
  
  const lastTwoPeaks = peaks.slice(-2);
  const peak1 = data[lastTwoPeaks[0]];
  const peak2 = data[lastTwoPeaks[1]];
  
  // Peaks should be at similar price levels
  const priceDiff = Math.abs(peak1 - peak2) / peak1;
  if (priceDiff > threshold) return false;
  
  // Check for neckline support
  const troughIndex = detectTroughs(data, threshold).slice(-1)[0];
  if (!troughIndex) return false;
  
  const neckline = data[troughIndex];
  const currentPrice = data[data.length - 1];
  
  // Price should be approaching neckline
  return currentPrice < neckline * 1.02;
}

/**
 * Detect double bottom pattern
 */
export function detectDoubleBottom(
  data: number[],
  threshold: number = 0.02,
  lookback: number = 20
): boolean {
  const troughs = detectTroughs(data, threshold);
  
  if (troughs.length < 2) return false;
  
  const lastTwoTroughs = troughs.slice(-2);
  const trough1 = data[lastTwoTroughs[0]];
  const trough2 = data[lastTwoTroughs[1]];
  
  // Troughs should be at similar price levels
  const priceDiff = Math.abs(trough1 - trough2) / trough1;
  if (priceDiff > threshold) return false;
  
  // Check for neckline resistance
  const peakIndex = detectPeaks(data, threshold).slice(-1)[0];
  if (!peakIndex) return false;
  
  const neckline = data[peakIndex];
  const currentPrice = data[data.length - 1];
  
  // Price should be approaching neckline
  return currentPrice > neckline * 0.98;
}

/**
 * Detect head and shoulders pattern
 */
export function detectHeadAndShoulders(
  data: number[],
  threshold: number = 0.02,
  lookback: number = 30
): boolean {
  const peaks = detectPeaks(data, threshold);
  
  if (peaks.length < 3) return false;
  
  const lastThreePeaks = peaks.slice(-3);
  const leftShoulder = data[lastThreePeaks[0]];
  const head = data[lastThreePeaks[1]];
  const rightShoulder = data[lastThreePeaks[2]];
  
  // Head should be higher than shoulders
  if (head <= leftShoulder || head <= rightShoulder) return false;
  
  // Shoulders should be at similar levels
  const shoulderDiff = Math.abs(leftShoulder - rightShoulder) / leftShoulder;
  if (shoulderDiff > threshold) return false;
  
  // Check for neckline
  const troughs = detectTroughs(data, threshold);
  if (troughs.length < 2) return false;
  
  const neckline = Math.min(
    data[troughs[troughs.length - 2]],
    data[troughs[troughs.length - 1]]
  );
  
  const currentPrice = data[data.length - 1];
  return currentPrice < neckline * 1.02;
}

/**
 * Detect inverse head and shoulders pattern
 */
export function detectInverseHeadAndShoulders(
  data: number[],
  threshold: number = 0.02,
  lookback: number = 30
): boolean {
  const troughs = detectTroughs(data, threshold);
  
  if (troughs.length < 3) return false;
  
  const lastThreeTroughs = troughs.slice(-3);
  const leftShoulder = data[lastThreeTroughs[0]];
  const head = data[lastThreeTroughs[1]];
  const rightShoulder = data[lastThreeTroughs[2]];
  
  // Head should be lower than shoulders
  if (head >= leftShoulder || head >= rightShoulder) return false;
  
  // Shoulders should be at similar levels
  const shoulderDiff = Math.abs(leftShoulder - rightShoulder) / leftShoulder;
  if (shoulderDiff > threshold) return false;
  
  // Check for neckline
  const peaks = detectPeaks(data, threshold);
  if (peaks.length < 2) return false;
  
  const neckline = Math.max(
    data[peaks[peaks.length - 2]],
    data[peaks[peaks.length - 1]]
  );
  
  const currentPrice = data[data.length - 1];
  return currentPrice > neckline * 0.98;
}

/**
 * Detect ascending triangle pattern
 */
export function detectAscendingTriangle(
  data: number[],
  threshold: number = 0.02,
  lookback: number = 20
): boolean {
  const recent = data.slice(-lookback);
  const highs = [];
  const lows = [];
  
  for (let i = 1; i < recent.length - 1; i++) {
    if (recent[i] > recent[i - 1] && recent[i] > recent[i + 1]) {
      highs.push(recent[i]);
    }
    if (recent[i] < recent[i - 1] && recent[i] < recent[i + 1]) {
      lows.push(recent[i]);
    }
  }
  
  if (highs.length < 2 || lows.length < 2) return false;
  
  // Highs should be relatively flat (resistance)
  const highVariance = Math.max(...highs) - Math.min(...highs);
  const avgHigh = highs.reduce((a, b) => a + b, 0) / highs.length;
  
  if (highVariance / avgHigh > threshold) return false;
  
  // Lows should be rising (support)
  const firstLow = lows[0];
  const lastLow = lows[lows.length - 1];
  const lowTrend = (lastLow - firstLow) / firstLow;
  
  return lowTrend > threshold;
}

/**
 * Detect descending triangle pattern
 */
export function detectDescendingTriangle(
  data: number[],
  threshold: number = 0.02,
  lookback: number = 20
): boolean {
  const recent = data.slice(-lookback);
  const highs = [];
  const lows = [];
  
  for (let i = 1; i < recent.length - 1; i++) {
    if (recent[i] > recent[i - 1] && recent[i] > recent[i + 1]) {
      highs.push(recent[i]);
    }
    if (recent[i] < recent[i - 1] && recent[i] < recent[i + 1]) {
      lows.push(recent[i]);
    }
  }
  
  if (highs.length < 2 || lows.length < 2) return false;
  
  // Lows should be relatively flat (support)
  const lowVariance = Math.max(...lows) - Math.min(...lows);
  const avgLow = lows.reduce((a, b) => a + b, 0) / lows.length;
  
  if (lowVariance / avgLow > threshold) return false;
  
  // Highs should be falling (resistance)
  const firstHigh = highs[0];
  const lastHigh = highs[highs.length - 1];
  const highTrend = (lastHigh - firstHigh) / firstHigh;
  
  return highTrend < -threshold;
}

/**
 * Detect symmetrical triangle pattern
 */
export function detectSymmetricalTriangle(
  data: number[],
  threshold: number = 0.02,
  lookback: number = 20
): boolean {
  const recent = data.slice(-lookback);
  const highs = [];
  const lows = [];
  
  for (let i = 1; i < recent.length - 1; i++) {
    if (recent[i] > recent[i - 1] && recent[i] > recent[i + 1]) {
      highs.push(recent[i]);
    }
    if (recent[i] < recent[i - 1] && recent[i] < recent[i + 1]) {
      lows.push(recent[i]);
    }
  }
  
  if (highs.length < 2 || lows.length < 2) return false;
  
  // Highs should be falling
  const firstHigh = highs[0];
  const lastHigh = highs[highs.length - 1];
  const highTrend = (lastHigh - firstHigh) / firstHigh;
  
  // Lows should be rising
  const firstLow = lows[0];
  const lastLow = lows[lows.length - 1];
  const lowTrend = (lastLow - firstLow) / firstLow;
  
  return highTrend < -threshold && lowTrend > threshold;
}

/**
 * Detect bull flag pattern
 */
export function detectBullFlag(
  data: number[],
  threshold: number = 0.02,
  lookback: number = 20
): boolean {
  const recent = data.slice(-lookback);
  
  // Check for strong uptrend (pole)
  const firstHalf = recent.slice(0, Math.floor(lookback / 2));
  const secondHalf = recent.slice(Math.floor(lookback / 2));
  
  const poleTrend = (secondHalf[secondHalf.length - 1] - firstHalf[0]) / firstHalf[0];
  if (poleTrend < threshold * 2) return false;
  
  // Check for consolidation (flag)
  const flagData = secondHalf;
  const flagVariance = Math.max(...flagData) - Math.min(...flagData);
  const flagAvg = flagData.reduce((a, b) => a + b, 0) / flagData.length;
  
  return flagVariance / flagAvg < threshold;
}

/**
 * Detect bear flag pattern
 */
export function detectBearFlag(
  data: number[],
  threshold: number = 0.02,
  lookback: number = 20
): boolean {
  const recent = data.slice(-lookback);
  
  // Check for strong downtrend (pole)
  const firstHalf = recent.slice(0, Math.floor(lookback / 2));
  const secondHalf = recent.slice(Math.floor(lookback / 2));
  
  const poleTrend = (secondHalf[secondHalf.length - 1] - firstHalf[0]) / firstHalf[0];
  if (poleTrend > -threshold * 2) return false;
  
  // Check for consolidation (flag)
  const flagData = secondHalf;
  const flagVariance = Math.max(...flagData) - Math.min(...flagData);
  const flagAvg = flagData.reduce((a, b) => a + b, 0) / flagData.length;
  
  return flagVariance / flagAvg < threshold;
}

/**
 * Detect wedge pattern (rising or falling)
 */
export function detectWedge(
  data: number[],
  threshold: number = 0.02,
  lookback: number = 20
): { type: 'rising' | 'falling'; confidence: number } | null {
  const recent = data.slice(-lookback);
  const highs = [];
  const lows = [];
  
  for (let i = 1; i < recent.length - 1; i++) {
    if (recent[i] > recent[i - 1] && recent[i] > recent[i + 1]) {
      highs.push({ value: recent[i], index: i });
    }
    if (recent[i] < recent[i - 1] && recent[i] < recent[i + 1]) {
      lows.push({ value: recent[i], index: i });
    }
  }
  
  if (highs.length < 2 || lows.length < 2) return null;
  
  // Calculate trends
  const highRegression = linearRegression(
    highs.map(h => h.index),
    highs.map(h => h.value)
  );
  const lowRegression = linearRegression(
    lows.map(l => l.index),
    lows.map(l => l.value)
  );
  
  // Rising wedge: highs rising faster than lows
  if (highRegression.slope > threshold && lowRegression.slope > 0 && highRegression.slope > lowRegression.slope) {
    return { type: 'rising', confidence: Math.min(highRegression.r2, lowRegression.r2) };
  }
  
  // Falling wedge: lows falling faster than highs
  if (highRegression.slope < -threshold && lowRegression.slope < 0 && lowRegression.slope < highRegression.slope) {
    return { type: 'falling', confidence: Math.min(highRegression.r2, lowRegression.r2) };
  }
  
  return null;
}

/**
 * Detect rectangle pattern
 */
export function detectRectangle(
  data: number[],
  threshold: number = 0.02,
  lookback: number = 20
): boolean {
  const recent = data.slice(-lookback);
  const highs = [];
  const lows = [];
  
  for (let i = 1; i < recent.length - 1; i++) {
    if (recent[i] > recent[i - 1] && recent[i] > recent[i + 1]) {
      highs.push(recent[i]);
    }
    if (recent[i] < recent[i - 1] && recent[i] < recent[i + 1]) {
      lows.push(recent[i]);
    }
  }
  
  if (highs.length < 2 || lows.length < 2) return false;
  
  // Both highs and lows should be relatively flat
  const highVariance = Math.max(...highs) - Math.min(...highs);
  const lowVariance = Math.max(...lows) - Math.min(...lows);
  const avgHigh = highs.reduce((a, b) => a + b, 0) / highs.length;
  const avgLow = lows.reduce((a, b) => a + b, 0) / lows.length;
  
  return (highVariance / avgHigh < threshold) && (lowVariance / avgLow < threshold);
}

/**
 * Detect diamond pattern
 */
export function detectDiamond(
  data: number[],
  threshold: number = 0.02,
  lookback: number = 30
): boolean {
  const recent = data.slice(-lookback);
  const midPoint = Math.floor(recent.length / 2);
  
  const firstHalf = recent.slice(0, midPoint);
  const secondHalf = recent.slice(midPoint);
  
  // First half should expand (widening)
  const firstHighs = [];
  const firstLows = [];
  for (let i = 1; i < firstHalf.length - 1; i++) {
    if (firstHalf[i] > firstHalf[i - 1] && firstHalf[i] > firstHalf[i + 1]) {
      firstHighs.push(firstHalf[i]);
    }
    if (firstHalf[i] < firstHalf[i - 1] && firstHalf[i] < firstHalf[i + 1]) {
      firstLows.push(firstHalf[i]);
    }
  }
  
  if (firstHighs.length < 2 || firstLows.length < 2) return false;
  
  const firstHighRange = Math.max(...firstHighs) - Math.min(...firstHighs);
  const firstLowRange = Math.max(...firstLows) - Math.min(...firstLows);
  
  // Second half should contract (narrowing)
  const secondHighs = [];
  const secondLows = [];
  for (let i = 1; i < secondHalf.length - 1; i++) {
    if (secondHalf[i] > secondHalf[i - 1] && secondHalf[i] > secondHalf[i + 1]) {
      secondHighs.push(secondHalf[i]);
    }
    if (secondHalf[i] < secondHalf[i - 1] && secondHalf[i] < secondHalf[i + 1]) {
      secondLows.push(secondHalf[i]);
    }
  }
  
  if (secondHighs.length < 2 || secondLows.length < 2) return false;
  
  const secondHighRange = Math.max(...secondHighs) - Math.min(...secondHighs);
  const secondLowRange = Math.max(...secondLows) - Math.min(...secondLows);
  
  return secondHighRange < firstHighRange && secondLowRange < firstLowRange;
}

/**
 * Detect cup and handle pattern
 */
export function detectCupAndHandle(
  data: number[],
  threshold: number = 0.02,
  lookback: number = 40
): boolean {
  const recent = data.slice(-lookback);
  
  // Find the lowest point (bottom of cup)
  const minIndex = recent.indexOf(Math.min(...recent));
  const minPoint = recent[minIndex];
  
  // Cup should be rounded (gradual decline and rise)
  const leftSide = recent.slice(0, minIndex);
  const rightSide = recent.slice(minIndex);
  
  if (leftSide.length < 5 || rightSide.length < 5) return false;
  
  // Left side should decline
  const leftTrend = (leftSide[leftSide.length - 1] - leftSide[0]) / leftSide[0];
  // Right side should rise
  const rightTrend = (rightSide[rightSide.length - 1] - rightSide[0]) / rightSide[0];
  
  if (leftTrend > -threshold || rightTrend < threshold) return false;
  
  // Handle should be small consolidation after cup
  const handleData = rightSide.slice(-Math.floor(rightSide.length / 3));
  const handleVariance = Math.max(...handleData) - Math.min(...handleData);
  const handleAvg = handleData.reduce((a, b) => a + b, 0) / handleData.length;
  
  return handleVariance / handleAvg < threshold;
}

/**
 * Detect all patterns and return results
 */
export function detectAllPatterns(
  data: number[],
  threshold: number = 0.02,
  lookback: number = 20
): Array<{ pattern: PatternType; confidence: number }> {
  const results: Array<{ pattern: PatternType; confidence: number }> = [];
  
  if (detectDoubleTop(data, threshold, lookback)) {
    results.push({ pattern: 'double_top', confidence: 0.75 });
  }
  if (detectDoubleBottom(data, threshold, lookback)) {
    results.push({ pattern: 'double_bottom', confidence: 0.75 });
  }
  if (detectHeadAndShoulders(data, threshold, lookback)) {
    results.push({ pattern: 'head_and_shoulders', confidence: 0.8 });
  }
  if (detectInverseHeadAndShoulders(data, threshold, lookback)) {
    results.push({ pattern: 'inverse_head_and_shoulders', confidence: 0.8 });
  }
  if (detectAscendingTriangle(data, threshold, lookback)) {
    results.push({ pattern: 'ascending_triangle', confidence: 0.7 });
  }
  if (detectDescendingTriangle(data, threshold, lookback)) {
    results.push({ pattern: 'descending_triangle', confidence: 0.7 });
  }
  if (detectSymmetricalTriangle(data, threshold, lookback)) {
    results.push({ pattern: 'symmetrical_triangle', confidence: 0.7 });
  }
  if (detectBullFlag(data, threshold, lookback)) {
    results.push({ pattern: 'bull_flag', confidence: 0.75 });
  }
  if (detectBearFlag(data, threshold, lookback)) {
    results.push({ pattern: 'bear_flag', confidence: 0.75 });
  }
  
  const wedge = detectWedge(data, threshold, lookback);
  if (wedge) {
    results.push({ pattern: 'wedge', confidence: wedge.confidence });
  }
  
  if (detectRectangle(data, threshold, lookback)) {
    results.push({ pattern: 'rectangle', confidence: 0.65 });
  }
  if (detectDiamond(data, threshold, lookback)) {
    results.push({ pattern: 'diamond', confidence: 0.7 });
  }
  if (detectCupAndHandle(data, threshold, lookback)) {
    results.push({ pattern: 'cup_and_handle', confidence: 0.75 });
  }
  
  return results;
}
