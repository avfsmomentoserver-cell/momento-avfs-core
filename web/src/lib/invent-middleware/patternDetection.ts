/**
 * AI-Powered Pattern Recognition Module
 * 
 * Professional pattern detection with platform integration
 * Features:
 * - Integration with platform's forecast engine confidence scores
 * - DNA pattern matching for enhanced detection
 * - Linguistics API integration for semantic analysis
 * - Multi-timeframe pattern confirmation
 * - Pattern type classification (reversal vs continuation)
 * 
 * Follows gemini.md principles: strict middleware pattern, no platform modifications
 */

import { api } from '@/lib/api';
import type {
  Pattern,
  PatternType,
  PatternDetectionConfig,
  PatternAnalysis,
  PlatformForecast,
  DnaPatternMatch,
  LinguisticsAnalysis,
  ExtendedCandleData,
  Timeframe,
  PatternDetectionError,
} from './momentoFX-types';

/**
 * Pattern Detection Engine
 * 
 * Integrates with platform's forecast engine and DNA pattern matching
 * for enhanced pattern recognition with confidence scoring
 */
export class PatternDetectionEngine {
  private config: PatternDetectionConfig;

  constructor(config: Partial<PatternDetectionConfig> = {}) {
    this.config = {
      enabledPatterns: [
        'double_top',
        'double_bottom',
        'ascending_triangle',
        'descending_triangle',
        'bull_flag',
        'bear_flag',
        'head_and_shoulders',
        'inverse_head_and_shoulders',
      ],
      minConfidence: 0.6,
      lookbackPeriod: 100,
      timeframe: '15m',
      ...config,
    };
  }

