/**
 * Survival Analysis Utilities
 * 
 * Pure functions for survival analysis and ETA forecasting
 * No side effects, no external dependencies
 */

/**
 * Calculate Kaplan-Meier survival estimate
 */
export function kaplanMeierEstimate(
  times: number[],
  events: boolean[]
): Array<{ time: number; survival: number }> {
  const combined = times.map((time, i) => ({ time, event: events[i] }));
  combined.sort((a, b) => a.time - b.time);
  
  const result: Array<{ time: number; survival: number }> = [];
  let survival = 1.0;
  let atRisk = times.length;
  
  let i = 0;
  while (i < combined.length) {
    const currentTime = combined[i].time;
    let eventsAtTime = 0;
    
    while (i < combined.length && combined[i].time === currentTime) {
      if (combined[i].event) eventsAtTime++;
      i++;
    }
    
    const censoredAtTime = i - (result.length > 0 ? result[result.length - 1].index || 0 : 0) - eventsAtTime;
    atRisk -= censoredAtTime;
    
    if (eventsAtTime > 0 && atRisk > 0) {
      survival *= (atRisk - eventsAtTime) / atRisk;
      result.push({ time: currentTime, survival, index: i });
    }
    
    atRisk -= eventsAtTime;
  }
  
  return result;
}

/**
 * Calculate Nelson-Aalen cumulative hazard
 */
export function nelsonAalenCumulativeHazard(
  times: number[],
  events: boolean[]
): Array<{ time: number; hazard: number }> {
  const combined = times.map((time, i) => ({ time, event: events[i] }));
  combined.sort((a, b) => a.time - b.time);
  
  const result: Array<{ time: number; hazard: number }> = [];
  let cumulativeHazard = 0.0;
  let atRisk = times.length;
  
  let i = 0;
  while (i < combined.length) {
    const currentTime = combined[i].time;
    let eventsAtTime = 0;
    
    while (i < combined.length && combined[i].time === currentTime) {
      if (combined[i].event) eventsAtTime++;
      i++;
    }
    
    const censoredAtTime = i - (result.length > 0 ? result[result.length - 1].index || 0 : 0) - eventsAtTime;
    atRisk -= censoredAtTime;
    
    if (eventsAtTime > 0 && atRisk > 0) {
      cumulativeHazard += eventsAtTime / atRisk;
      result.push({ time: currentTime, hazard: cumulativeHazard, index: i });
    }
    
    atRisk -= eventsAtTime;
  }
  
  return result;
}

/**
 * Estimate survival function from cumulative hazard
 */
export function hazardToSurvival(hazard: number): number {
  return Math.exp(-hazard);
}

/**
 * Calculate median survival time
 */
export function medianSurvivalTime(survivalCurve: Array<{ time: number; survival: number }>): number | null {
  for (let i = 0; i < survivalCurve.length; i++) {
    if (survivalCurve[i].survival <= 0.5) {
      return survivalCurve[i].time;
    }
  }
  return null;
}

/**
 * Calculate mean survival time (restricted)
 */
export function meanSurvivalTime(
  survivalCurve: Array<{ time: number; survival: number }>,
  maxTime: number
): number {
  let area = 0;
  
  for (let i = 0; i < survivalCurve.length - 1; i++) {
    const current = survivalCurve[i];
    const next = survivalCurve[i + 1];
    const timeDiff = next.time - current.time;
    area += timeDiff * (current.survival + next.survival) / 2;
  }
  
  // Add area from last point to maxTime
  if (survivalCurve.length > 0) {
    const last = survivalCurve[survivalCurve.length - 1];
    if (last.time < maxTime) {
      area += (maxTime - last.time) * last.survival;
    }
  }
  
  return area;
}

/**
 * Fit exponential distribution to survival data
 */
export function fitExponentialDistribution(
  times: number[],
  events: boolean[]
): { rate: number; mean: number } {
  const totalEventTime = times.reduce((sum, time, i) => {
    return sum + (events[i] ? time : 0);
  }, 0);
  
  const totalCensoredTime = times.reduce((sum, time, i) => {
    return sum + (!events[i] ? time : 0);
  }, 0);
  
  const numberOfEvents = events.filter(e => e).length;
  const rate = numberOfEvents / (totalEventTime + totalCensoredTime);
  const mean = 1 / rate;
  
  return { rate, mean };
}

