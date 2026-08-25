/**
 * Sequence Angle Analyzer
 * 
 * Analyzes multiplier sequences to determine angle using rate of change patterns
 * and predicts forward market structure
 */

import { dataIngester } from './dataIngester';
import type {
  SequenceAngleAnalysis,
  SequencePattern,
  SequenceAnalysisError
} from './megaplan-types';

class SequenceAngleAnalyzer {
  private analysisWindow: number;

  constructor(analysisWindow: number = 300) {
    this.analysisWindow = analysisWindow;
  }

  /**
   * Calculate rate of change between consecutive elements
   */
  private calculateRatesOfChange(sequence: number[]): number[] {
    const ratesOfChange: number[] = [];
    
    for (let i = 1; i < sequence.length; i++) {
      const change = (sequence[i] - sequence[i - 1]) / sequence[i - 1];
      ratesOfChange.push(change);
    }
    
    return ratesOfChange;
  }

  /**
   * Calculate acceleration (change in rate of change)
   */
  private calculateAcceleration(ratesOfChange: number[]): number[] {
    const acceleration: number[] = [];
    
    for (let i = 1; i < ratesOfChange.length; i++) {
      acceleration.push(ratesOfChange[i] - ratesOfChange[i - 1]);
    }
    
    return acceleration;
  }

  /**
   * Calculate linear regression for angle determination
   */
  private linearRegression(x: number[], y: number[]): {
    slope: number;
    intercept: number;
    r2: number;
  } {
    const n = Math.min(x.length, y.length);
    if (n < 2) {
      return { slope: 0, intercept: 0, r2: 0 };
    }

    const sumX = x.slice(0, n).reduce((sum, val) => sum + val, 0);
    const sumY = y.slice(0, n).reduce((sum, val) => sum + val, 0);
    const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) {
      return { slope: 0, intercept: 0, r2: 0 };
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R² for goodness of fit
    const yMean = sumY / n;
    const ssTotal = y.slice(0, n).reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.slice(0, n).reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);

    const r2 = ssTotal === 0 ? 1 : 1 - ssResidual / ssTotal;

