/**
 * Momentum Compression Analyzer
 * 
 * Predicts momentum using distance between release rounds
 * Computes compression vs release points and forecasts clusters
 */

import { dataIngester } from './dataIngester';
import type {
  MomentumCompressionAnalysis,
  CompressionReleasePattern,
  MomentumAnalysisError
} from './megaplan-types';

class MomentumCompressionAnalyzer {
  private analysisWindow: number;
  private compressionThreshold: number;
  private releaseThreshold: number;

  constructor(analysisWindow: number = 300) {
    this.analysisWindow = analysisWindow;
    this.compressionThreshold = 2.0; // Multiplier below this is considered compression
    this.releaseThreshold = 10.0; // Multiplier above this is considered release
  }

  /**
   * Identify compression points (low multipliers)
   */
  private identifyCompressionPoints(rounds: any[]): number[] {
    return rounds
      .filter(r => r.multiplier < this.compressionThreshold)
      .map(r => r.multiplier);
  }

  /**
   * Identify release points (high multipliers)
   */
  private identifyReleasePoints(rounds: any[]): number[] {
    return rounds
      .filter(r => r.multiplier >= this.releaseThreshold)
      .map(r => r.multiplier);
  }

  /**
   * Calculate distance between release rounds
   */
  private calculateReleaseDistances(rounds: any[]): number[] {
    const releaseIndices = rounds
      .map((r, index) => ({ multiplier: r.multiplier, index }))
      .filter(r => r.multiplier >= this.releaseThreshold)
      .map(r => r.index);

    const distances: number[] = [];
    for (let i = 1; i < releaseIndices.length; i++) {
      distances.push(releaseIndices[i] - releaseIndices[i - 1]);
    }

    return distances;
  }

  /**
   * Calculate momentum score based on release patterns
   */
  private calculateMomentumScore(
    releasePoints: number[],
    releaseDistances: number[]
  ): number {
    if (releasePoints.length === 0) return 0;

    // More frequent releases = higher momentum
    const avgDistance = releaseDistances.length > 0
      ? releaseDistances.reduce((sum, val) => sum + val, 0) / releaseDistances.length
      : this.analysisWindow;

    const frequencyScore = Math.min(1.0, (this.analysisWindow / avgDistance) * 0.5);

    // Higher release multipliers = higher momentum
    const avgRelease = releasePoints.reduce((sum, val) => sum + val, 0) / releasePoints.length;
    const magnitudeScore = Math.min(1.0, avgRelease / 50) * 0.3;

    // Recent releases = higher momentum
    const recentReleases = releasePoints.slice(-5).length;
    const recencyScore = Math.min(1.0, recentReleases / 5) * 0.2;

    return frequencyScore + magnitudeScore + recencyScore;
  }

  /**
   * Calculate compression ratio
   */
  private calculateCompressionRatio(
    compressionPoints: number[],
    releasePoints: number[]
  ): number {
    const totalPoints = compressionPoints.length + releasePoints.length;
    if (totalPoints === 0) return 0;

    return compressionPoints.length / totalPoints;
  }

  /**
   * Detect compression-release patterns
   */
  private detectCompressionReleasePatterns(
    rounds: any[]
  ): CompressionReleasePattern[] {
    const patterns: CompressionReleasePattern[] = [];
    
    let currentPattern: CompressionReleasePattern | null = null;
    let compressionRounds: number[] = [];
    let releaseRounds: number[] = [];

    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];
      const isCompression = round.multiplier < this.compressionThreshold;
      const isRelease = round.multiplier >= this.releaseThreshold;