/**
 * Fit Weibull distribution to survival data
 */
export function fitWeibullDistribution(
  times: number[],
  events: boolean[]
): { shape: number; scale: number } {
  // Simplified Weibull parameter estimation using method of moments
  const eventTimes = times.filter((_, i) => events[i]);
  
  if (eventTimes.length < 2) {
    return { shape: 1.0, scale: Math.mean(times) || 1.0 };
  }
  
  const mean = eventTimes.reduce((a, b) => a + b, 0) / eventTimes.length;
  const variance = eventTimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / eventTimes.length;
  const stdDev = Math.sqrt(variance);
  
  // Estimate shape parameter from coefficient of variation
  const cv = stdDev / mean;
  const shape = 1.2 / (cv + 0.001); // Approximation
  
  // Estimate scale parameter
  const scale = mean / Math.gamma(1 + 1 / shape);
  
  return { shape, scale };
}

/**
 * Calculate Weibull survival function
 */
export function weibullSurvival(time: number, shape: number, scale: number): number {
  return Math.exp(-Math.pow(time / scale, shape));
}

/**
 * Calculate Weibull hazard function
 */
export function weibullHazard(time: number, shape: number, scale: number): number {
  if (time <= 0) return 0;
  return (shape / scale) * Math.pow(time / scale, shape - 1);
}

/**
 * Predict crash point using survival analysis
 */
export function predictCrashPoint(
  historicalCrashPoints: number[],
  confidenceLevel: number = 0.95
): {
  predicted: number;
  confidenceInterval: [number, number];
  probabilityDistribution: Array<{ crashPoint: number; probability: number }>;
} {
  if (historicalCrashPoints.length === 0) {
    return {
      predicted: 1.0,
      confidenceInterval: [1.0, 10.0],
      probabilityDistribution: [],
    };
  }
  
  // Calculate empirical distribution
  const sorted = [...historicalCrashPoints].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const variance = sorted.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / sorted.length;
  const stdDev = Math.sqrt(variance);
  
  // Generate probability distribution
  const probabilityDistribution: Array<{ crashPoint: number; probability: number }> = [];
  const bins = 20;
  const min = Math.min(...sorted);
  const max = Math.max(...sorted);
  const binSize = (max - min) / bins;
  
  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binSize;
    const binEnd = binStart + binSize;
    const count = sorted.filter(x => x >= binStart && x < binEnd).length;
    probabilityDistribution.push({
      crashPoint: binStart + binSize / 2,
      probability: count / sorted.length,
    });
  }
  
  // Calculate confidence interval
  const zScore = 1.96; // For 95% confidence
  const marginOfError = zScore * stdDev / Math.sqrt(sorted.length);
  
  return {
    predicted: mean,
    confidenceInterval: [
      Math.max(1.0, mean - marginOfError),
      mean + marginOfError,
    ],
    probabilityDistribution,
  };
}

/**
 * Calculate ETA (Estimated Time of Arrival) for crash
 */
export function calculateETA(
  currentMultiplier: number,
  predictedCrashPoint: number,
  growthRate: number = 0.1
): {
  etaSeconds: number;
  uncertainty: number;
} {
  if (predictedCrashPoint <= currentMultiplier) {
    return { etaSeconds: 0, uncertainty: 1.0 };
  }
  
  // Exponential growth model: multiplier = current * e^(rate * time)
  // Solve for time: time = ln(predicted / current) / rate
  const etaSeconds = Math.log(predictedCrashPoint / currentMultiplier) / growthRate;
  
  // Uncertainty increases with prediction horizon
  const uncertainty = Math.min(1.0, etaSeconds / 60); // Max uncertainty at 60 seconds
  
  return { etaSeconds, uncertainty };
}

/**
 * Generate survival curve for ETA forecasting
 */
