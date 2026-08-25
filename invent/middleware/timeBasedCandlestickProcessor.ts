/**
 * Time-Based Candlestick Processor
 * 
 * Creates candlesticks using fixed time durations with round time calculations
 * and handles large multipliers spanning multiple timeframes
 */

import { dataIngester } from './dataIngester';
import type {
  MegaplanTimeframe,
  TimeBasedCandlestick,
  RoundTimeData,
  MEGAPLAN_TIMEFRAME_CONFIG,
  CandlestickProcessingError
} from './megaplan-types';

class TimeBasedCandlestickProcessor {
  private config: { analysis_window: number; timeframes: MegaplanTimeframe[] };
  private largeMultiplierThreshold: number;

  constructor(config?: { analysis_window?: number; timeframes?: MegaplanTimeframe[] }) {
    this.config = {
      analysis_window: config?.analysis_window || 300,
      timeframes: config?.timeframes || ['1m', '5m', '15m', '1h']
    };
    this.largeMultiplierThreshold = 1000;
  }

  /**
   * Calculate time from previous round for each round
   */
  private calculateRoundTimes(rounds: any[]): RoundTimeData[] {
    const roundTimes: RoundTimeData[] = [];
    
    for (let i = 0; i < rounds.length; i++) {
      const currentRound = rounds[i];
      const currentTime = new Date(currentRound.timestamp).getTime();
      
      let timeFromPrevious = 0;
      if (i > 0) {
        const previousTime = new Date(rounds[i - 1].timestamp).getTime();
        timeFromPrevious = currentTime - previousTime;
      }
      
      roundTimes.push({
        round_id: currentRound.id,
        multiplier: currentRound.multiplier,
        timestamp: currentRound.timestamp,
        time_from_previous: timeFromPrevious
      });
    }
    
    return roundTimes;
  }

  /**
   * Divide large multiplier across multiple timeframes proportionally
   */
  private divideLargeMultiplier(
    multiplier: number,
    startTime: number,
    endTime: number,
    timeframes: MegaplanTimeframe[]
  ): Array<{ timeframe: MegaplanTimeframe; portion: number }> {
    if (multiplier < this.largeMultiplierThreshold) {
      return [];
    }

    const totalDuration = endTime - startTime;
    const divisions: Array<{ timeframe: MegaplanTimeframe; portion: number }> = [];
    
    let currentTime = startTime;
    const sortedTimeframes = timeframes.sort((a, b) => 
      MEGAPLAN_TIMEFRAME_CONFIG[a].durationMinutes - MEGAPLAN_TIMEFRAME_CONFIG[b].durationMinutes
    );
    
    for (const tf of sortedTimeframes) {
      if (currentTime >= endTime) break;
      
      const tfDurationMs = MEGAPLAN_TIMEFRAME_CONFIG[tf].durationMinutes * 60 * 1000;
      const tfEndTime = Math.min(currentTime + tfDurationMs, endTime);
      const tfDuration = tfEndTime - currentTime;
      
      if (tfDuration > 0) {
        const portion = (tfDuration / totalDuration) * multiplier;
        divisions.push({
          timeframe: tf,
          portion: portion
        });
      }
      
      currentTime = tfEndTime;
    }
    
    return divisions;
  }

