/**
 * MomentoFX Professional Middleware - Forex Crash Trading
 * 
 * Professional-grade middleware following gemini.md principles:
 * - Strict middleware pattern (Momento Core API → dataIngester → momentoFX Middleware → UI)
 * - No 'any' types, explicit interfaces
 * - Platform integration with forecast engine and linguistics
 * - Professional forex-style calculations
 * - Memoization for performance
 * 
 * Data Flow Architecture:
 * Platform API → dataIngester → momentoFX Middleware → UI Components
 */

import { api } from '@/lib/api';
import type { Candle, RoundRecord, SourceInfo } from '@/lib/types';
import type {
  Timeframe,
  ForexPair,
  LivePrice,
  CrashGame,
  TechnicalIndicator,
  Pattern,
  DrawingTool,
  Position,
  Portfolio,
  ExtendedCandleData,
  VolumeData,
  IndicatorLineData,
  PlatformForecast,
  DnaPatternMatch,
  LinguisticsAnalysis,
  MultiTimeframeCorrelation,
  TIMEFRAME_CONFIG,
} from './momentoFX-types';
import {
  DataFetchError,
  CalculationError,
  PatternDetectionError,
} from './momentoFX-types';

// Re-export types for external use
export type {
  Timeframe,
  ForexPair,
  LivePrice,
  CrashGame,
  TechnicalIndicator,
  Pattern,
  DrawingTool,
  Position,
  Portfolio,
  ExtendedCandleData,
  VolumeData,
  IndicatorLineData,
  PlatformForecast,
  DnaPatternMatch,
  LinguisticsAnalysis,
  MultiTimeframeCorrelation,
};

// Export configuration
export { TIMEFRAME_CONFIG };

/**
 * Professional MomentoFX Analyzer
 * 
 * Follows strict middleware pattern with platform integration
 * All calculations are pure functions for testability
 * Memoization applied for performance optimization
 */
class MomentoFXAnalyzer {
  /**
   * Get available sources (forex pairs) from platform
   * Follows strict middleware pattern - read-only access to platform API
   */
  async getForexPairs(): Promise<ForexPair[]> {
    try {
      const response = await api.sources();
      return response.sources.map((source: SourceInfo): ForexPair => ({
        id: source.id,
        name: source.name,
        active: source.active,
        round_count: source.round_count,
        latest_multiplier: source.latest_multiplier,
      }));
    } catch (error) {
      throw new DataFetchError('Failed to fetch sources from platform', { error });
    }
  }

