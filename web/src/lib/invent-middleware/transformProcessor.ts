/**
 * Transform Processor - Data normalization and enrichment
 * 
 * Transforms raw data from main system into normalized schemas
 * suitable for invention-specific analysis and visualization.
 */

import { Round, Analysis } from './dataIngester';

interface NormalizedRound {
  id: string;
  crashPoint: number;
  timestamp: Date;
  source: string;
  hour: number;
  dayOfWeek: number;
  isWeekend: boolean;
  magnitude: 'low' | 'medium' | 'high' | 'extreme';
}

interface NormalizedAnalysis {
  source: string;
  avgCrash: number;
  medianCrash: number;
  volatility: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
}

class TransformProcessor {
  /**
   * Normalize round data
   */
  normalizeRounds(rounds: Round[]): NormalizedRound[] {
    return rounds.map(round => {
      const timestamp = new Date(round.timestamp);
      const hour = timestamp.getHours();
      const dayOfWeek = timestamp.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Classify crash magnitude
      let magnitude: NormalizedRound['magnitude'];
      if (round.crash_point < 1.5) magnitude = 'low';
      else if (round.crash_point < 3) magnitude = 'medium';
      else if (round.crash_point < 10) magnitude = 'high';
      else magnitude = 'extreme';

      return {
        id: round.id,
        crashPoint: round.crash_point,
        timestamp,
        source: round.source,
        hour,
        dayOfWeek,
        isWeekend,
        magnitude
      };
    });
  }

  /**
   * Normalize analysis data
   */
  normalizeAnalysis(analysis: Analysis | null): NormalizedAnalysis | null {
    if (!analysis) return null;

    // Extract key metrics from analysis
    const ladders = analysis.ladders || [];
    const avgCrash = this.calculateAverage(ladders);
    const medianCrash = this.calculateMedian(ladders);
    const volatility = this.calculateVolatility(ladders);
    const trend = this.calculateTrend(ladders);
    
    return {
      source: analysis.source,
      avgCrash,
      medianCrash,
      volatility,
      trend,
      confidence: 0.85 // Default confidence
    };
  }

  /**
   * Aggregate rounds by time period
   */
  aggregateByHour(rounds: NormalizedRound[]): Map<number, { count: number; avgCrash: number }> {
    const hourlyData = new Map<number, { count: number; totalCrash: number }>();
    
    rounds.forEach(round => {
      const hour = round.hour;
      const existing = hourlyData.get(hour) || { count: 0, totalCrash: 0 };
      existing.count++;
      existing.totalCrash += round.crashPoint;
      hourlyData.set(hour, existing);
    });

    const result = new Map<number, { count: number; avgCrash: number }>();
    hourlyData.forEach((value, hour) => {
      result.set(hour, {
        count: value.count,
        avgCrash: value.totalCrash / value.count
      });
    });

    return result;
  }

  /**
   * Aggregate rounds by magnitude
   */
  aggregateByMagnitude(rounds: NormalizedRound[]): Map<string, number> {
    const magnitudeCounts = new Map<string, number>();
    
    rounds.forEach(round => {
      const count = magnitudeCounts.get(round.magnitude) || 0;
      magnitudeCounts.set(round.magnitude, count + 1);
    });

    return magnitudeCounts;
  }

  /**
   * Calculate moving average
   */
  calculateMovingAverage(values: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - window + 1);
      const windowValues = values.slice(start, i + 1);
      const avg = windowValues.reduce((sum, val) => sum + val, 0) / windowValues.length;
      result.push(avg);
    }
    return result;
  }

  /**
   * Helper: Calculate average
   */
  private calculateAverage(values: any[]): number {
    if (!values.length) return 0;
    const crashPoints = values.map(v => v.crash_point || 0);
    return crashPoints.reduce((sum, val) => sum + val, 0) / crashPoints.length;
  }

  /**
   * Helper: Calculate median
   */
  private calculateMedian(values: any[]): number {
    if (!values.length) return 0;
    const crashPoints = values.map(v => v.crash_point || 0).sort((a, b) => a - b);
    const mid = Math.floor(crashPoints.length / 2);
    return crashPoints.length % 2 ? crashPoints[mid] : (crashPoints[mid - 1] + crashPoints[mid]) / 2;
  }

  /**
   * Helper: Calculate volatility (standard deviation)
   */
  private calculateVolatility(values: any[]): number {
    if (!values.length) return 0;
    const crashPoints = values.map(v => v.crash_point || 0);
    const avg = this.calculateAverage(values);
    const variance = crashPoints.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / crashPoints.length;
    return Math.sqrt(variance);
  }

  /**
   * Helper: Calculate trend
   */
  private calculateTrend(values: any[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';
    const crashPoints = values.map(v => v.crash_point || 0);
    const firstHalf = crashPoints.slice(0, Math.floor(crashPoints.length / 2));
    const secondHalf = crashPoints.slice(Math.floor(crashPoints.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    if (diff > 0.1) return 'up';
    if (diff < -0.1) return 'down';
    return 'stable';
  }
}

export const transformProcessor = new TransformProcessor();
export type { NormalizedRound, NormalizedAnalysis };