export function generateSurvivalCurve(
  predictedCrashPoint: number,
  currentMultiplier: number,
  growthRate: number = 0.1,
  maxTime: number = 60
): Array<{ time: number; survivalProbability: number }> {
  const curve: Array<{ time: number; survivalProbability: number }> = [];
  
  for (let t = 0; t <= maxTime; t += 5) {
    const expectedMultiplier = currentMultiplier * Math.exp(growthRate * t);
    const survivalProbability = expectedMultiplier < predictedCrashPoint ? 1.0 : 0.0;
    
    // Smooth transition using sigmoid
    const transitionWidth = 10;
    const center = Math.log(predictedCrashPoint / currentMultiplier) / growthRate;
    const smoothedSurvival = 1 / (1 + Math.exp((t - center) / transitionWidth));
    
    curve.push({ time: t, survivalProbability: smoothedSurvival });
  }
  
  return curve;
}

/**
 * Calculate probability of crash at specific multiplier
 */
export function crashProbabilityAtMultiplier(
  multiplier: number,
  historicalCrashPoints: number[]
): number {
  if (historicalCrashPoints.length === 0) return 0.5;
  
  // Count how many historical crashes occurred at or below this multiplier
  const crashesAtOrBelow = historicalCrashPoints.filter(x => x <= multiplier).length;
  
  return crashesAtOrBelow / historicalCrashPoints.length;
}

/**
 * Calculate risk score based on current conditions
 */
export function calculateRiskScore(
  currentMultiplier: number,
  pressure: number,
  volatility: number,
  timeSinceLastCrash: number
): number {
  // Normalize inputs to 0-1 range
  const normalizedMultiplier = Math.min(1.0, currentMultiplier / 10);
  const normalizedPressure = pressure;
  const normalizedVolatility = Math.min(1.0, volatility / 2);
  const normalizedTime = Math.min(1.0, timeSinceLastCrash / 300); // 5 minutes
  
  // Weighted risk score
  const riskScore =
    normalizedMultiplier * 0.3 +
    normalizedPressure * 0.3 +
    normalizedVolatility * 0.2 +
    normalizedTime * 0.2;
  
  return Math.min(1.0, riskScore);
}

/**
 * Update survival estimate with new data
 */
export function updateSurvivalEstimate(
  currentEstimate: {
    predicted_crash_point: number;
    confidence: number;
  },
  newCrashPoint: number,
  learningRate: number = 0.1
): {
  predicted_crash_point: number;
  confidence: number;
} {
  // Update predicted crash point using exponential moving average
  const updatedPredicted =
    currentEstimate.predicted_crash_point * (1 - learningRate) +
    newCrashPoint * learningRate;
  
  // Update confidence based on prediction accuracy
  const predictionError = Math.abs(newCrashPoint - currentEstimate.predicted_crash_point);
  const errorRatio = predictionError / currentEstimate.predicted_crash_point;
  const confidenceAdjustment = errorRatio < 0.2 ? 0.05 : -0.05;
  
  const updatedConfidence = Math.min(
    1.0,
    Math.max(0.5, currentEstimate.confidence + confidenceAdjustment)
  );
  
  return {
    predicted_crash_point: updatedPredicted,
    confidence: updatedConfidence,
  };
}

/**
 * Bootstrap confidence interval for survival estimate
 */
export function bootstrapSurvivalCI(
  crashPoints: number[],
  nBootstrap: number = 1000,
  confidenceLevel: number = 0.95
): {
  lower: number;
  upper: number;
  median: number;
} {
  if (crashPoints.length === 0) {
    return { lower: 1.0, upper: 10.0, median: 1.0 };
  }
  
  const bootstrappedMedians: number[] = [];
  
  for (let i = 0; i < nBootstrap; i++) {
    // Resample with replacement
    const sample: number[] = [];
    for (let j = 0; j < crashPoints.length; j++) {
      const randomIndex = Math.floor(Math.random() * crashPoints.length);
      sample.push(crashPoints[randomIndex]);
    }
    
    // Calculate median of sample
    const sorted = [...sample].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    bootstrappedMedians.push(median);
  }
  
  bootstrappedMedians.sort((a, b) => a - b);
  
  const alpha = 1 - confidenceLevel;
  const lowerIndex = Math.floor((alpha / 2) * nBootstrap);
  const upperIndex = Math.floor((1 - alpha / 2) * nBootstrap);
  
  return {
    lower: bootstrappedMedians[Math.max(0, lowerIndex)],
    upper: bootstrappedMedians[Math.min(nBootstrap - 1, upperIndex)],
    median: bootstrappedMedians[Math.floor(nBootstrap / 2)],
  };
}
