/**
 * Platform Extensions Module
 * 
 * Extends Momento Core Platform's analysis engine with forex-specific calculations
 * Following gemini.md principles: strict middleware pattern, no platform modifications
 * 
 * Features:
 * - Forex-specific indicator calculations
 * - Extended pattern detection methods
 * - Forecast engine integration
 * - Linguistics API integration
 * - Multi-timeframe correlation analysis
 * - Forex-specific signal generation
 */

import { api } from '@/lib/api';
import type {
  PlatformForecast,
  DnaPatternMatch,
  LinguisticsAnalysis,
  MultiTimeframeCorrelation,
  Timeframe,
  ExtendedCandleData,
  TechnicalIndicator,
  Pattern,
} from './momentoFX-types';

/**
 * Platform Extensions Engine
 * 
 * Extends platform capabilities with forex-specific analysis
 * All extensions follow strict middleware pattern - read-only access to platform APIs
 */
export class PlatformExtensionsEngine {
  /**
   * Get extended forecast with forex-specific calculations
   * 
   * @param source - Data source
   * @param candles - Candle data
   * @returns Enhanced forecast with forex metrics
   */
  async getExtendedForecast(
    source: string,
    candles: ExtendedCandleData[]
  ): Promise<PlatformForecast & { forexMetrics: ForexMetrics }> {
    try {
      const baseForecast = await this.getPlatformForecast(source);
      const forexMetrics = this.calculateForexMetrics(candles);

      return {
        ...baseForecast,
        forexMetrics,
      };
    } catch (error) {
      console.error('Failed to get extended forecast:', error);
      throw error;
    }
  }

  /**
   * Get platform forecast
   */
  private async getPlatformForecast(source: string): Promise<PlatformForecast> {
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

    // Return default forecast if API fails
    return {
      id: 'default',
      source,
      timestamp: new Date().toISOString(),
      prediction: {
        min: 1,
        max: 5,
        confidence: 0.5,
      },
      explanation: {
        markov_score: 0.5,
        percentile_score: 0.5,
        dna_score: 0.5,
      },
    };
  }

  /**
   * Calculate forex-specific metrics
   */
  private calculateForexMetrics(candles: ExtendedCandleData[]): ForexMetrics {
    if (candles.length < 20) {
      return {
        volatility: 0,
        trendStrength: 0,
        momentum: 0,
        supportLevel: 0,
        resistanceLevel: 0,
        range: 0,
      };
    }

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);

    // Calculate volatility (standard deviation)
    const mean = closes.reduce((sum, val) => sum + val, 0) / closes.length;
    const variance = closes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / closes.length;
    const volatility = Math.sqrt(variance);

    // Calculate trend strength (linear regression slope)
    const trendStrength = this.calculateTrendStrength(closes);

    // Calculate momentum (rate of change)
    const momentum = (closes[closes.length - 1] - closes[closes.length - 20]) / closes[closes.length - 20];

    // Calculate support and resistance levels
    const supportLevel = Math.min(...lows.slice(-20));
    const resistanceLevel = Math.max(...highs.slice(-20));
    const range = resistanceLevel - supportLevel;