  /**
   * Create time-based candlesticks for a specific timeframe
   */
  async createCandlesticks(
    source: string,
    timeframe: MegaplanTimeframe,
    limit?: number
  ): Promise<TimeBasedCandlestick[]> {
    try {
      const analysisLimit = limit || this.config.analysis_window;
      const rounds = await dataIngester.getRounds(source, analysisLimit);
      
      if (rounds.length === 0) {
        return [];
      }

      const roundTimes = this.calculateRoundTimes(rounds);
      const timeframeDurationMs = MEGAPLAN_TIMEFRAME_CONFIG[timeframe].durationMinutes * 60 * 1000;
      
      // Group rounds into time-based candles
      const candleMap = new Map<number, any[]>();
      
      roundTimes.forEach((roundData, index) => {
        const roundTime = new Date(roundData.timestamp).getTime();
        const candleStartTime = Math.floor(roundTime / timeframeDurationMs) * timeframeDurationMs;
        
        if (!candleMap.has(candleStartTime)) {
          candleMap.set(candleStartTime, []);
        }
        
        candleMap.get(candleStartTime)!.push({
          ...roundData,
          original_round: rounds[index]
        });
      });

      // Convert map to candlesticks
      const candlesticks: TimeBasedCandlestick[] = [];
      const sortedCandleTimes = Array.from(candleMap.keys()).sort((a, b) => a - b);
      
      for (const candleTime of sortedCandleTimes) {
        const roundsInCandle = candleMap.get(candleTime)!;
        const multipliers = roundsInCandle.map(r => r.multiplier);
        
        // Calculate candlestick OHLC
        const open = multipliers[0];
        const close = multipliers[multipliers.length - 1];
        const high = Math.max(...multipliers);
        const low = Math.min(...multipliers);
        const peakMultiplier = high;
        
        // Calculate round times for this candle
        const roundTimesInCandle = roundsInCandle.map(r => r.time_from_previous);
        
        // Handle large multipliers
        const largeMultiplierDivisions = roundsInCandle
          .filter(r => r.multiplier >= this.largeMultiplierThreshold)
          .map(r => {
            const roundStartTime = new Date(r.timestamp).getTime();
            const roundEndTime = roundStartTime + r.time_from_previous;
            
            return {
              original_multiplier: r.multiplier,
              divisions: this.divideLargeMultiplier(
                r.multiplier,
                roundStartTime,
                roundEndTime,
                this.config.timeframes
              )
            };
          });

        candlesticks.push({
          time: Math.floor(candleTime / 1000), // Convert to seconds for charting
          open,
          high,
          low,
          close,
          round_times: roundTimesInCandle,
          large_multiplier_divisions: largeMultiplierDivisions,
          round_count: roundsInCandle.length,
          peak_multiplier
        });
      }

      return candlesticks;
    } catch (error) {
      throw new CandlestickProcessingError(
        `Failed to create candlesticks: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { source, timeframe }
      );
    }
  }

  /**
   * Create candlesticks for multiple timeframes
   */
  async createMultiTimeframeCandlesticks(
    source: string,
    limit?: number
  ): Promise<Map<MegaplanTimeframe, TimeBasedCandlestick[]>> {
    const candlestickMap = new Map<MegaplanTimeframe, TimeBasedCandlestick[]>();
    
    for (const timeframe of this.config.timeframes) {
      try {
        const candlesticks = await this.createCandlesticks(source, timeframe, limit);
        candlestickMap.set(timeframe, candlesticks);
      } catch (error) {
        console.error(`Failed to create candlesticks for timeframe ${timeframe}:`, error);
        candlestickMap.set(timeframe, []);
      }
    }
    
    return candlestickMap;
  }

  /**
   * Get candlestick statistics for analysis
   */
  getCandlestickStatistics(candlesticks: TimeBasedCandlestick[]): {
    avg_round_count: number;
    avg_peak_multiplier: number;
    volatility: number;
    large_multiplier_count: number;
    timeframe_coverage: number;
  } {
    if (candlesticks.length === 0) {
      return {
        avg_round_count: 0,
        avg_peak_multiplier: 0,
        volatility: 0,
        large_multiplier_count: 0,
        timeframe_coverage: 0
      };
    }

    const roundCounts = candlesticks.map(c => c.round_count);
    const peakMultipliers = candlesticks.map(c => c.peak_multiplier);
    const largeMultiplierCount = candlesticks.reduce(
      (sum, c) => sum + c.large_multiplier_divisions.length,
      0
    );

    // Calculate volatility (standard deviation of closes)
    const closes = candlesticks.map(c => c.close);
    const mean = closes.reduce((sum, val) => sum + val, 0) / closes.length;
    const variance = closes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / closes.length;
    const volatility = Math.sqrt(variance);

    // Calculate timeframe coverage
    const timeSpan = candlesticks[candlesticks.length - 1].time - candlesticks[0].time;
    const expectedCandles = timeSpan / (MEGAPLAN_TIMEFRAME_CONFIG['1m'].durationMinutes * 60);
    const timeframeCoverage = candlesticks.length / expectedCandles;

    return {
      avg_round_count: roundCounts.reduce((sum, val) => sum + val, 0) / roundCounts.length,
      avg_peak_multiplier: peakMultipliers.reduce((sum, val) => sum + val, 0) / peakMultipliers.length,
      volatility,
      large_multiplier_count: largeMultiplierCount,
      timeframe_coverage
    };
  }

  /**
   * Detect patterns in candlestick data
   */
  detectCandlestickPatterns(candlesticks: TimeBasedCandlestick[]): Array<{
    type: string;
    description: string;
    confidence: number;
  }> {
    const patterns: Array<{ type: string; description: string; confidence: number }> = [];
    
    if (candlesticks.length < 5) return patterns;

    const recentCandles = candlesticks.slice(-10);
    
    // Detect increasing volatility
    const volatilities = [];
    for (let i = 1; i < recentCandles.length; i++) {
      const range = recentCandles[i].high - recentCandles[i].low;
      volatilities.push(range);
    }
    
    if (volatilities.length > 3) {
      const recentVolatility = volatilities.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const earlierVolatility = volatilities.slice(0, -3).reduce((a, b) => a + b, 0) / (volatilities.length - 3);
      
      if (recentVolatility > earlierVolatility * 1.5) {
        patterns.push({
          type: 'increasing_volatility',
          description: 'Volatility is increasing in recent candles',
          confidence: 0.7
        });
      }
    }

    // Detect peak multiplier clustering
    const recentPeaks = recentCandles.map(c => c.peak_multiplier);
    const highPeaks = recentPeaks.filter(p => p > 10).length;
    
    if (highPeaks >= 3) {
      patterns.push({
        type: 'peak_clustering',
        description: 'Multiple high peak multipliers detected in recent candles',
        confidence: Math.min(highPeaks / 5, 0.9)
      });
    }

    // Detect large multiplier presence
    const largeMultiplierCandles = recentCandles.filter(
      c => c.large_multiplier_divisions.length > 0
    ).length;
    
    if (largeMultiplierCandles > 0) {
      patterns.push({
        type: 'large_multiplier_presence',
        description: `Large multipliers detected in ${largeMultiplierCandles} recent candles`,
        confidence: 0.8
      });
    }

    return patterns;
  }

  /**
   * Update configuration
   */
  updateConfig(config: {
    analysis_window?: number;
    timeframes?: MegaplanTimeframe[];
    large_multiplier_threshold?: number;
  }): void {
    if (config.analysis_window !== undefined) {
      this.config.analysis_window = config.analysis_window;
    }
    if (config.timeframes !== undefined) {
      this.config.timeframes = config.timeframes;
    }
    if (config.large_multiplier_threshold !== undefined) {
      this.largeMultiplierThreshold = config.large_multiplier_threshold;
    }
  }
}

export const timeBasedCandlestickProcessor = new TimeBasedCandlestickProcessor();
export type { TimeBasedCandlestick, RoundTimeData, MegaplanTimeframe };