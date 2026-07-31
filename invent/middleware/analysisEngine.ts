/**
 * Analysis Engine - Custom business logic for inventions
 * 
 * Provides invention-specific analysis capabilities that operate
 * on transformed data without touching the main system.
 */

import { NormalizedRound, NormalizedAnalysis } from './transformProcessor';

interface PatternMatch {
  pattern: string;
  confidence: number;
  description: string;
  occurrences: number;
}

interface AnomalyDetection {
  timestamp: Date;
  crashPoint: number;
  severity: 'low' | 'medium' | 'high';
  reason: string;
}

interface PredictionResult {
  predictedRange: { min: number; max: number };
  confidence: number;
  factors: string[];
  timestamp: Date;
}

class AnalysisEngine {
  /**
   * Detect patterns in round sequence
   */
  detectPatterns(rounds: NormalizedRound[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    if (rounds.length < 10) return patterns;

    // Pattern: Alternating low/high
    const alternatingCount = this.countAlternatingPattern(rounds);
    if (alternatingCount > rounds.length * 0.6) {
      patterns.push({
        pattern: 'alternating',
        confidence: alternatingCount / rounds.length,
        description: 'Rounds are alternating between low and high crash points',
        occurrences: alternatingCount
      });
    }

    // Pattern: Streak detection
    const streaks = this.detectStreaks(rounds);
    if (streaks.maxStreak >= 5) {
      patterns.push({
        pattern: 'streak',
        confidence: Math.min(streaks.maxStreak / 10, 0.9),
        description: `Detected streak of ${streaks.maxStreak} consecutive ${streaks.streakType} rounds`,
        occurrences: streaks.totalStreaks
      });
    }

    // Pattern: Time-based patterns
    const timePattern = this.detectTimePatterns(rounds);
    if (timePattern.confidence > 0.6) {
      patterns.push({
        pattern: 'time_based',
        confidence: timePattern.confidence,
        description: timePattern.description,
        occurrences: timePattern.occurrences
      });
    }

    return patterns;
  }

  /**
   * Detect anomalies in crash data
   */
  detectAnomalies(rounds: NormalizedRound[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    
    if (rounds.length < 20) return anomalies;

    const crashPoints = rounds.map(r => r.crashPoint);
    const mean = crashPoints.reduce((sum, val) => sum + val, 0) / crashPoints.length;
    const stdDev = Math.sqrt(
      crashPoints.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / crashPoints.length
    );

    rounds.forEach(round => {
      const zScore = Math.abs((round.crashPoint - mean) / stdDev);
      
      if (zScore > 3) {
        anomalies.push({
          timestamp: round.timestamp,
          crashPoint: round.crashPoint,
          severity: 'high',
          reason: `Crash point ${round.crashPoint.toFixed(2)} is ${zScore.toFixed(1)} standard deviations from mean`
        });
      } else if (zScore > 2) {
        anomalies.push({
          timestamp: round.timestamp,
          crashPoint: round.crashPoint,
          severity: 'medium',
          reason: `Crash point ${round.crashPoint.toFixed(2)} is ${zScore.toFixed(1)} standard deviations from mean`
        });
      }
    });

    return anomalies.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Generate prediction based on historical patterns
   */
  generatePrediction(rounds: NormalizedRound[], analysis: NormalizedAnalysis | null): PredictionResult {
    if (rounds.length < 10) {
      return {
        predictedRange: { min: 1.0, max: 10.0 },
        confidence: 0.3,
        factors: ['Insufficient data'],
        timestamp: new Date()
      };
    }

    const recentRounds = rounds.slice(0, 20);
    const avgCrash = recentRounds.reduce((sum, r) => sum + r.crashPoint, 0) / recentRounds.length;
    const minCrash = Math.min(...recentRounds.map(r => r.crashPoint));
    const maxCrash = Math.max(...recentRounds.map(r => r.crashPoint));
    
    // Calculate volatility
    const variance = recentRounds.reduce((sum, r) => sum + Math.pow(r.crashPoint - avgCrash, 2), 0) / recentRounds.length;
    const volatility = Math.sqrt(variance);
    
    // Factors influencing prediction
    const factors: string[] = [];
    if (analysis?.trend === 'up') factors.push('Upward trend detected');
    if (analysis?.trend === 'down') factors.push('Downward trend detected');
    if (volatility > 2) factors.push('High volatility');
    if (volatility < 0.5) factors.push('Low volatility');
    
    const confidence = Math.min(0.5 + (recentRounds.length / 100), 0.85);
    
    return {
      predictedRange: {
        min: Math.max(1.0, avgCrash - volatility),
        max: avgCrash + volatility * 2
      },
      confidence,
      factors,
      timestamp: new Date()
    };
  }

  /**
   * Calculate risk score for current conditions
   */
  calculateRiskScore(rounds: NormalizedRound[]): number {
    if (rounds.length < 10) return 0.5;

    const recentRounds = rounds.slice(0, 10);
    const avgCrash = recentRounds.reduce((sum, r) => sum + r.crashPoint, 0) / recentRounds.length;
    const lowCount = recentRounds.filter(r => r.crashPoint < 1.5).length;
    
    // Higher risk if many low crashes recently
    const lowCrashRatio = lowCount / recentRounds.length;
    const riskScore = 0.3 + (lowCrashRatio * 0.5) + ((avgCrash < 2) ? 0.2 : 0);
    
    return Math.min(Math.max(riskScore, 0), 1);
  }

  /**
   * Helper: Count alternating pattern
   */
  private countAlternatingPattern(rounds: NormalizedRound[]): number {
    let count = 0;
    for (let i = 1; i < rounds.length; i++) {
      const prevLow = rounds[i - 1].crashPoint < 2;
      const currLow = rounds[i].crashPoint < 2;
      if (prevLow !== currLow) count++;
    }
    return count;
  }

  /**
   * Helper: Detect streaks
   */
  private detectStreaks(rounds: NormalizedRound[]): { maxStreak: number; streakType: string; totalStreaks: number } {
    let maxStreak = 0;
    let currentStreak = 0;
    let streakType = '';
    let totalStreaks = 0;
    let currentType = '';

    for (let i = 0; i < rounds.length; i++) {
      const type = rounds[i].magnitude;
      
      if (type === currentType) {
        currentStreak++;
      } else {
        if (currentStreak >= 3) {
          totalStreaks++;
          if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
            streakType = currentType;
          }
        }
        currentStreak = 1;
        currentType = type;
      }
    }

    return { maxStreak, streakType, totalStreaks };
  }

  /**
   * Helper: Detect time-based patterns
   */
  private detectTimePatterns(rounds: NormalizedRound[]): { confidence: number; description: string; occurrences: number } {
    const hourlyData = new Map<number, number>();
    
    rounds.forEach(round => {
      const hour = round.hour;
      const count = hourlyData.get(hour) || 0;
      hourlyData.set(hour, count + 1);
    });

    const maxCount = Math.max(...hourlyData.values());
    const totalCount = rounds.length;
    const peakHour = [...hourlyData.entries()].find(([_, count]) => count === maxCount)?.[0];

    if (maxCount / totalCount > 0.3) {
      return {
        confidence: maxCount / totalCount,
        description: `Peak activity at hour ${peakHour} (${maxCount} rounds)`,
        occurrences: maxCount
      };
    }

    return { confidence: 0, description: '', occurrences: 0 };
  }
}

export const analysisEngine = new AnalysisEngine();
export type { PatternMatch, AnomalyDetection, PredictionResult };
