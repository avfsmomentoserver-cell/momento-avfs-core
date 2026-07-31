/**
 * MomentoFX v2.0 Utilities
 * 
 * Pure functions for analytics, data processing, and pattern recognition
 */

export {
  movingAverage,
  exponentialMovingAverage,
  rsi,
  bollingerBands,
  macd,
  atr,
  volatility,
  trendDirection,
  trendStrength,
  calculatePressureScore,
  normalize,
  percentile,
  detectPeaks,
  detectTroughs,
  correlation,
  linearRegression,
} from './analytics';

export {
  aggregateCandles,
  resampleData,
  fillMissingData,
  calculateReturns,
  calculateLogReturns,
  calculateCumulativeReturns,
  calculateDrawdown,
  calculateMaxDrawdown,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateCalmarRatio,
  calculateVaR,
  calculateExpectedShortfall,
  calculateWinRate,
  calculateProfitFactor,
  calculateAverageWinLossRatio,
  smoothData,
  detectOutliers,
  removeOutliers,
  normalizeData,
  standardizeData,
  rollingStats,
} from './dataProcessing';

export {
  detectDoubleTop,
  detectDoubleBottom,
  detectHeadAndShoulders,
  detectInverseHeadAndShoulders,
  detectAscendingTriangle,
  detectDescendingTriangle,
  detectSymmetricalTriangle,
  detectBullFlag,
  detectBearFlag,
  detectWedge,
  detectRectangle,
  detectDiamond,
  detectCupAndHandle,
  detectAllPatterns,
} from './patternRecognition';

export {
  kaplanMeierEstimate,
  nelsonAalenCumulativeHazard,
  hazardToSurvival,
  medianSurvivalTime,
  meanSurvivalTime,
  fitExponentialDistribution,
  fitWeibullDistribution,
  weibullSurvival,
  weibullHazard,
  predictCrashPoint,
  calculateETA,
  generateSurvivalCurve,
  crashProbabilityAtMultiplier,
  calculateRiskScore,
  updateSurvivalEstimate,
  bootstrapSurvivalCI,
} from './survivalAnalysis';