    return { slope, intercept, r2 };
  }

  /**
   * Calculate sequence angle from multiplier sequence
   */
  private calculateSequenceAngle(sequence: number[]): number {
    if (sequence.length < 2) return 0;

    // Use log-transformed data for better angle calculation
    const logSequence = sequence.map(x => Math.log(x));
    const xValues = Array.from({ length: sequence.length }, (_, i) => i);

    const regression = this.linearRegression(xValues, logSequence);
    
    // Convert slope to angle in degrees
    const angle = Math.atan(regression.slope) * (180 / Math.PI);
    
    return angle;
  }

  /**
   * Determine direction from angle and rate of change
   */
  private determineDirection(
    angle: number,
    ratesOfChange: number[]
  ): 'upward' | 'downward' | 'sideways' {
    const avgRateOfChange = ratesOfChange.length > 0
      ? ratesOfChange.reduce((sum, val) => sum + val, 0) / ratesOfChange.length
      : 0;

    // Combine angle and rate of change for direction determination
    if (Math.abs(angle) < 5 && Math.abs(avgRateOfChange) < 0.1) {
      return 'sideways';
    } else if (angle > 0 || avgRateOfChange > 0) {
      return 'upward';
    } else {
      return 'downward';
    }
  }

  /**
   * Detect sequence pattern type
   */
  private detectSequencePattern(sequence: number[]): SequencePattern {
    if (sequence.length < 3) {
      return {
        type: 'irregular',
        growth_rate: 0,
        consistency: 0,
        description: 'Insufficient data for pattern detection'
      };
    }

    const ratesOfChange = this.calculateRatesOfChange(sequence);
    const avgRateOfChange = ratesOfChange.reduce((sum, val) => sum + val, 0) / ratesOfChange.length;
    
    // Check for geometric progression (constant ratio)
    const ratios = [];
    for (let i = 1; i < sequence.length; i++) {
      ratios.push(sequence[i] / sequence[i - 1]);
    }
    
    const ratioVariance = this.calculateVariance(ratios);
    const avgRatio = ratios.reduce((sum, val) => sum + val, 0) / ratios.length;
    
    // Check for arithmetic progression (constant difference)
    const differences = [];
    for (let i = 1; i < sequence.length; i++) {
      differences.push(sequence[i] - sequence[i - 1]);
    }
    
    const diffVariance = this.calculateVariance(differences);
    const avgDiff = differences.reduce((sum, val) => sum + val, 0) / differences.length;

    // Determine pattern type
    let patternType: SequencePattern['type'] = 'irregular';
    let consistency = 0;
    let growthRate = avgRateOfChange;

    if (ratioVariance < 0.1) {
      patternType = 'geometric';
      consistency = 1 - ratioVariance;
      growthRate = avgRatio - 1;
    } else if (diffVariance < 0.5) {
      patternType = 'arithmetic';
      consistency = 1 - (diffVariance / 0.5);
      growthRate = avgDiff / sequence[0];
    } else if (avgRateOfChange > 0.5) {
      patternType = 'exponential';
      consistency = Math.min(avgRateOfChange, 0.8);
    }

    const description = this.generatePatternDescription(patternType, growthRate, consistency);

    return {
      type: patternType,
      growth_rate: growthRate,
      consistency,
      description
    };
  }

  /**
   * Calculate variance of array
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return variance;
  }

  /**
   * Generate pattern description
   */
  private generatePatternDescription(
    type: SequencePattern['type'],
    growthRate: number,
    consistency: number
  ): string {
    const growthDirection = growthRate > 0 ? 'increasing' : 'decreasing';
    const growthMagnitude = Math.abs(growthRate);
    
    switch (type) {
      case 'geometric':
        return `Geometric progression with ${growthDirection} ratio (${(growthRate * 100).toFixed(1)}%), consistency: ${(consistency * 100).toFixed(0)}%`;
      case 'arithmetic':
        return `Arithmetic progression with ${growthDirection} difference, consistency: ${(consistency * 100).toFixed(0)}%`;
      case 'exponential':
        return `Exponential ${growthDirection} pattern, growth rate: ${(growthMagnitude * 100).toFixed(1)}%`;
      default:
        return `Irregular pattern with ${growthDirection} trend`;
    }
  }

  /**
   * Predict forward market structure based on sequence analysis
   */
  private predictForwardStructure(
    sequence: number[],
    pattern: SequencePattern,
    direction: 'upward' | 'downward' | 'sideways'
  ): number[] {
    const predictedSequence: number[] = [];
    const lastValue = sequence[sequence.length - 1];
    const predictionLength = 5; // Predict next 5 values

    for (let i = 1; i <= predictionLength; i++) {
      let predictedValue: number;
      
      switch (pattern.type) {
        case 'geometric':
          predictedValue = lastValue * Math.pow(1 + pattern.growth_rate, i);
          break;
        case 'arithmetic':
          predictedValue = lastValue + (pattern.growth_rate * lastValue * i);
          break;
        case 'exponential':
          predictedValue = lastValue * Math.exp(pattern.growth_rate * i);
          break;
        default:
          // Use simple trend extrapolation for irregular patterns
          const trendFactor = direction === 'upward' ? 1.1 : direction === 'downward' ? 0.9 : 1.0;
          predictedValue = lastValue * Math.pow(trendFactor, i);
      }
      
      predictedSequence.push(Math.max(1.0, predictedValue)); // Ensure minimum value of 1.0
    }

    return predictedSequence;
  }

  /**
   * Calculate target range based on sequence analysis
   */
  private calculateTargetRange(
    sequence: number[],
    predictedSequence: number[],
    direction: 'upward' | 'downward' | 'sideways'
  ): { min: number; max: number } {
    const recentValues = sequence.slice(-10);
    const allValues = [...recentValues, ...predictedSequence];
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    
    // Add some buffer based on volatility
    const volatility = this.calculateVariance(recentValues);
    const buffer = Math.sqrt(volatility) * 0.5;
    
    return {
      min: Math.max(1.0, min - buffer),
      max: max + buffer
    };
  }

  /**
   * Calculate confidence score for the analysis
   */
  private calculateConfidence(
    pattern: SequencePattern,
    r2: number,
    sequenceLength: number
  ): number {
    // Base confidence from pattern consistency
    let confidence = pattern.consistency * 0.5;
    
    // Add confidence from regression fit
    confidence += r2 * 0.3;
    
    // Add confidence from sequence length (more data = more confidence)
    const lengthFactor = Math.min(sequenceLength / 100, 1.0) * 0.2;
    confidence += lengthFactor;
    
    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Main analysis method
   */
  async analyzeSequence(source: string): Promise<SequenceAngleAnalysis> {
    try {
      const rounds = await dataIngester.getRounds(source, this.analysisWindow);
      
      if (rounds.length < 5) {
        throw new SequenceAnalysisError(
          'Insufficient data for sequence analysis',
          { roundCount: rounds.length }
        );
      }

      const sequence = rounds.map(r => r.multiplier);
      
      // Calculate rate of change and acceleration
      const ratesOfChange = this.calculateRatesOfChange(sequence);
      const acceleration = this.calculateAcceleration(ratesOfChange);
      
      // Calculate sequence angle
      const angle = this.calculateSequenceAngle(sequence);
      
      // Determine direction
      const direction = this.determineDirection(angle, ratesOfChange);
      
      // Detect pattern
      const pattern = this.detectSequencePattern(sequence);
      
      // Predict forward structure
      const predictedSequence = this.predictForwardStructure(sequence, pattern, direction);
      
      // Calculate target range
      const targetRange = this.calculateTargetRange(sequence, predictedSequence, direction);
      
      // Calculate regression for confidence
      const xValues = Array.from({ length: sequence.length }, (_, i) => i);
      const logSequence = sequence.map(x => Math.log(x));
      const regression = this.linearRegression(xValues, logSequence);
      
      // Calculate overall confidence
      const confidence = this.calculateConfidence(pattern, regression.r2, sequence.length);

      return {
        sequence,
        angle,
        rate_of_change: ratesOfChange,
        acceleration,
        direction,
        target_range: targetRange,
        confidence,
        predicted_sequence: predictedSequence
      };
    } catch (error) {
      if (error instanceof SequenceAnalysisError) {
        throw error;
      }
      throw new SequenceAnalysisError(
        `Failed to analyze sequence: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { source }
      );
    }
  }

  /**
   * Analyze specific sequence (for testing or custom sequences)
   */
  analyzeCustomSequence(sequence: number[]): SequenceAngleAnalysis {
    if (sequence.length < 2) {
      throw new SequenceAnalysisError(
        'Sequence must have at least 2 elements',
        { sequenceLength: sequence.length }
      );
    }

    const ratesOfChange = this.calculateRatesOfChange(sequence);
    const acceleration = this.calculateAcceleration(ratesOfChange);
    const angle = this.calculateSequenceAngle(sequence);
    const direction = this.determineDirection(angle, ratesOfChange);
    const pattern = this.detectSequencePattern(sequence);
    const predictedSequence = this.predictForwardStructure(sequence, pattern, direction);
    const targetRange = this.calculateTargetRange(sequence, predictedSequence, direction);
    
    const xValues = Array.from({ length: sequence.length }, (_, i) => i);
    const logSequence = sequence.map(x => Math.log(x));
    const regression = this.linearRegression(xValues, logSequence);
    const confidence = this.calculateConfidence(pattern, regression.r2, sequence.length);

    return {
      sequence,
      angle,
      rate_of_change: ratesOfChange,
      acceleration,
      direction,
      target_range: targetRange,
      confidence,
      predicted_sequence: predictedSequence
    };
  }

  /**
   * Update analysis window
   */
  setAnalysisWindow(window: number): void {
    this.analysisWindow = window;
  }

  /**
   * Get current analysis window
   */
  getAnalysisWindow(): number {
    return this.analysisWindow;
  }
}

export const sequenceAngleAnalyzer = new SequenceAngleAnalyzer();
export type { SequenceAngleAnalysis, SequencePattern };