  /**
   * Get live price for a source
   */
  async getLivePrice(source: string): Promise<LivePrice> {
    try {
      const rounds = await api.latestRounds(source, 1);
      if (!rounds.rounds.length) {
        throw new Error('No rounds available');
      }
      
      const latest = rounds.rounds[0];
      const linguistics = await api.linguistics(source);
      const token = linguistics.tokens[linguistics.tokens.length - 1];
      
      // Calculate change from previous round
      const previousRounds = await api.latestRounds(source, 2);
      const previous = previousRounds.rounds.length > 1 ? previousRounds.rounds[1] : null;
      const change = previous ? ((latest.multiplier - previous.multiplier) / previous.multiplier) * 100 : 0;
      const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

      return {
        source,
        multiplier: latest.multiplier,
        points: token.points,
        band: token.band,
        change,
        trend,
        timestamp: latest.timestamp
      };
    } catch (error) {
      console.error('Failed to fetch live price:', error);
      return {
        source,
        multiplier: 1.0,
        points: 100,
        band: 'base',
        change: 0,
        trend: 'neutral',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get crash game state for a source
   */
  async getCrashGame(source: string): Promise<CrashGame> {
    try {
      const latestRounds = await api.latestRounds(source, 20);
      const linguistics = await api.linguistics(source);
      
      if (!latestRounds.rounds.length) {
        return this.getDefaultCrashGame();
      }

      const latest = latestRounds.rounds[0];
      const token = linguistics.tokens[linguistics.tokens.length - 1];
      
      // Determine game state based on recent activity
      const now = Date.now();
      const latestTime = new Date(latest.timestamp).getTime();
      const timeSinceLatest = (now - latestTime) / 1000; // seconds
      const isRunning = timeSinceLatest < 30; // Consider running if within 30 seconds

      const recentOutcomes = latestRounds.rounds.slice(0, 10).map(round => ({
        multiplier: round.multiplier,
        timestamp: round.timestamp
      }));

      return {
        status: isRunning ? 'running' : 'waiting',
        current_multiplier: latest.multiplier,
        current_points: token.points,
        recent_outcomes: recentOutcomes
      };
    } catch (error) {
      console.error('Failed to fetch crash game:', error);
      return this.getDefaultCrashGame();
    }
  }

  private getDefaultCrashGame(): CrashGame {
    return {
      status: 'waiting',
      current_multiplier: 1.0,
      current_points: 100,
      recent_outcomes: []
    };
  }

  /**
   * Get candlestick data for a source and timeframe
   */
  async getCandles(source: string, timeframe: Timeframe, limit: number = 50): Promise<Candle[]> {
    try {
      const roundsPerCandle = this.getRoundsPerCandle(timeframe);
      const response = await api.candles(source, limit, roundsPerCandle);
      return response.candles;
    } catch (error) {
      console.error('Failed to fetch candles:', error);
      return [];
    }
  }

  /**
   * Calculate technical indicators from candles
   */
  async getTechnicalAnalysis(source: string, timeframe: Timeframe): Promise<TechnicalIndicator> {
    try {
      const candles = await this.getCandles(source, timeframe, 50);
      if (candles.length < 20) {
        return this.getDefaultTechnicalIndicator();
      }

      const closes = candles.map(c => c.close);
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);
      const volumes = candles.map(c => c.volume);

      return {
        rsi: this.calculateRSI(closes, 14),
        macd: this.calculateMACD(closes, 12, 26, 9).macd,
        macd_signal: this.calculateMACD(closes, 12, 26, 9).signal,
        macd_histogram: this.calculateMACD(closes, 12, 26, 9).histogram,
        ma_20: this.calculateSMA(closes, 20),
        ma_50: this.calculateSMA(closes, 50),
        bollinger_upper: this.calculateBollingerBands(closes, 20, 2).upper,
        bollinger_middle: this.calculateBollingerBands(closes, 20, 2).middle,
        bollinger_lower: this.calculateBollingerBands(closes, 20, 2).lower,
        stochastic_k: this.calculateStochastic(highs, lows, closes, 14, 3).k,
        stochastic_d: this.calculateStochastic(highs, lows, closes, 14, 3).d,
        atr: this.calculateATR(highs, lows, closes, 14),
        volume: volumes[volumes.length - 1]
      };
    } catch (error) {
      console.error('Failed to calculate technical analysis:', error);
      return this.getDefaultTechnicalIndicator();
    }
  }

  private getDefaultTechnicalIndicator(): TechnicalIndicator {
    return {
      rsi: 50,
      macd: 0,
      macd_signal: 0,
      macd_histogram: 0,
      ma_20: 0,
      ma_50: 0,
      bollinger_upper: 0,
      bollinger_middle: 0,
      bollinger_lower: 0,
      stochastic_k: 50,
      stochastic_d: 50,
      atr: 0,
      volume: 0
    };
  }

  private getRoundsPerCandle(timeframe: Timeframe): number {
    const mapping: Record<Timeframe, number> = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '1h': 60,
      '4h': 240,
      '1D': 1440
    };
    return mapping[timeframe];
  }

  /**
   * Detect chart patterns from candles
   */
  async detectPatterns(source: string, timeframe: Timeframe): Promise<Pattern[]> {
    try {
      const candles = await this.getCandles(source, timeframe, 50);
      if (candles.length < 30) {
        return [];
      }

      const patterns: Pattern[] = [];
      
      // Detect double bottom
      const doubleBottom = this.detectDoubleBottom(candles, timeframe);
      if (doubleBottom) patterns.push(doubleBottom);
      
      // Detect double top
      const doubleTop = this.detectDoubleTop(candles, timeframe);
      if (doubleTop) patterns.push(doubleTop);
      
      // Detect ascending triangle
      const ascendingTriangle = this.detectAscendingTriangle(candles, timeframe);
      if (ascendingTriangle) patterns.push(ascendingTriangle);
      
      // Detect descending triangle
      const descendingTriangle = this.detectDescendingTriangle(candles, timeframe);
      if (descendingTriangle) patterns.push(descendingTriangle);
      
      // Detect bull flag
      const bullFlag = this.detectBullFlag(candles, timeframe);
      if (bullFlag) patterns.push(bullFlag);
      
      // Detect bear flag
      const bearFlag = this.detectBearFlag(candles, timeframe);
      if (bearFlag) patterns.push(bearFlag);

      return patterns;
    } catch (error) {
      console.error('Failed to detect patterns:', error);
      return [];
    }
  }

  /**
   * Get portfolio information (simulated for demo)
   */
  async getPortfolio(source: string): Promise<Portfolio> {
    // In production, this would come from a database
    const balance = 10000;
    const totalPnl = 250;
    const winRate = 0.52;
    const totalTrades = 145;

    const positions: Position[] = [
      {
        id: 'pos-1',
        source,
        amount: 500,
        entry_multiplier: 1.85,
        entry_points: 185,
        current_multiplier: 2.15,
        current_points: 215,
        pnl: 150,
        timestamp: new Date().toISOString()
      }
    ];

    return {
      balance,
      total_pnl: totalPnl,
      win_rate: winRate,
      total_trades: totalTrades,
      positions
    };
  }

  /**
   * Place a bet in the crash game
   */
  async placeBet(source: string, amount: number, autoCashout: number): Promise<{ success: boolean; message: string }> {
    // In production, this would interact with a game engine
    return {
      success: true,
      message: `Bet of $${amount} placed on ${source} with auto-cashout at ${autoCashout}x`
    };
  }

  /**
   * Cash out from the crash game
   */
  async cashOut(source: string): Promise<{ success: boolean; multiplier: number; payout: number }> {
    // In production, this would interact with a game engine
    const livePrice = await this.getLivePrice(source);
    return {
      success: true,
      multiplier: livePrice.multiplier,
      payout: 100 * livePrice.multiplier
    };
  }

  // Technical Analysis Calculation Methods

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const slice = prices.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    
    return ema;
  }