    return {
      volatility,
      trendStrength,
      momentum,
      supportLevel,
      resistanceLevel,
      range,
    };
  }

  /**
   * Calculate trend strength using linear regression
   */
  private calculateTrendStrength(values: number[]): number {
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

  /**
   * Get enhanced DNA pattern matches with forex context
   */
  async getEnhancedDnaMatches(
    source: string,
    candles: ExtendedCandleData[]
  ): Promise<DnaPatternMatch[]> {
    try {
      // In production, this would call platform's DNA pattern matching API
      // For now, simulate DNA pattern matching based on candle patterns
      const matches = this.simulateDnaPatternMatches(candles);
      return matches;
    } catch (error) {
      console.warn('Failed to get enhanced DNA matches:', error);
      return [];
    }
  }

  /**
   * Simulate DNA pattern matching (placeholder for platform integration)
   */
  private simulateDnaPatternMatches(candles: ExtendedCandleData[]): DnaPatternMatch[] {
    const matches: DnaPatternMatch[] = [];

    if (candles.length < 50) return matches;

    const recent = candles.slice(-50);
    const closes = recent.map((c) => c.close);

    // Detect similar patterns in historical data
    // This is a simplified version - production would use platform's DNA API
    const patternSignature = this.generatePatternSignature(closes);
    
    // Simulate finding similar patterns
    if (patternSignature.volatility > 0.5) {
      matches.push({
        pattern_id: 'high-volatility-pattern',
        similarity: 0.85,
        confidence: 0.7,
        historical_outcome: 3.5,
        matched_at: new Date().toISOString(),
      });
    }

    if (patternSignature.trend > 0.3) {
      matches.push({
        pattern_id: 'uptrend-pattern',
        similarity: 0.78,
        confidence: 0.65,
        historical_outcome: 2.8,
        matched_at: new Date().toISOString(),
      });
    }

    return matches;
  }

  /**
   * Generate pattern signature for DNA matching
   */
  private generatePatternSignature(closes: number[]): { volatility: number; trend: number; range: number } {
    const mean = closes.reduce((sum, val) => sum + val, 0) / closes.length;
    const variance = closes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / closes.length;
    const volatility = Math.sqrt(variance) / mean;

    const trend = (closes[closes.length - 1] - closes[0]) / closes[0];
    const range = (Math.max(...closes) - Math.min(...closes)) / mean;

    return { volatility, trend, range };
  }

  /**
   * Get enhanced linguistics analysis with forex semantics
   */
  async getEnhancedLinguistics(source: string): Promise<LinguisticsAnalysis & { forexSemantics: ForexSemantics }> {
    try {
      const baseLinguistics = await this.getLinguisticsAnalysis(source);
      const forexSemantics = this.generateForexSemantics(baseLinguistics);

      return {
        ...baseLinguistics,
        forexSemantics,
      };
    } catch (error) {
      console.warn('Failed to get enhanced linguistics:', error);
      throw error;
    }
  }

  /**
   * Get linguistics analysis from platform
   */
  private async getLinguisticsAnalysis(source: string): Promise<LinguisticsAnalysis> {
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

    // Return default linguistics if API fails
    return {
      current_band: 'unknown',
      band_history: [],
      band_transitions: {},
      semantic_summary: 'Unable to generate semantic summary',
    };
  }

  /**
   * Calculate band transitions
   */
  private calculateBandTransitions(bands: string[]): Record<string, number> {
    const transitions: Record<string, number> = {};
    for (let i = 1; i < bands.length; i++) {
      const transition = `${bands[i - 1]} -> ${bands[i]}`;
      transitions[transition] = (transitions[transition] || 0) + 1;
    }
    return transitions;
  }

  /**
   * Generate semantic summary
   */
  private generateSemanticSummary(tokens: Array<{ band: string; timestamp: string }>): string {
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

  /**
   * Generate forex-specific semantics
   */
  private generateForexSemantics(linguistics: LinguisticsAnalysis): ForexSemantics {
    const bandStrength = this.calculateBandStrength(linguistics.band_history);
    const trendDirection = this.determineTrendDirection(linguistics.band_history);
    const momentum = this.calculateBandMomentum(linguistics.band_history);

    return {
      bandStrength,
      trendDirection,
      momentum,
      marketPhase: this.determineMarketPhase(linguistics.current_band, trendDirection),
    };
  }

  /**
   * Calculate band strength
   */
  private calculateBandStrength(bandHistory: Array<{ band: string; timestamp: string }>): number {
    if (bandHistory.length < 5) return 0.5;

    const recentBands = bandHistory.slice(-10).map((t) => t.band);
    const currentBand = recentBands[recentBands.length - 1];
    const frequency = recentBands.filter((b) => b === currentBand).length / recentBands.length;

    return frequency;
  }

  /**
   * Determine trend direction from band history
   */
  private determineTrendDirection(bandHistory: Array<{ band: string; timestamp: string }>): 'up' | 'down' | 'neutral' {
    if (bandHistory.length < 5) return 'neutral';

    const recentBands = bandHistory.slice(-10).map((t) => t.band);
    const numericBands = recentBands.map((b) => this.bandToNumber(b));

    const firstHalf = numericBands.slice(0, Math.floor(numericBands.length / 2));
    const secondHalf = numericBands.slice(Math.floor(numericBands.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    if (secondAvg > firstAvg + 0.5) return 'up';
    if (secondAvg < firstAvg - 0.5) return 'down';
    return 'neutral';
  }

  /**
   * Convert band to numeric value
   */
  private bandToNumber(band: string): number {
    const bandMap: Record<string, number> = {
      'very-low': 1,
      'low': 2,
      'below-average': 3,
      'average': 4,
      'above-average': 5,
      'high': 6,
      'very-high': 7,
    };
    return bandMap[band] || 4;
  }

  /**
   * Calculate band momentum
   */
  private calculateBandMomentum(bandHistory: Array<{ band: string; timestamp: string }>): number {
    if (bandHistory.length < 5) return 0;

    const recentBands = bandHistory.slice(-5).map((t) => this.bandToNumber(t.band));
    const changes = recentBands.slice(1).map((band, i) => band - recentBands[i]);
    const avgChange = changes.reduce((sum, val) => sum + val, 0) / changes.length;

    return avgChange;
  }

  /**
   * Determine market phase
   */
  private determineMarketPhase(currentBand: string, trendDirection: string): string {
    if (currentBand === 'very-high' && trendDirection === 'down') return 'distribution';
    if (currentBand === 'very-low' && trendDirection === 'up') return 'accumulation';
    if (trendDirection === 'up') return 'uptrend';
    if (trendDirection === 'down') return 'downtrend';
    return 'consolidation';
  }

  /**
   * Calculate multi-timeframe correlation
   */
  async calculateMultiTimeframeCorrelation(
    source: string,
    timeframes: Timeframe[],
    candlesMap: Map<Timeframe, ExtendedCandleData[]>
  ): Promise<MultiTimeframeCorrelation[]> {
    const correlations: MultiTimeframeCorrelation[] = [];

    for (const timeframe of timeframes) {
      const candles = candlesMap.get(timeframe) || [];
      if (candles.length < 20) continue;

      const correlation = await this.calculateSingleTimeframeCorrelation(source, timeframe, candles);
      correlations.push(correlation);
    }

    return correlations;
  }

  /**
   * Calculate correlation for single timeframe
   */
  private async calculateSingleTimeframeCorrelation(
    source: string,
    timeframe: Timeframe,
    candles: ExtendedCandleData[]
  ): Promise<MultiTimeframeCorrelation> {
    const closes = candles.map((c) => c.close);
    const trend = this.determineTrendDirection(
      candles.map((c) => ({ band: 'average', timestamp: c.time as string }))
    );
    const strength = Math.abs(this.calculateTrendStrength(closes));

    return {
      timeframe,
      trend,
      strength,
      patterns: [], // Would be populated by pattern detection
      indicators: {} as TechnicalIndicator, // Would be populated by indicator calculation
    };
  }

  /**
   * Generate forex-specific signals
   */
  generateForexSignals(
    forecast: PlatformForecast,
    linguistics: LinguisticsAnalysis & { forexSemantics: ForexSemantics },
    indicators: TechnicalIndicator,
    patterns: Pattern[]
  ): ForexSignal[] {
    const signals: ForexSignal[] = [];

    // Signal from forecast
    if (forecast.prediction.confidence > 0.7) {
      if (forecast.prediction.max > 5) {
        signals.push({
          type: 'forecast',
          signal: 'buy',
          strength: forecast.prediction.confidence,
          reason: 'High forecast confidence for upward movement',
          timestamp: new Date().toISOString(),
        });
      } else if (forecast.prediction.min < 2) {
        signals.push({
          type: 'forecast',
          signal: 'sell',
          strength: forecast.prediction.confidence,
          reason: 'High forecast confidence for downward movement',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Signal from linguistics
    if (linguistics.forexSemantics.trendDirection === 'up' && linguistics.forexSemantics.momentum > 0.3) {
      signals.push({
        type: 'linguistics',
        signal: 'buy',
        strength: linguistics.forexSemantics.bandStrength,
        reason: `Strong upward momentum in ${linguistics.current_band} band`,
        timestamp: new Date().toISOString(),
      });
    } else if (linguistics.forexSemantics.trendDirection === 'down' && linguistics.forexSemantics.momentum < -0.3) {
      signals.push({
        type: 'linguistics',
        signal: 'sell',
        strength: linguistics.forexSemantics.bandStrength,
        reason: `Strong downward momentum in ${linguistics.current_band} band`,
        timestamp: new Date().toISOString(),
      });
    }

    // Signal from patterns
    const bullishPatterns = patterns.filter((p) => p.bullish && p.confidence > 0.7);
    const bearishPatterns = patterns.filter((p) => !p.bullish && p.confidence > 0.7);

    if (bullishPatterns.length >= 2) {
      signals.push({
        type: 'pattern',
        signal: 'buy',
        strength: bullishPatterns.reduce((sum, p) => sum + p.confidence, 0) / bullishPatterns.length,
        reason: `Multiple bullish patterns detected (${bullishPatterns.map((p) => p.name).join(', ')})`,
        timestamp: new Date().toISOString(),
      });
    }

    if (bearishPatterns.length >= 2) {
      signals.push({
        type: 'pattern',
        signal: 'sell',
        strength: bearishPatterns.reduce((sum, p) => sum + p.confidence, 0) / bearishPatterns.length,
        reason: `Multiple bearish patterns detected (${bearishPatterns.map((p) => p.name).join(', ')})`,
        timestamp: new Date().toISOString(),
      });
    }

    return signals;
  }
}

/**
 * Forex metrics interface
 */
interface ForexMetrics {
  volatility: number;
  trendStrength: number;
  momentum: number;
  supportLevel: number;
  resistanceLevel: number;
  range: number;
}

/**
 * Forex semantics interface
 */
interface ForexSemantics {
  bandStrength: number;
  trendDirection: 'up' | 'down' | 'neutral';
  momentum: number;
  marketPhase: string;
}

/**
 * Forex signal interface
 */
interface ForexSignal {
  type: 'forecast' | 'linguistics' | 'pattern' | 'indicator';
  signal: 'buy' | 'sell' | 'neutral';
  strength: number;
  reason: string;
  timestamp: string;
}

/**
 * Create platform extensions engine instance
 */
export function createPlatformExtensionsEngine(): PlatformExtensionsEngine {
  return new PlatformExtensionsEngine();
}