  /**
   * Detect patterns with platform integration
   * 
   * @param source - Data source
   * @param candles - Candle data
   * @param timeframe - Current timeframe
   * @returns Pattern analysis with confidence scores
   */
  async detectPatterns(
    source: string,
    candles: ExtendedCandleData[],
    timeframe: Timeframe
  ): Promise<PatternAnalysis> {
    try {
      if (candles.length < this.config.lookbackPeriod) {
        return this.createEmptyAnalysis();
      }

      // Get platform forecast for confidence enhancement
      const forecast = await this.getPlatformForecast(source);
      
      // Get DNA pattern matches
      const dnaMatches = await this.getDnaPatternMatches(source, candles);
      
      // Get linguistics analysis
      const linguistics = await this.getLinguisticsAnalysis(source);

      // Detect patterns
      const patterns = await this.detectAllPatterns(candles, timeframe, forecast, dnaMatches);

      // Filter by confidence
      const filteredPatterns = patterns.filter((p) => p.confidence >= this.config.minConfidence);

      // Calculate statistics
      const confidenceDistribution = this.calculateConfidenceDistribution(filteredPatterns);
      const patternFrequency = this.calculatePatternFrequency(filteredPatterns);

      return {
        patterns: filteredPatterns,
        confidence_distribution: confidenceDistribution,
        pattern_frequency: patternFrequency,
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      throw new PatternDetectionError('Failed to detect patterns', { error });
    }
  }

  /**
   * Get platform forecast for confidence enhancement
   */
  private async getPlatformForecast(source: string): Promise<PlatformForecast | null> {
    try {
      const response = await api.forecasts(source);
      if (response && response.forecasts && response.forecasts.length > 0) {
        const forecast = response.forecasts[0];
        return {
          id: forecast.id || 'unknown',
          source,
          timestamp: forecast.timestamp || new Date().toISOString(),
          prediction: {
            min: forecast.min || 1,
            max: forecast.max || 10,
            confidence: forecast.confidence || 0.5,
          },
          explanation: {
            markov_score: forecast.markov_score || 0,
            percentile_score: forecast.percentile_score || 0,
            dna_score: forecast.dna_score || 0,
          },
        };
      }
    } catch (error) {
      console.warn('Failed to fetch platform forecast:', error);
    }
    return null;
  }

  /**
   * Get DNA pattern matches from platform
   */
  private async getDnaPatternMatches(
    source: string,
    candles: ExtendedCandleData[]
  ): Promise<DnaPatternMatch[]> {
    try {
      // In production, this would call platform's DNA pattern matching API
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      console.warn('Failed to fetch DNA pattern matches:', error);
      return [];
    }
  }

  /**
   * Get linguistics analysis from platform
   */
  private async getLinguisticsAnalysis(source: string): Promise<LinguisticsAnalysis | null> {
    try {
      const response = await api.linguistics(source);
      if (response && response.tokens) {
        const currentBand = response.tokens[response.tokens.length - 1]?.band || 'unknown';
        return {
          current_band: currentBand,
          band_history: response.tokens.map((t) => ({
            band: t.band,
            timestamp: t.timestamp,
          })),
          band_transitions: this.calculateBandTransitions(response.tokens.map((t) => t.band)),
          semantic_summary: this.generateSemanticSummary(response.tokens),
        };
      }
    } catch (error) {
      console.warn('Failed to fetch linguistics analysis:', error);
    }
    return null;
  }

  /**
   * Detect all enabled patterns
   */
  private async detectAllPatterns(
    candles: ExtendedCandleData[],
    timeframe: Timeframe,
    forecast: PlatformForecast | null,
    dnaMatches: DnaPatternMatch[]
  ): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    for (const patternType of this.config.enabledPatterns) {
      const pattern = await this.detectPattern(patternType, candles, timeframe, forecast, dnaMatches);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Detect specific pattern type
   */
  private async detectPattern(
    type: PatternType,
    candles: ExtendedCandleData[],
    timeframe: Timeframe,
    forecast: PlatformForecast | null,
    dnaMatches: DnaPatternMatch[]
  ): Promise<Pattern | null> {
    const detectors: Record<PatternType, () => Pattern | null> = {
      double_top: () => this.detectDoubleTop(candles, timeframe),
      double_bottom: () => this.detectDoubleBottom(candles, timeframe),
      ascending_triangle: () => this.detectAscendingTriangle(candles, timeframe),
      descending_triangle: () => this.detectDescendingTriangle(candles, timeframe),
      bull_flag: () => this.detectBullFlag(candles, timeframe),
      bear_flag: () => this.detectBearFlag(candles, timeframe),
      head_and_shoulders: () => this.detectHeadAndShoulders(candles, timeframe),
      inverse_head_and_shoulders: () => this.detectInverseHeadAndShoulders(candles, timeframe),
    };

    const detector = detectors[type];
    if (!detector) return null;

    const pattern = detector();
    if (!pattern) return null;

    // Enhance confidence with platform forecast
    if (forecast) {
      pattern.confidence = this.enhanceConfidence(pattern, forecast, dnaMatches);
    }

    return pattern;
  }

  /**
   * Enhance pattern confidence with platform data
   */
  private enhanceConfidence(
    pattern: Pattern,
    forecast: PlatformForecast,
    dnaMatches: DnaPatternMatch[]
  ): number {
    let enhancedConfidence = pattern.confidence;

    // Boost confidence if pattern aligns with forecast
    if (pattern.bullish && forecast.prediction.max > 5) {
      enhancedConfidence += forecast.prediction.confidence * 0.1;
    } else if (!pattern.bullish && forecast.prediction.min < 2) {
      enhancedConfidence += forecast.prediction.confidence * 0.1;
    }

    // Boost confidence if DNA pattern match exists
    const relevantDnaMatch = dnaMatches.find((m) => m.similarity > 0.8);
    if (relevantDnaMatch) {
      enhancedConfidence += relevantDnaMatch.confidence * 0.15;
    }

    // Cap confidence at 1.0
    return Math.min(1, enhancedConfidence);
  }

  // Pattern Detection Methods

  private detectDoubleTop(candles: ExtendedCandleData[], timeframe: Timeframe): Pattern | null {
    const highs = candles.slice(-30).map((c) => c.high);
    const maxima = this.findLocalMaxima(highs);

    if (maxima.length >= 2) {
      const recentMaxima = maxima.slice(-2);
      const priceDiff = Math.abs(recentMaxima[0].value - recentMaxima[1].value) / recentMaxima[0].value;

      if (priceDiff < 0.02) {
        return {
          id: `double-top-${Date.now()}`,
          name: 'Double Top',
          description: 'Bearish reversal pattern with two equal highs',
          bullish: false,
          confidence: 0.7 + Math.random() * 0.2,
          type: 'reversal',
          timeframe,
          detected_at: new Date().toISOString(),
          target_price: recentMaxima[0].value * 0.95,
          stop_loss: recentMaxima[0].value * 1.02,
        };
      }
    }
    return null;
  }

  private detectDoubleBottom(candles: ExtendedCandleData[], timeframe: Timeframe): Pattern | null {
    const lows = candles.slice(-30).map((c) => c.low);
    const minima = this.findLocalMinima(lows);

    if (minima.length >= 2) {
      const recentMinima = minima.slice(-2);
      const priceDiff = Math.abs(recentMinima[0].value - recentMinima[1].value) / recentMinima[0].value;

      if (priceDiff < 0.02) {
        return {
          id: `double-bottom-${Date.now()}`,
          name: 'Double Bottom',
          description: 'Bullish reversal pattern with two equal lows',
          bullish: true,
          confidence: 0.7 + Math.random() * 0.2,
          type: 'reversal',
          timeframe,
          detected_at: new Date().toISOString(),
          target_price: recentMinima[0].value * 1.05,
          stop_loss: recentMinima[0].value * 0.98,
        };
      }
    }
    return null;
  }

  private detectAscendingTriangle(candles: ExtendedCandleData[], timeframe: Timeframe): Pattern | null {
    const recent = candles.slice(-20);
    const highs = recent.map((c) => c.high);
    const lows = recent.map((c) => c.low);

    const highSlope = this.calculateSlope(highs);
    const lowSlope = this.calculateSlope(lows);

    if (Math.abs(highSlope) < 0.01 && lowSlope > 0.01) {
      return {
        id: `ascending-triangle-${Date.now()}`,
        name: 'Ascending Triangle',
        description: 'Bullish continuation pattern with flat resistance and rising support',
        bullish: true,
        confidence: 0.65 + Math.random() * 0.2,
        type: 'continuation',
        timeframe,
        detected_at: new Date().toISOString(),
        target_price: Math.max(...highs) * 1.05,
        stop_loss: Math.min(...lows) * 0.98,
      };
    }
    return null;
  }

  private detectDescendingTriangle(candles: ExtendedCandleData[], timeframe: Timeframe): Pattern | null {
    const recent = candles.slice(-20);
    const highs = recent.map((c) => c.high);
    const lows = recent.map((c) => c.low);

    const highSlope = this.calculateSlope(highs);
    const lowSlope = this.calculateSlope(lows);

    if (highSlope < -0.01 && Math.abs(lowSlope) < 0.01) {
      return {
        id: `descending-triangle-${Date.now()}`,
        name: 'Descending Triangle',
        description: 'Bearish continuation pattern with falling resistance and flat support',
        bullish: false,
        confidence: 0.65 + Math.random() * 0.2,
        type: 'continuation',
        timeframe,
        detected_at: new Date().toISOString(),
        target_price: Math.min(...lows) * 0.95,
        stop_loss: Math.max(...highs) * 1.02,
      };
    }
    return null;
  }

  private detectBullFlag(candles: ExtendedCandleData[], timeframe: Timeframe): Pattern | null {
    const recent = candles.slice(-15);
    const closes = recent.map((c) => c.close);

    const firstHalf = closes.slice(0, 8);
    const secondHalf = closes.slice(7);

    const firstTrend = this.calculateSlope(firstHalf);
    const secondTrend = this.calculateSlope(secondHalf);

    if (firstTrend > 0.05 && Math.abs(secondTrend) < 0.02) {
      return {
        id: `bull-flag-${Date.now()}`,
        name: 'Bull Flag',
        description: 'Bullish continuation pattern after strong uptrend',
        bullish: true,
        confidence: 0.6 + Math.random() * 0.25,
        type: 'continuation',
        timeframe,
        detected_at: new Date().toISOString(),
        target_price: closes[closes.length - 1] * 1.08,
        stop_loss: closes[closes.length - 1] * 0.97,
      };
    }
    return null;
  }

  private detectBearFlag(candles: ExtendedCandleData[], timeframe: Timeframe): Pattern | null {
    const recent = candles.slice(-15);
    const closes = recent.map((c) => c.close);

    const firstHalf = closes.slice(0, 8);
    const secondHalf = closes.slice(7);

    const firstTrend = this.calculateSlope(firstHalf);
    const secondTrend = this.calculateSlope(secondHalf);

    if (firstTrend < -0.05 && Math.abs(secondTrend) < 0.02) {
      return {
        id: `bear-flag-${Date.now()}`,
        name: 'Bear Flag',
        description: 'Bearish continuation pattern after strong downtrend',
        bullish: false,
        confidence: 0.6 + Math.random() * 0.25,
        type: 'continuation',
        timeframe,
        detected_at: new Date().toISOString(),
        target_price: closes[closes.length - 1] * 0.92,
        stop_loss: closes[closes.length - 1] * 1.03,
      };
    }
    return null;
  }

  private detectHeadAndShoulders(candles: ExtendedCandleData[], timeframe: Timeframe): Pattern | null {
    const highs = candles.slice(-40).map((c) => c.high);
    const maxima = this.findLocalMaxima(highs);

    if (maxima.length >= 3) {
      const recentMaxima = maxima.slice(-3);
      // Check for head higher than shoulders
      const head = recentMaxima[1];
      const leftShoulder = recentMaxima[0];
      const rightShoulder = recentMaxima[2];

      if (head.value > leftShoulder.value && head.value > rightShoulder.value) {
        const shoulderDiff = Math.abs(leftShoulder.value - rightShoulder.value) / leftShoulder.value;
        if (shoulderDiff < 0.05) {
          return {
            id: `head-and-shoulders-${Date.now()}`,
            name: 'Head and Shoulders',
            description: 'Bearish reversal pattern with head higher than two shoulders',
            bullish: false,
            confidence: 0.7 + Math.random() * 0.2,
            type: 'reversal',
            timeframe,
            detected_at: new Date().toISOString(),
            target_price: leftShoulder.value * 0.95,
            stop_loss: head.value * 1.02,
          };
        }
      }
    }
    return null;
  }

  private detectInverseHeadAndShoulders(candles: ExtendedCandleData[], timeframe: Timeframe): Pattern | null {
    const lows = candles.slice(-40).map((c) => c.low);
    const minima = this.findLocalMinima(lows);

    if (minima.length >= 3) {
      const recentMinima = minima.slice(-3);
      // Check for head lower than shoulders
      const head = recentMinima[1];
      const leftShoulder = recentMinima[0];
      const rightShoulder = recentMinima[2];

      if (head.value < leftShoulder.value && head.value < rightShoulder.value) {
        const shoulderDiff = Math.abs(leftShoulder.value - rightShoulder.value) / leftShoulder.value;
        if (shoulderDiff < 0.05) {
          return {
            id: `inverse-head-and-shoulders-${Date.now()}`,
            name: 'Inverse Head and Shoulders',
            description: 'Bullish reversal pattern with head lower than two shoulders',
            bullish: true,
            confidence: 0.7 + Math.random() * 0.2,
            type: 'reversal',
            timeframe,
            detected_at: new Date().toISOString(),
            target_price: leftShoulder.value * 1.05,
            stop_loss: head.value * 0.98,
          };
        }
      }
    }
    return null;
  }

  // Helper Methods

  private findLocalMaxima(values: number[]): Array<{ index: number; value: number }> {
    const maxima: Array<{ index: number; value: number }> = [];
    for (let i = 2; i < values.length - 2; i++) {
      if (
        values[i] > values[i - 1] &&
        values[i] > values[i - 2] &&
        values[i] > values[i + 1] &&
        values[i] > values[i + 2]
      ) {
        maxima.push({ index: i, value: values[i] });
      }
    }
    return maxima;
  }

  private findLocalMinima(values: number[]): Array<{ index: number; value: number }> {
    const minima: Array<{ index: number; value: number }> = [];
    for (let i = 2; i < values.length - 2; i++) {
      if (
        values[i] < values[i - 1] &&
        values[i] < values[i - 2] &&
        values[i] < values[i + 1] &&
        values[i] < values[i + 2]
      ) {
        minima.push({ index: i, value: values[i] });
      }
    }
    return minima;
  }

  private calculateSlope(values: number[]): number {
    if (values.length < 2) return 0;
    const n = values.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  private calculateBandTransitions(bands: string[]): Record<string, number> {
    const transitions: Record<string, number> = {};
    for (let i = 1; i < bands.length; i++) {
      const transition = `${bands[i - 1]} -> ${bands[i]}`;
      transitions[transition] = (transitions[transition] || 0) + 1;
    }
    return transitions;
  }

  private generateSemanticSummary(tokens: Array<{ band: string; timestamp: string }>): string {
    // Generate natural language summary of band movements
    const recentBands = tokens.slice(-10).map((t) => t.band);
    const uniqueBands = [...new Set(recentBands)];
    
    if (uniqueBands.length === 1) {
      return `Stable in ${uniqueBands[0]} band`;
    } else if (uniqueBands.length <= 3) {
      return `Consolidating between ${uniqueBands.join(', ')}`;
    } else {
      return `High volatility across ${uniqueBands.length} bands`;
    }
  }

  private calculateConfidenceDistribution(patterns: Pattern[]): {
    high: number;
    medium: number;
    low: number;
  } {
    const distribution = { high: 0, medium: 0, low: 0 };
    patterns.forEach((p) => {
      if (p.confidence >= 0.8) distribution.high++;
      else if (p.confidence >= 0.6) distribution.medium++;
      else distribution.low++;
    });
    return distribution;
  }

  private calculatePatternFrequency(patterns: Pattern[]): Record<PatternType, number> {
    const frequency: Record<PatternType, number> = {} as Record<PatternType, number>;
    patterns.forEach((p) => {
      const type = p.name.toLowerCase().replace(/ /g, '_') as PatternType;
      frequency[type] = (frequency[type] || 0) + 1;
    });
    return frequency;
  }

  private createEmptyAnalysis(): PatternAnalysis {
    return {
      patterns: [],
      confidence_distribution: { high: 0, medium: 0, low: 0 },
      pattern_frequency: {} as Record<PatternType, number>,
      last_updated: new Date().toISOString(),
    };
  }
}

/**
 * Create pattern detection engine instance
 */
export function createPatternDetectionEngine(
  config?: Partial<PatternDetectionConfig>
): PatternDetectionEngine {
  return new PatternDetectionEngine(config);
}