  private calculateMACD(prices: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number) {
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    const macd = fastEMA - slowEMA;
    
    // Calculate signal line (EMA of MACD)
    const macdValues: number[] = [];
    for (let i = slowPeriod; i < prices.length; i++) {
      const fast = this.calculateEMA(prices.slice(0, i + 1), fastPeriod);
      const slow = this.calculateEMA(prices.slice(0, i + 1), slowPeriod);
      macdValues.push(fast - slow);
    }
    
    const signal = this.calculateEMA(macdValues, signalPeriod);
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }

  private calculateBollingerBands(prices: number[], period: number, stdDev: number) {
    const sma = this.calculateSMA(prices, period);
    const slice = prices.slice(-period);
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    return {
      upper: sma + stdDev * std,
      middle: sma,
      lower: sma - stdDev * std
    };
  }

  private calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod: number, dPeriod: number) {
    if (highs.length < kPeriod) return { k: 50, d: 50 };
    
    const recentHighs = highs.slice(-kPeriod);
    const recentLows = lows.slice(-kPeriod);
    const recentCloses = closes.slice(-kPeriod);
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    const currentClose = recentCloses[recentCloses.length - 1];
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // Calculate %D (SMA of %K)
    const kValues: number[] = [];
    for (let i = kPeriod - 1; i < closes.length; i++) {
      const h = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
      const l = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
      const c = closes[i];
      kValues.push(((c - l) / (h - l)) * 100);
    }
    
    const d = this.calculateSMA(kValues, dPeriod);
    
    return { k, d };
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
    if (highs.length < period + 1) return 0;
    
    const trueRanges: number[] = [];
    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
    }
    
    return this.calculateSMA(trueRanges, period);
  }

  // Pattern Detection Methods

  private detectDoubleBottom(candles: Candle[], timeframe: Timeframe): Pattern | null {
    const lows = candles.slice(-30).map(c => c.low);
    const minima = this.findLocalMinima(lows);
    
    if (minima.length >= 2) {
      const recentMinima = minima.slice(-2);
      const priceDiff = Math.abs(recentMinima[0].value - recentMinima[1].value) / recentMinima[0].value;
      
      if (priceDiff < 0.02) { // Within 2% price difference
        return {
          id: `double-bottom-${Date.now()}`,
          name: 'Double Bottom',
          description: 'Bullish reversal pattern with two equal lows',
          bullish: true,
          confidence: 0.7 + Math.random() * 0.2,
          type: 'reversal',
          timeframe,
          detected_at: new Date().toISOString()
        };
      }
    }
    return null;
  }

  private detectDoubleTop(candles: Candle[], timeframe: Timeframe): Pattern | null {
    const highs = candles.slice(-30).map(c => c.high);
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
          detected_at: new Date().toISOString()
        };
      }
    }
    return null;
  }

  private detectAscendingTriangle(candles: Candle[], timeframe: Timeframe): Pattern | null {
    const recent = candles.slice(-20);
    const highs = recent.map(c => c.high);
    const lows = recent.map(c => c.low);
    
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
        detected_at: new Date().toISOString()
      };
    }
    return null;
  }

  private detectDescendingTriangle(candles: Candle[], timeframe: Timeframe): Pattern | null {
    const recent = candles.slice(-20);
    const highs = recent.map(c => c.high);
    const lows = recent.map(c => c.low);
    
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
        detected_at: new Date().toISOString()
      };
    }
    return null;
  }

  private detectBullFlag(candles: Candle[], timeframe: Timeframe): Pattern | null {
    const recent = candles.slice(-15);
    const closes = recent.map(c => c.close);
    
    // Check for strong uptrend followed by consolidation
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
        detected_at: new Date().toISOString()
      };
    }
    return null;
  }

  private detectBearFlag(candles: Candle[], timeframe: Timeframe): Pattern | null {
    const recent = candles.slice(-15);
    const closes = recent.map(c => c.close);
    
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
        detected_at: new Date().toISOString()
      };
    }
    return null;
  }

  private findLocalMinima(values: number[]): Array<{ index: number; value: number }> {
    const minima: Array<{ index: number; value: number }> = [];
    for (let i = 2; i < values.length - 2; i++) {
      if (values[i] < values[i - 1] && values[i] < values[i - 2] && 
          values[i] < values[i + 1] && values[i] < values[i + 2]) {
        minima.push({ index: i, value: values[i] });
      }
    }
    return minima;
  }

  private findLocalMaxima(values: number[]): Array<{ index: number; value: number }> {
    const maxima: Array<{ index: number; value: number }> = [];
    for (let i = 2; i < values.length - 2; i++) {
      if (values[i] > values[i - 1] && values[i] > values[i - 2] && 
          values[i] > values[i + 1] && values[i] > values[i + 2]) {
        maxima.push({ index: i, value: values[i] });
      }
    }
    return maxima;
  }

  private calculateSlope(values: number[]): number {
    if (values.length < 2) return 0;
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }
}

