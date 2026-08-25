/**
 * Megaplan Prediction Engine
 * 
 * Main prediction orchestrator that coordinates all analysis factors
 * and implements strict consensus correlation for moonshot predictions
 */

import { sequenceAngleAnalyzer } from './sequenceAngleAnalyzer';
import { timeBasedCandlestickProcessor } from './timeBasedCandlestickProcessor';
import { momentumCompressionAnalyzer } from './momentumCompressionAnalyzer';
import { marketStateClassifier } from './marketStateClassifier';
import type {
  MegaplanPrediction,
  FactorPrediction,
  ConsensusResult,
  MegaplanConfig,
  DEFAULT_MEGAPLAN_CONFIG,
  MegaplanError
} from './megaplan-types';

class MegaplanPredictionEngine {
  private config: MegaplanConfig;

  constructor(config?: Partial<MegaplanConfig>) {
    this.config = { ...DEFAULT_MEGAPLAN_CONFIG, ...config };
    
    // Update component configurations
    sequenceAngleAnalyzer.setAnalysisWindow(this.config.analysis_window);
    momentumCompressionAnalyzer.updateConfig({ analysis_window: this.config.analysis_window });
    marketStateClassifier.setAnalysisWindow(this.config.analysis_window);
    timeBasedCandlestickProcessor.updateConfig({
      analysis_window: this.config.analysis_window,
      timeframes: this.config.timeframes
    });
  }