      if (isCompression && (!currentPattern || currentPattern.pattern_type !== 'gradual')) {
        // Start or continue compression
        if (!currentPattern) {
          currentPattern = {
            compression_rounds: [],
            release_rounds: [],
            compression_duration: 0,
            release_magnitude: 0,
            pattern_type: 'gradual'
          };
        }
        compressionRounds.push(round.multiplier);
      } else if (isRelease) {
        // Release detected
        if (currentPattern) {
          currentPattern.compression_rounds = [...compressionRounds];
          currentPattern.release_rounds = [round.multiplier];
          currentPattern.compression_duration = compressionRounds.length;
          currentPattern.release_magnitude = round.multiplier;
          
          // Determine pattern type
          if (compressionRounds.length > 20) {
            currentPattern.pattern_type = 'gradual';
          } else if (compressionRounds.length < 5) {
            currentPattern.pattern_type = 'sudden';
          } else {
            currentPattern.pattern_type = 'oscillating';
          }
          
          patterns.push({ ...currentPattern });
          
          // Reset for next pattern
          compressionRounds = [];
          currentPattern = null;
        } else {
          // Standalone release without compression
          patterns.push({
            compression_rounds: [],
            release_rounds: [round.multiplier],
            compression_duration: 0,
            release_magnitude: round.multiplier,
            pattern_type: 'sudden'
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Calculate cluster probability based on momentum and compression
   */
  private calculateClusterProbability(
    momentumScore: number,
    compressionRatio: number,
    patterns: CompressionReleasePattern[]
  ): number {
    // High momentum + low compression = high cluster probability
    const momentumFactor = momentumScore * 0.4;
    
    // Low compression ratio (more releases) = higher cluster probability
    const compressionFactor = (1 - compressionRatio) * 0.3;
    
    // Pattern consistency factor
    const patternConsistency = this.calculatePatternConsistency(patterns);
    const patternFactor = patternConsistency * 0.3;

    return Math.min(1.0, momentumFactor + compressionFactor + patternFactor);
  }

  /**
   * Calculate pattern consistency
   */
  private calculatePatternConsistency(patterns: CompressionReleasePattern[]): number {
    if (patterns.length === 0) return 0;

    // Check if patterns follow similar structures
    const patternTypes = patterns.map(p => p.pattern_type);
    const typeCounts = patternTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
    const consistency = dominantType ? dominantType[1] / patterns.length : 0;

    return consistency;
  }

  /**
   * Predict expected cluster timing
   */
  private predictClusterTiming(
    releaseDistances: number[],
    momentumScore: number
  ): number {
    if (releaseDistances.length === 0) {
      return Math.round(this.analysisWindow * 0.5); // Default to half the analysis window
    }

    const avgDistance = releaseDistances.reduce((sum, val) => sum + val, 0) / releaseDistances.length;
    
    // Higher momentum = shorter expected time to next cluster
    const momentumAdjustment = 1 - (momentumScore * 0.5);
    const expectedTiming = Math.round(avgDistance * momentumAdjustment);

    return Math.max(1, expectedTiming);
  }

  /**
   * Generate pattern description
   */
  private generatePatternDescription(
    patterns: CompressionReleasePattern[],
    momentumScore: number,
    compressionRatio: number
  ): string {
    if (patterns.length === 0) {
      return 'No clear compression-release patterns detected';
    }

    const dominantPattern = patterns.reduce((acc, pattern) => {
      const accCount = patterns.filter(p => p.pattern_type === acc.pattern_type).length;
      const patternCount = patterns.filter(p => p.pattern_type === pattern.pattern_type).length;
      return patternCount > accCount ? pattern : acc;
    }, patterns[0]);

    const momentumLevel = momentumScore > 0.7 ? 'high' : momentumScore > 0.4 ? 'moderate' : 'low';
    const compressionLevel = compressionRatio > 0.7 ? 'high' : compressionRatio > 0.4 ? 'moderate' : 'low';

    return `${dominantPattern.pattern_type} compression-release pattern with ${momentumLevel} momentum and ${compressionLevel} compression. Detected ${patterns.length} patterns in analysis window.`;
  }

  /**
   * Calculate confidence score for the analysis
   */
  private calculateConfidence(
    releasePoints: number[],
    patterns: CompressionReleasePattern[],
    dataQuality: number
  ): number {
    // More release points = higher confidence
    const releaseFactor = Math.min(1.0, releasePoints.length / 10) * 0.4;
    
    // More patterns = higher confidence
    const patternFactor = Math.min(1.0, patterns.length / 5) * 0.3;
    
    // Data quality factor
    const qualityFactor = dataQuality * 0.3;

    return Math.min(1.0, releaseFactor + patternFactor + qualityFactor);
  }

  /**
   * Main analysis method
   */
  async analyzeMomentumCompression(source: string): Promise<MomentumCompressionAnalysis> {
    try {
      const rounds = await dataIngester.getRounds(source, this.analysisWindow);
      
      if (rounds.length < 10) {
        throw new MomentumAnalysisError(
          'Insufficient data for momentum compression analysis',
          { roundCount: rounds.length }
        );
      }

      // Identify compression and release points
      const compressionPoints = this.identifyCompressionPoints(rounds);
      const releasePoints = this.identifyReleasePoints(rounds);

      // Calculate release distances
      const releaseDistances = this.calculateReleaseDistances(rounds);

      // Calculate momentum score
      const momentumScore = this.calculateMomentumScore(releasePoints, releaseDistances);

      // Calculate compression ratio
      const compressionRatio = this.calculateCompressionRatio(compressionPoints, releasePoints);

      // Detect patterns
      const patterns = this.detectCompressionReleasePatterns(rounds);

      // Calculate cluster probability
      const clusterProbability = this.calculateClusterProbability(
        momentumScore,
        compressionRatio,
        patterns
      );

      // Predict cluster timing
      const expectedClusterTiming = this.predictClusterTiming(releaseDistances, momentumScore);

      // Generate pattern description
      const patternDescription = this.generatePatternDescription(
        patterns,
        momentumScore,
        compressionRatio
      );

      // Calculate confidence
      const dataQuality = rounds.length / this.analysisWindow;
      const confidence = this.calculateConfidence(releasePoints, patterns, dataQuality);

      return {
        compression_points: compressionPoints,
        release_points: releasePoints,
        momentum_score: momentumScore,
        compression_ratio: compressionRatio,
        cluster_probability: clusterProbability,
        expected_cluster_timing: expectedClusterTiming,
        pattern: patternDescription,
        confidence
      };
    } catch (error) {
      if (error instanceof MomentumAnalysisError) {
        throw error;
      }
      throw new MomentumAnalysisError(
        `Failed to analyze momentum compression: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { source }
      );
    }
  }

  /**
   * Analyze custom data (for testing or custom analysis)
   */
  analyzeCustomMomentumCompression(rounds: any[]): MomentumCompressionAnalysis {
    if (rounds.length < 10) {
      throw new MomentumAnalysisError(
        'Insufficient data for momentum compression analysis',
        { roundCount: rounds.length }
      );
    }

    const compressionPoints = this.identifyCompressionPoints(rounds);
    const releasePoints = this.identifyReleasePoints(rounds);
    const releaseDistances = this.calculateReleaseDistances(rounds);
    const momentumScore = this.calculateMomentumScore(releasePoints, releaseDistances);
    const compressionRatio = this.calculateCompressionRatio(compressionPoints, releasePoints);
    const patterns = this.detectCompressionReleasePatterns(rounds);
    const clusterProbability = this.calculateClusterProbability(
      momentumScore,
      compressionRatio,
      patterns
    );
    const expectedClusterTiming = this.predictClusterTiming(releaseDistances, momentumScore);
    const patternDescription = this.generatePatternDescription(
      patterns,
      momentumScore,
      compressionRatio
    );
    const dataQuality = rounds.length / this.analysisWindow;
    const confidence = this.calculateConfidence(releasePoints, patterns, dataQuality);

    return {
      compression_points: compressionPoints,
      release_points: releasePoints,
      momentum_score: momentumScore,
      compression_ratio: compressionRatio,
      cluster_probability: clusterProbability,
      expected_cluster_timing: expectedClusterTiming,
      pattern: patternDescription,
      confidence
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: {
    analysis_window?: number;
    compression_threshold?: number;
    release_threshold?: number;
  }): void {
    if (config.analysis_window !== undefined) {
      this.analysisWindow = config.analysis_window;
    }
    if (config.compression_threshold !== undefined) {
      this.compressionThreshold = config.compression_threshold;
    }
    if (config.release_threshold !== undefined) {
      this.releaseThreshold = config.release_threshold;
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      analysis_window: this.analysisWindow,
      compression_threshold: this.compressionThreshold,
      release_threshold: this.releaseThreshold
    };
  }
}

export const momentumCompressionAnalyzer = new MomentumCompressionAnalyzer();
export type { MomentumCompressionAnalysis, CompressionReleasePattern };