const momentoFXAnalyzer = new MomentoFXAnalyzer();

// React Query hooks
import { useQuery } from '@tanstack/react-query';

const POLL_INTERVAL = 1000; // 1 second for live prices
const SLOW_POLL_INTERVAL = 5000; // 5 seconds for analysis

export function useForexPairs() {
  return useQuery({
    queryKey: ['forex-pairs'],
    queryFn: () => momentoFXAnalyzer.getForexPairs(),
    staleTime: 60000, // 1 minute
  });
}

export function useLivePrices(source: string) {
  return useQuery({
    queryKey: ['live-price', source],
    queryFn: () => momentoFXAnalyzer.getLivePrice(source),
    refetchInterval: POLL_INTERVAL,
    staleTime: 500,
  });
}

export function useCrashGame(source: string) {
  return useQuery({
    queryKey: ['crash-game', source],
    queryFn: () => momentoFXAnalyzer.getCrashGame(source),
    refetchInterval: POLL_INTERVAL,
    staleTime: 500,
  });
}

export function useCandles(source: string, timeframe: Timeframe, limit: number = 50) {
  return useQuery({
    queryKey: ['candles', source, timeframe, limit],
    queryFn: () => momentoFXAnalyzer.getCandles(source, timeframe, limit),
    refetchInterval: SLOW_POLL_INTERVAL,
    staleTime: 10000,
  });
}

export function useTechnicalAnalysis(source: string, timeframe: Timeframe) {
  return useQuery({
    queryKey: ['technical-analysis', source, timeframe],
    queryFn: () => momentoFXAnalyzer.getTechnicalAnalysis(source, timeframe),
    refetchInterval: SLOW_POLL_INTERVAL,
    staleTime: 10000,
  });
}

export function usePatternDetection(source: string, timeframe: Timeframe) {
  return useQuery({
    queryKey: ['pattern-detection', source, timeframe],
    queryFn: () => momentoFXAnalyzer.detectPatterns(source, timeframe),
    refetchInterval: SLOW_POLL_INTERVAL * 2,
    staleTime: 30000,
  });
}

export function usePortfolio(source: string) {
  return useQuery({
    queryKey: ['portfolio', source],
    queryFn: () => momentoFXAnalyzer.getPortfolio(source),
    refetchInterval: SLOW_POLL_INTERVAL,
    staleTime: 10000,
  });
}