  /**
   * Analyze sequence angle factor
   */
  private async analyzeSequenceAngleFactor(source: string): Promise<FactorPrediction> {
    try {
      const analysis = await sequenceAngleAnalyzer.analyzeSequence(source);
      
      const valid = analysis.confidence >= this.config.confidence_threshold;
      const directionValid = analysis.direction !== 'sideways';
      
      return {
        factor_name: 'sequence_angle',
        valid: valid && directionValid,
        confidence: analysis.confidence,
        prediction: {
          angle: analysis.angle,
          direction: analysis.direction,
          target_range: analysis.target_range,
          predicted_sequence: analysis.predicted_sequence || []
        },
        reasoning: `Sequence angle analysis: ${analysis.direction} trend with ${analysis.angle.toFixed(1)}° angle. Confidence: ${(analysis.confidence * 100).toFixed(0)}%.`
      };
    } catch (error) {
      return {
        factor_name: 'sequence_angle',
        valid: false,
        confidence: 0,
        prediction: null,
        reasoning: `Sequence angle analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Analyze momentum compression factor
   */
  private async analyzeMomentumCompressionFactor(source: string): Promise<FactorPrediction> {
    try {
      const analysis = await momentumCompressionAnalyzer.analyzeMomentumCompression(source);
      
      const valid = analysis.confidence >= this.config.confidence_threshold;
      const momentumValid = analysis.momentum_score > 0.5;
      const clusterValid = analysis.cluster_probability > 0.6;
      
      return {
        factor_name: 'momentum_compression',
        valid: valid && momentumValid && clusterValid,
        confidence: analysis.confidence,
        prediction: {
          momentum_score: analysis.momentum_score,
          cluster_probability: analysis.cluster_probability,
          expected_timing: analysis.expected_cluster_timing,
          pattern: analysis.pattern
        },
        reasoning: `Momentum score: ${analysis.momentum_score.toFixed(2)}, Cluster probability: ${(analysis.cluster_probability * 100).toFixed(0)}%. Pattern: ${analysis.pattern}`
      };
    } catch (error) {
      return {
        factor_name: 'momentum_compression',
        valid: false,
        confidence: 0,
        prediction: null,
        reasoning: `Momentum compression analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Analyze time candlestick factor
   */
  private async analyzeTimeCandlestickFactor(source: string): Promise<FactorPrediction> {
    try {
      const candlesticks = await timeBasedCandlestickProcessor.createCandlesticks(
        source,
        this.config.timeframes[0], // Use primary timeframe
        this.config.analysis_window
      );
      
      if (candlesticks.length < 5) {
        return {
          factor_name: 'time_candlestick',
          valid: false,
          confidence: 0,
          prediction: null,
          reasoning: 'Insufficient candlestick data for analysis'
        };
      }

      const statistics = timeBasedCandlestickProcessor.getCandlestickStatistics(candlesticks);
      const patterns = timeBasedCandlestickProcessor.detectCandlestickPatterns(candlesticks);
      
      // Determine validity based on patterns and statistics
      const hasSignificantPatterns = patterns.some(p => p.confidence > 0.7);
      const volatilityValid = statistics.volatility > 0.5;
      const peakClustering = statistics.avg_peak_multiplier > 5;
      
      const valid = hasSignificantPatterns && (volatilityValid || peakClustering);
      const confidence = hasSignificantPatterns 
        ? Math.max(...patterns.map(p => p.confidence))
        : Math.min(statistics.volatility, 1.0);

      return {
        factor_name: 'time_candlestick',
        valid,
        confidence,
        prediction: {
          statistics,
          patterns,
          timeframe: this.config.timeframes[0]
        },
        reasoning: `Candlestick analysis: ${patterns.length} patterns detected, Volatility: ${statistics.volatility.toFixed(2)}, Avg peak: ${statistics.avg_peak_multiplier.toFixed(2)}`
      };
    } catch (error) {
      return {
        factor_name: 'time_candlestick',
        valid: false,
        confidence: 0,
        prediction: null,
        reasoning: `Time candlestick analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Analyze market state factor
   */
  private async analyzeMarketStateFactor(source: string): Promise<FactorPrediction> {
    try {
      const analysis = await marketStateClassifier.classifyMarketState(source);
      
      const valid = analysis.confidence >= this.config.confidence_threshold;
      const stateValid = analysis.current_state !== 'transition';
      const energyValid = analysis.energy_buildup > 0.5;
      
      return {
        factor_name: 'market_state',
        valid: valid && stateValid && energyValid,
        confidence: analysis.confidence,
        prediction: {
          current_state: analysis.current_state,
          energy_buildup: analysis.energy_buildup,
          pressure_score: analysis.pressure_score,
          transition_signals: analysis.transition_signals
        },
        reasoning: `Market state: ${analysis.current_state}, Energy: ${analysis.energy_buildup.toFixed(2)}, Pressure: ${analysis.pressure_score.toFixed(2)}`
      };
    } catch (error) {
      return {
        factor_name: 'market_state',
        valid: false,
        confidence: 0,
        prediction: null,
        reasoning: `Market state analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Apply computed consensus correlation
   */
  private applyComputedConsensus(factors: FactorPrediction[]): ConsensusResult {
    // Calculate weighted consensus score (computed consensus)
    const weights = {
      sequence_angle: 0.3,
      momentum_compression: 0.3,
      time_candlestick: 0.2,
      market_state: 0.2
    };

    const consensusScore = factors.reduce((sum, factor) => {
      const weight = weights[factor.factor_name as keyof typeof weights] || 0.25;
      return sum + (factor.valid ? factor.confidence * weight : 0);
    }, 0);

    const validFactors = factors.filter(f => f.valid).map(f => f.factor_name);
    const invalidFactors = factors.filter(f => !f.valid).map(f => f.factor_name);

    // Combine predictions using only valid factors
    const validFactorsData = factors.filter(f => f.valid);
    const combinedPrediction = validFactorsData.length > 0 
      ? this.combinePredictions(validFactorsData)
      : this.createEmptyPrediction();

    const explanation = this.generateConsensusExplanation(factors, consensusScore);

    return {
      consensus_score: consensusScore,
      valid_factors: validFactors,
      invalid_factors: invalidFactors,
      combined_prediction,
      explanation
    };
  }

  /**
   * Combine predictions from all factors
   */
  private combinePredictions(factors: FactorPrediction[]): MegaplanPrediction {
    const sequenceFactor = factors.find(f => f.factor_name === 'sequence_angle');
    const momentumFactor = factors.find(f => f.factor_name === 'momentum_compression');
    const candlestickFactor = factors.find(f => f.factor_name === 'time_candlestick');
    const marketStateFactor = factors.find(f => f.factor_name === 'market_state');

    // Determine market state
    const market_state = marketStateFactor?.prediction?.current_state || 'transition';

    // Calculate next range targets
    let min = 1.0, max = 10.0, confidence = 0.5;
    
    if (sequenceFactor?.prediction?.target_range) {
      min = Math.max(min, sequenceFactor.prediction.target_range.min);
      max = Math.min(max, sequenceFactor.prediction.target_range.max);
    }
    
    if (momentumFactor?.prediction) {
      confidence = Math.max(confidence, momentumFactor.confidence);
    }

    // Determine forward structure
    const forward_structure = {
      predicted_sequence: sequenceFactor?.prediction?.predicted_sequence || [],
      angle: sequenceFactor?.prediction?.angle || 0,
      direction: sequenceFactor?.prediction?.direction || 'sideways'
    };

    // Determine momentum forecast
    const momentum_forecast = {
      current_momentum: momentumFactor?.prediction?.momentum_score || 0,
      release_probability: momentumFactor?.prediction?.cluster_probability || 0,
      cluster_prediction: {
        likely: (momentumFactor?.prediction?.cluster_probability || 0) > 0.6,
        timing: momentumFactor?.prediction?.expected_timing || 0
      }
    };

    // Calculate final consensus score
    const consensus_score = factors.reduce((sum, f) => sum + (f.valid ? f.confidence : 0), 0) / factors.length;

    return {
      market_state,
      next_range_targets: { min, max, confidence },
      forward_structure,
      momentum_forecast,
      consensus_score,
      factors: {
        sequence_angle: sequenceFactor?.valid || false,
        momentum_compression: momentumFactor?.valid || false,
        time_candlestick: candlestickFactor?.valid || false,
        market_state: marketStateFactor?.valid || false
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate consensus explanation
   */
  private generateConsensusExplanation(factors: FactorPrediction[], consensusScore: number): string {
    const validCount = factors.filter(f => f.valid).length;
    const totalCount = factors.length;
    
    let explanation = `Consensus score: ${(consensusScore * 100).toFixed(0)}%. `;
    explanation += `Valid factors: ${validCount}/${totalCount}. `;
    
    if (validCount === totalCount) {
      explanation += 'All factors agree - strong prediction signal.';
    } else if (validCount >= totalCount / 2) {
      explanation += 'Majority of factors agree - moderate prediction signal.';
    } else {
      explanation += 'Insufficient factor agreement - weak prediction signal.';
    }

    return explanation;
  }

  /**
   * Create empty prediction
   */
  private createEmptyPrediction(): MegaplanPrediction {
    return {
      market_state: 'transition',
      next_range_targets: { min: 1.0, max: 10.0, confidence: 0 },
      forward_structure: {
        predicted_sequence: [],
        angle: 0,
        direction: 'sideways'
      },
      momentum_forecast: {
        current_momentum: 0,
        release_probability: 0,
        cluster_prediction: { likely: false, timing: 0 }
      },
      consensus_score: 0,
      factors: {
        sequence_angle: false,
        momentum_compression: false,
        time_candlestick: false,
        market_state: false
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Main prediction method
   */
  async generatePrediction(source: string): Promise<MegaplanPrediction> {
    try {
      // Analyze all factors in parallel for performance
      const [sequenceFactor, momentumFactor, candlestickFactor, marketStateFactor] = await Promise.all([
        this.analyzeSequenceAngleFactor(source),
        this.analyzeMomentumCompressionFactor(source),
        this.analyzeTimeCandlestickFactor(source),
        this.analyzeMarketStateFactor(source)
      ]);

      const factors = [sequenceFactor, momentumFactor, candlestickFactor, marketStateFactor];

      // Apply strict consensus
      const consensusResult = this.applyComputedConsensus(factors);

      return consensusResult.combined_prediction;
    } catch (error) {
      if (error instanceof ConsensusError) {
        throw error;
      }
      throw new MegaplanError(
        `Failed to generate megaplan prediction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PREDICTION_ERROR',
        { source }
      );
    }
  }

  /**
   * Generate prediction with detailed consensus information
   */
  async generateDetailedPrediction(source: string): Promise<{
    prediction: MegaplanPrediction;
    consensus: ConsensusResult;
    factors: FactorPrediction[];
  }> {
    try {
      // Analyze all factors in parallel
      const [sequenceFactor, momentumFactor, candlestickFactor, marketStateFactor] = await Promise.all([
        this.analyzeSequenceAngleFactor(source),
        this.analyzeMomentumCompressionFactor(source),
        this.analyzeTimeCandlestickFactor(source),
        this.analyzeMarketStateFactor(source)
      ]);

      const factors = [sequenceFactor, momentumFactor, candlestickFactor, marketStateFactor];

      // Apply strict consensus
      const consensusResult = this.applyComputedConsensus(factors);

      return {
        prediction: consensusResult.combined_prediction,
        consensus: consensusResult,
        factors
      };
    } catch (error) {
      if (error instanceof MegaplanError) {
        throw error;
      }
      throw new MegaplanError(
        `Failed to generate detailed megaplan prediction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DETAILED_PREDICTION_ERROR',
        { source }
      );
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MegaplanConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update component configurations
    if (config.analysis_window !== undefined) {
      sequenceAngleAnalyzer.setAnalysisWindow(config.analysis_window);
      momentumCompressionAnalyzer.updateConfig({ analysis_window: config.analysis_window });
      marketStateClassifier.setAnalysisWindow(config.analysis_window);
      timeBasedCandlestickProcessor.updateConfig({
        analysis_window: config.analysis_window
      });
    }
    
    if (config.timeframes !== undefined) {
      timeBasedCandlestickProcessor.updateConfig({
        timeframes: config.timeframes
      });
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): MegaplanConfig {
    return { ...this.config };
  }

  /**
   * Reset to default configuration
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_MEGAPLAN_CONFIG };
    this.updateConfig(DEFAULT_MEGAPLAN_CONFIG);
  }
}

export const megaplanPredictionEngine = new MegaplanPredictionEngine();
export type { MegaplanPrediction, FactorPrediction, ConsensusResult, MegaplanConfig };

// ============================================================================
// REACT QUERY HOOKS FOR FRONTEND INTEGRATION
// ============================================================================

// Note: These hooks would be used in the frontend with React Query
// For now, we'll create placeholder hooks that can be moved to the frontend

/*
import { useQuery } from '@tanstack/react-query';

const POLL_INTERVAL = 15000; // 15 seconds
const STALE_TIME = 30000; // 30 seconds

export function useMegaplanPrediction(source: string) {
  return useQuery({
    queryKey: ['megaplan-prediction', source],
    queryFn: () => megaplanPredictionEngine.generatePrediction(source),
    refetchInterval: POLL_INTERVAL,
    staleTime: STALE_TIME,
  });
}

export function useDetailedMegaplanPrediction(source: string) {
  return useQuery({
    queryKey: ['megaplan-detailed-prediction', source],
    queryFn: () => megaplanPredictionEngine.generateDetailedPrediction(source),
    refetchInterval: POLL_INTERVAL * 2,
    staleTime: STALE_TIME * 2,
  });
}

export function useSequenceAngleAnalysis(source: string) {
  return useQuery({
    queryKey: ['sequence-angle-analysis', source],
    queryFn: () => sequenceAngleAnalyzer.analyzeSequence(source),
    refetchInterval: POLL_INTERVAL * 3,
    staleTime: STALE_TIME * 3,
  });
}

export function useMomentumCompressionAnalysis(source: string) {
  return useQuery({
    queryKey: ['momentum-compression-analysis', source],
    queryFn: () => momentumCompressionAnalyzer.analyzeMomentumCompression(source),
    refetchInterval: POLL_INTERVAL * 3,
    staleTime: STALE_TIME * 3,
  });
}

export function useMarketStateClassification(source: string) {
  return useQuery({
    queryKey: ['market-state-classification', source],
    queryFn: () => marketStateClassifier.classifyMarketState(source),
    refetchInterval: POLL_INTERVAL * 2,
    staleTime: STALE_TIME * 2,
  });
}

export function useTimeBasedCandlesticks(source: string, timeframe: MegaplanTimeframe) {
  return useQuery({
    queryKey: ['time-based-candlesticks', source, timeframe],
    queryFn: () => timeBasedCandlestickProcessor.createCandlesticks(source, timeframe),
    refetchInterval: POLL_INTERVAL * 4,
    staleTime: STALE_TIME * 4,
  });
}
*/

// ============================================================================
// INTEGRATION WITH EXISTING MEGAPRESSURE SYSTEM
// ============================================================================

/**
 * Enhanced pressure analysis that includes megaplan predictions
 * This can be used to augment the existing megaPressure system
 */
export async function getEnhancedPressureAnalysis(
  source: string,
  range: { min: number; max: number }
): Promise<{
  traditional_pressure: any;
  megaplan_prediction: MegaplanPrediction;
  combined_insights: string;
}> {
  try {
    // Get traditional pressure analysis (from existing megaPressure system)
    // This would typically call the existing megaPressureAnalyzer
    // For now, we'll create a placeholder structure
    
    const traditional_pressure = {
      // This would be populated by the existing megaPressure system
      current_pressure: 0.5,
      avg_mega_gap: 100,
      avg_mini_moonshots: 2,
      energy_buildup: 0.6,
      shape_consistency: 0.7,
      band_momentum: 0.5,
      time_decay: 0.4
    };

    // Get megaplan prediction
    const megaplan_prediction = await megaplanPredictionEngine.generatePrediction(source);

    // Generate combined insights
    const combined_insights = generateCombinedInsights(traditional_pressure, megaplan_prediction);

    return {
      traditional_pressure,
      megaplan_prediction,
      combined_insights
    };
  } catch (error) {
    throw new MegaplanError(
      `Failed to get enhanced pressure analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'ENHANCED_ANALYSIS_ERROR',
      { source, range }
    );
  }
}

/**
 * Generate combined insights from traditional and megaplan analysis
 */
function generateCombinedInsights(traditional: any, megaplan: MegaplanPrediction): string {
  const insights: string[] = [];

  // Market state alignment
  if (megaplan.market_state === 'release' && traditional.energy_buildup > 0.6) {
    insights.push('Strong release signal confirmed by both traditional and megaplan analysis.');
  } else if (megaplan.market_state === 'compression' && traditional.energy_buildup < 0.4) {
    insights.push('Compression phase confirmed by both analysis methods.');
  }

  // Consensus validation
  if (megaplan.consensus_score > 0.8) {
    insights.push('High consensus score indicates reliable prediction signal.');
  } else if (megaplan.consensus_score < 0.5) {
    insights.push('Low consensus score suggests mixed signals - caution advised.');
  }

  // Factor agreement
  const validFactors = Object.values(megaplan.factors).filter(f => f).length;
  if (validFactors === 4) {
    insights.push('All prediction factors are aligned - strong prediction confidence.');
  } else if (validFactors >= 2) {
    insights.push(`${validFactors}/4 factors agree - moderate prediction confidence.`);
  } else {
    insights.push('Insufficient factor agreement - low prediction confidence.');
  }

  // Momentum alignment
  if (megaplan.momentum_forecast.release_probability > 0.7 && traditional.band_momentum > 0.6) {
    insights.push('Momentum indicators aligned - favorable conditions for moonshots.');
  }

  return insights.join(' ');
}