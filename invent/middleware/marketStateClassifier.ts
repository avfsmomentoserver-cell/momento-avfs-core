/**
 * Market State Classifier
 * 
 * Classifies market state (compression/release/transition), analyzes energy buildup,
 * and detects state transition signals with linguistics integration
 */

import { dataIngester } from './dataIngester';
import type {
  MarketStateAnalysis,
  EnergyIndicator,
  MegaplanError
} from './megaplan-types';

class MarketStateClassifier {
  private analysisWindow: number;
  private stateHistory: Array<{ state: MarketStateAnalysis['current_state']; timestamp: number }>;

  constructor(analysisWindow: number = 300) {
    this.analysisWindow = analysisWindow;
    this.stateHistory = [];
  }

  /**
   * Get band from multiplier using linguistics-style classification
   */
  private getBand(multiplier: number): string {
    if (multiplier < 1.2) return 'dust';
    if (multiplier < 1.5) return 'floor';
    if (multiplier < 2.0) return 'low';
    if (multiplier < 3.0) return 'base';
    if (multiplier < 5.0) return 'mid';
    if (multiplier < 10.0) return 'high';
    if (multiplier < 20.0) return 'ignition';
    if (multiplier < 50.0) return 'moonshot';
    if (multiplier < 100.0) return 'mega';
    return 'cosmic';
  }

  /**
   * Calculate energy indicators
   */
  private calculateEnergyIndicators(rounds: any[]): EnergyIndicator[] {
    const indicators: EnergyIndicator[] = [];
    const multipliers = rounds.map(r => r.multiplier);

    // Volatility indicator
    const recentMultipliers = multipliers.slice(-50);
    const volatility = this.calculateVolatility(recentMultipliers);
    const volatilityTrend = this.calculateTrend(multipliers.slice(-100, -50), recentMultipliers);
    indicators.push({
      type: 'volatility',
      value: volatility,
      trend: volatilityTrend,
      significance: volatility > 2 ? 'high' : volatility > 1 ? 'medium' : 'low'
    });

    // Frequency indicator (how often high multipliers occur)
    const highMultiplierCount = recentMultipliers.filter(m => m >= 10).length;
    const frequencyScore = highMultiplierCount / recentMultipliers.length;
    const frequencyTrend = this.calculateTrend(
      multipliers.slice(-100, -50).filter(m => m >= 10).length,
      highMultiplierCount
    );
    indicators.push({
      type: 'frequency',
      value: frequencyScore,
      trend: frequencyTrend,
      significance: frequencyScore > 0.3 ? 'high' : frequencyScore > 0.1 ? 'medium' : 'low'
    });

    // Magnitude indicator (average multiplier magnitude)
    const avgMagnitude = recentMultipliers.reduce((sum, m) => sum + m, 0) / recentMultipliers.length;
    const magnitudeTrend = this.calculateTrend(
      multipliers.slice(-100, -50),
      recentMultipliers
    );
    indicators.push({
      type: 'magnitude',
      value: avgMagnitude,
      trend: magnitudeTrend,
      significance: avgMagnitude > 5 ? 'high' : avgMagnitude > 2 ? 'medium' : 'low'
    });

    // Timing indicator (time between high multipliers)
    const highMultiplierIndices = multipliers
      .map((m, i) => ({ multiplier: m, index: i }))
      .filter(item => item.multiplier >= 10)
      .map(item => item.index);

    let timingScore = 0;
    let timingTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    
    if (highMultiplierIndices.length > 1) {
      const gaps = [];
      for (let i = 1; i < highMultiplierIndices.length; i++) {
        gaps.push(highMultiplierIndices[i] - highMultiplierIndices[i - 1]);
      }
      const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
      timingScore = 1 / (avgGap / 50); // Normalize around 50 rounds
      
      if (gaps.length > 2) {
        const recentGaps = gaps.slice(-2);
        const earlierGaps = gaps.slice(0, -2);
        const recentAvg = recentGaps.reduce((sum, g) => sum + g, 0) / recentGaps.length;
        const earlierAvg = earlierGaps.reduce((sum, g) => sum + g, 0) / earlierGaps.length;
        timingTrend = recentAvg < earlierAvg ? 'increasing' : recentAvg > earlierAvg ? 'decreasing' : 'stable';
      }
    }
    
    indicators.push({
      type: 'timing',
      value: timingScore,
      trend: timingTrend,
      significance: timingScore > 0.5 ? 'high' : timingScore > 0.2 ? 'medium' : 'low'
    });

    return indicators;
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Calculate trend between two sets of values
   */
  private calculateTrend(previousValues: number[], currentValues: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (previousValues.length === 0 || currentValues.length === 0) return 'stable';
    
    const prevAvg = Array.isArray(previousValues) 
      ? previousValues.reduce((sum, val) => sum + val, 0) / previousValues.length
      : previousValues as number;
    const currAvg = Array.isArray(currentValues)
      ? currentValues.reduce((sum, val) => sum + val, 0) / currentValues.length
      : currentValues as number;
    
    const change = (currAvg - prevAvg) / (prevAvg || 1);
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate energy buildup score
   */
  private calculateEnergyBuildup(indicators: EnergyIndicator[]): number {
    let energyScore = 0;
    
    indicators.forEach(indicator => {
      const significanceWeight = indicator.significance === 'high' ? 1.0 : 
                                indicator.significance === 'medium' ? 0.6 : 0.3;
      const trendWeight = indicator.trend === 'increasing' ? 1.0 :
                         indicator.trend === 'decreasing' ? 0.5 : 0.7;
      
      energyScore += indicator.value * significanceWeight * trendWeight;
    });
    
    return Math.min(1.0, energyScore / indicators.length);
  }

  /**
   * Calculate pressure score
   */
  private calculatePressureScore(rounds: any[], energyBuildup: number): number {
    const recentRounds = rounds.slice(-50);
    
    // Band pressure (how many rounds in higher bands)
    const bandDistribution = new Map<string, number>();
    recentRounds.forEach(round => {
      const band = this.getBand(round.multiplier);
      bandDistribution.set(band, (bandDistribution.get(band) || 0) + 1);
    });

    const highBands = ['ignition', 'moonshot', 'mega', 'cosmic'];
    const highBandCount = highBands.reduce((sum, band) => 
      sum + (bandDistribution.get(band) || 0), 0);
    
    const bandPressure = highBandCount / recentRounds.length;
    
    // Combine with energy buildup
    return (energyBuildup * 0.6) + (bandPressure * 0.4);
  }

  /**
   * Detect transition signals
   */
  private detectTransitionSignals(
    rounds: any[],
    indicators: EnergyIndicator[],
    currentState: MarketStateAnalysis['current_state']
  ): Array<{ type: string; strength: number; description: string }> {
    const signals: Array<{ type: string; strength: number; description: string }> = [];
    
    const recentRounds = rounds.slice(-20);
    const recentMultipliers = recentRounds.map(r => r.multiplier);
    
    // Check for sudden volatility increase
    const volatilityIndicator = indicators.find(i => i.type === 'volatility');
    if (volatilityIndicator && volatilityIndicator.trend === 'increasing' && volatilityIndicator.significance === 'high') {
      signals.push({
        type: 'volatility_spike',
        strength: 0.8,
        description: 'Sudden increase in volatility detected'
      });
    }

    // Check for band transitions
    const recentBands = recentRounds.map(r => this.getBand(r.multiplier));
    const uniqueBands = new Set(recentBands);
    if (uniqueBands.size > 5) {
      signals.push({
        type: 'band_instability',
        strength: 0.7,
        description: 'High band instability detected - rapid transitions'
      });
    }

    // Check for momentum shift
    const avgRecent = recentMultipliers.reduce((sum, m) => sum + m, 0) / recentMultipliers.length;
    const earlierRounds = rounds.slice(-50, -20);
    const avgEarlier = earlierRounds.map(r => r.multiplier).reduce((sum, m) => sum + m, 0) / earlierRounds.length;
    
    if (avgRecent > avgEarlier * 1.5 && currentState === 'compression') {
      signals.push({
        type: 'momentum_shift',
        strength: 0.9,
        description: 'Strong momentum shift from compression to release'
      });
    } else if (avgRecent < avgEarlier * 0.7 && currentState === 'release') {
      signals.push({
        type: 'momentum_shift',
        strength: 0.8,
        description: 'Momentum deceleration from release to compression'
      });
    }

    // Check for timing patterns
    const frequencyIndicator = indicators.find(i => i.type === 'frequency');
    if (frequencyIndicator && frequencyIndicator.trend === 'increasing') {
      signals.push({
        type: 'frequency_acceleration',
        strength: 0.6,
        description: 'Increasing frequency of high multipliers'
      });
    }

    return signals;
  }

  /**
   * Determine current market state
   */
  private determineMarketState(
    energyBuildup: number,
    pressureScore: number,
    indicators: EnergyIndicator[]
  ): 'compression' | 'release' | 'transition' {
    // High energy + high pressure = release state
    if (energyBuildup > 0.7 && pressureScore > 0.6) {
      return 'release';
    }
    
    // Low energy + low pressure = compression state
    if (energyBuildup < 0.4 && pressureScore < 0.4) {
      return 'compression';
    }
    
    // Mixed signals = transition state
    return 'transition';
  }

  /**
   * Calculate confidence for state classification
   */
  private calculateConfidence(
    energyBuildup: number,
    pressureScore: number,
    transitionSignals: Array<{ strength: number }>
  ): number {
    // Base confidence from energy and pressure alignment
    const alignmentScore = 1 - Math.abs(energyBuildup - pressureScore);
    
    // Transition signals reduce confidence (indicating uncertainty)
    const signalStrength = transitionSignals.reduce((sum, signal) => sum + signal.strength, 0);
    const signalPenalty = Math.min(0.3, signalStrength * 0.1);
    
    const confidence = (alignmentScore * 0.7) + (0.3 - signalPenalty);
    
    return Math.max(0.3, Math.min(1.0, confidence));
  }

  /**
   * Main analysis method
   */
  async classifyMarketState(source: string): Promise<MarketStateAnalysis> {
    try {
      const rounds = await dataIngester.getRounds(source, this.analysisWindow);
      
      if (rounds.length < 20) {
        throw new MegaplanError(
          'Insufficient data for market state classification',
          'INSUFFICIENT_DATA',
          { roundCount: rounds.length }
        );
      }

      // Calculate energy indicators
      const energyIndicators = this.calculateEnergyIndicators(rounds);
      
      // Calculate energy buildup
      const energyBuildup = this.calculateEnergyBuildup(energyIndicators);
      
      // Calculate pressure score
      const pressureScore = this.calculatePressureScore(rounds, energyBuildup);
      
      // Determine current state
      const current_state = this.determineMarketState(energyBuildup, pressureScore, energyIndicators);
      
      // Detect transition signals
      const transitionSignals = this.detectTransitionSignals(rounds, energyIndicators, current_state);
      
      // Calculate confidence
      const confidence = this.calculateConfidence(energyBuildup, pressureScore, transitionSignals);
      
      // Store in history
      this.stateHistory.push({
        state: current_state,
        timestamp: Date.now()
      });
      
      // Keep history manageable
      if (this.stateHistory.length > 100) {
        this.stateHistory = this.stateHistory.slice(-50);
      }

      return {
        current_state,
        energy_buildup: energyBuildup,
        pressure_score: pressureScore,
        transition_signals: transitionSignals,
        confidence
      };
    } catch (error) {
      if (error instanceof MegaplanError) {
        throw error;
      }
      throw new MegaplanError(
        `Failed to classify market state: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MARKET_STATE_ERROR',
        { source }
      );
    }
  }

  /**
   * Analyze custom data (for testing or custom analysis)
   */
  classifyCustomMarketState(rounds: any[]): MarketStateAnalysis {
    if (rounds.length < 20) {
      throw new MegaplanError(
        'Insufficient data for market state classification',
        'INSUFFICIENT_DATA',
        { roundCount: rounds.length }
      );
    }

    const energyIndicators = this.calculateEnergyIndicators(rounds);
    const energyBuildup = this.calculateEnergyBuildup(energyIndicators);
    const pressureScore = this.calculatePressureScore(rounds, energyBuildup);
    const current_state = this.determineMarketState(energyBuildup, pressureScore, energyIndicators);
    const transitionSignals = this.detectTransitionSignals(rounds, energyIndicators, current_state);
    const confidence = this.calculateConfidence(energyBuildup, pressureScore, transitionSignals);

    return {
      current_state,
      energy_buildup: energyBuildup,
      pressure_score: pressureScore,
      transition_signals: transitionSignals,
      confidence
    };
  }

  /**
   * Get state history
   */
  getStateHistory(): Array<{ state: MarketStateAnalysis['current_state']; timestamp: number }> {
    return [...this.stateHistory];
  }

  /**
   * Clear state history
   */
  clearStateHistory(): void {
    this.stateHistory = [];
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

export const marketStateClassifier = new MarketStateClassifier();
export type { MarketStateAnalysis, EnergyIndicator };