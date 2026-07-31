/**
 * MomentoFX Middleware - Forex Crash Trading
 * 
 * Provides data processing, crash game mechanics, technical analysis,
 * and portfolio management for forex crash trading.
 */

import { dataIngester } from './dataIngester';

interface ForexPair {
  symbol: string;
  name: string;
  base_currency: string;
  quote_currency: string;
  pip_value: number;
  spread: number;
}

interface LivePrice {
  symbol: string;
  price: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  timestamp: string;
}

interface CrashGame {
  status: 'waiting' | 'running' | 'crashed';
  current_multiplier: number;
  start_price: number;
  current_price: number;
  recent_outcomes: Array<{
    multiplier: number;
    timestamp: string;
  }>;
}

interface TechnicalIndicator {
  rsi: number;
  macd: number;
  macd_signal: number;
  ma_20: number;
  ma_50: number;
  volatility: number;
  atr: number;
}

interface Pattern {
  name: string;
  description: string;
  bullish: boolean;
  confidence: number;
}

interface Position {
  pair: string;
  amount: number;
  entry_price: number;
  current_price: number;
  pnl: number;
  status: 'open' | 'closed';
}

interface Portfolio {
  balance: number;
  total_pnl: number;
  win_rate: number;
  total_trades: number;
  positions: Position[];
}

class MomentoFXAnalyzer {
  /**
   * Get available forex pairs
   */
  async getForexPairs(): Promise<ForexPair[]> {
    // Simulated forex pairs - in production, this would come from a forex API
    return [
      { symbol: 'EURUSD', name: 'Euro/US Dollar', base_currency: 'EUR', quote_currency: 'USD', pip_value: 0.0001, spread: 0.0002 },
      { symbol: 'GBPUSD', name: 'British Pound/US Dollar', base_currency: 'GBP', quote_currency: 'USD', pip_value: 0.0001, spread: 0.0003 },
      { symbol: 'USDJPY', name: 'US Dollar/Japanese Yen', base_currency: 'USD', quote_currency: 'JPY', pip_value: 0.01, spread: 0.02 },
      { symbol: 'AUDUSD', name: 'Australian Dollar/US Dollar', base_currency: 'AUD', quote_currency: 'USD', pip_value: 0.0001, spread: 0.0002 },
      { symbol: 'USDCAD', name: 'US Dollar/Canadian Dollar', base_currency: 'USD', quote_currency: 'CAD', pip_value: 0.0001, spread: 0.0003 },
      { symbol: 'USDCHF', name: 'US Dollar/Swiss Franc', base_currency: 'USD', quote_currency: 'CHF', pip_value: 0.0001, spread: 0.0003 },
      { symbol: 'NZDUSD', name: 'New Zealand Dollar/US Dollar', base_currency: 'NZD', quote_currency: 'USD', pip_value: 0.0001, spread: 0.0004 },
      { symbol: 'EURGBP', name: 'Euro/British Pound', base_currency: 'EUR', quote_currency: 'GBP', pip_value: 0.0001, spread: 0.0003 },
    ];
  }

  /**
   * Get live price for a forex pair
   */
  async getLivePrice(symbol: string): Promise<LivePrice> {
    // Simulated live price - in production, this would come from a forex API
    const basePrices: Record<string, number> = {
      'EURUSD': 1.0850,
      'GBPUSD': 1.2650,
      'USDJPY': 149.50,
      'AUDUSD': 0.6550,
      'USDCAD': 1.3650,
      'USDCHF': 0.8850,
      'NZDUSD': 0.6050,
      'EURGBP': 0.8570,
    };

    const basePrice = basePrices[symbol] || 1.0;
    const variation = (Math.random() - 0.5) * 0.0010;
    const price = basePrice + variation;
    const change = (variation / basePrice) * 100;
    const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

    return {
      symbol,
      price,
      change,
      trend,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get crash game state for a forex pair
   */
  async getCrashGame(symbol: string): Promise<CrashGame> {
    // Simulated crash game - in production, this would use real price movements
    const isRunning = Math.random() > 0.3;
    const multiplier = isRunning ? 1.0 + Math.random() * 5.0 : 1.0;
    const livePrice = await this.getLivePrice(symbol);

    // Generate recent outcomes
    const recentOutcomes = Array.from({ length: 10 }, () => ({
      multiplier: 1.0 + Math.random() * 10.0,
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString()
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      status: isRunning ? 'running' : 'waiting',
      current_multiplier: multiplier,
      start_price: livePrice.price / multiplier,
      current_price: livePrice.price,
      recent_outcomes: recentOutcomes
    };
  }

  /**
   * Calculate technical indicators
   */
  async getTechnicalAnalysis(symbol: string): Promise<TechnicalIndicator> {
    // Simulated technical analysis - in production, this would use real price history
    const rsi = 30 + Math.random() * 40; // 30-70 range
    const macd = (Math.random() - 0.5) * 0.01;
    const macdSignal = macd * 0.9;
    const livePrice = await this.getLivePrice(symbol);
    const ma20 = livePrice.price * (0.98 + Math.random() * 0.04);
    const ma50 = livePrice.price * (0.95 + Math.random() * 0.1);
    const volatility = 0.5 + Math.random() * 2.0;
    const atr = livePrice.price * 0.001 * volatility;

    return {
      rsi,
      macd,
      macd_signal: macdSignal,
      ma_20: ma20,
      ma_50: ma50,
      volatility,
      atr
    };
  }

  /**
   * Detect chart patterns
   */
  async detectPatterns(symbol: string): Promise<Pattern[]> {
    // Simulated pattern detection - in production, this would use real chart analysis
    const patterns: Pattern[] = [];
    const patternTypes = [
      { name: 'Head and Shoulders', description: 'Reversal pattern indicating trend change', bullish: false },
      { name: 'Double Bottom', description: 'Bullish reversal pattern', bullish: true },
      { name: 'Ascending Triangle', description: 'Bullish continuation pattern', bullish: true },
      { name: 'Descending Triangle', description: 'Bearish continuation pattern', bullish: false },
      { name: 'Bull Flag', description: 'Bullish continuation pattern', bullish: true },
      { name: 'Bear Flag', description: 'Bearish continuation pattern', bullish: false },
    ];

    // Randomly select 0-3 patterns
    const numPatterns = Math.floor(Math.random() * 4);
    for (let i = 0; i < numPatterns; i++) {
      const patternType = patternTypes[Math.floor(Math.random() * patternTypes.length)];
      patterns.push({
        ...patternType,
        confidence: 0.6 + Math.random() * 0.3
      });
    }

    return patterns;
  }

  /**
   * Get portfolio information
   */
  async getPortfolio(): Promise<Portfolio> {
    // Simulated portfolio - in production, this would come from a database
    const balance = 10000 + Math.random() * 5000;
    const totalPnl = (Math.random() - 0.4) * 2000;
    const winRate = 0.45 + Math.random() * 0.2;
    const totalTrades = 50 + Math.floor(Math.random() * 100);

    // Generate some active positions
    const positions: Position[] = [];
    const numPositions = Math.floor(Math.random() * 4);
    const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'];

    for (let i = 0; i < numPositions; i++) {
      const pair = pairs[i];
      const amount = 100 + Math.random() * 500;
      const entryPrice = 1.0 + Math.random() * 0.5;
      const currentPrice = entryPrice * (0.98 + Math.random() * 0.04);
      const pnl = (currentPrice - entryPrice) * amount * 100;

      positions.push({
        pair,
        amount,
        entry_price: entryPrice,
        current_price: currentPrice,
        pnl,
        status: 'open'
      });
    }

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
  async placeBet(symbol: string, amount: number, autoCashout: number): Promise<{ success: boolean; message: string }> {
    // Simulated bet placement - in production, this would interact with a game engine
    return {
      success: true,
      message: `Bet of $${amount} placed on ${symbol} with auto-cashout at ${autoCashout}x`
    };
  }

  /**
   * Cash out from the crash game
   */
  async cashOut(symbol: string): Promise<{ success: boolean; multiplier: number; payout: number }> {
    // Simulated cashout - in production, this would interact with a game engine
    const multiplier = 1.0 + Math.random() * 5.0;
    return {
      success: true,
      multiplier,
      payout: 100 * multiplier
    };
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

export function useLivePrices(symbol: string) {
  return useQuery({
    queryKey: ['live-price', symbol],
    queryFn: () => momentoFXAnalyzer.getLivePrice(symbol),
    refetchInterval: POLL_INTERVAL,
    staleTime: 500,
  });
}

export function useCrashGame(symbol: string) {
  return useQuery({
    queryKey: ['crash-game', symbol],
    queryFn: () => momentoFXAnalyzer.getCrashGame(symbol),
    refetchInterval: POLL_INTERVAL,
    staleTime: 500,
  });
}

export function useTechnicalAnalysis(symbol: string) {
  return useQuery({
    queryKey: ['technical-analysis', symbol],
    queryFn: () => momentoFXAnalyzer.getTechnicalAnalysis(symbol),
    refetchInterval: SLOW_POLL_INTERVAL,
    staleTime: 10000,
  });
}

export function usePatternDetection(symbol: string) {
  return useQuery({
    queryKey: ['pattern-detection', symbol],
    queryFn: () => momentoFXAnalyzer.detectPatterns(symbol),
    refetchInterval: SLOW_POLL_INTERVAL * 2,
    staleTime: 30000,
  });
}

export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: () => momentoFXAnalyzer.getPortfolio(),
    refetchInterval: SLOW_POLL_INTERVAL,
    staleTime: 10000,
  });
}

export type {
  ForexPair,
  LivePrice,
  CrashGame,
  TechnicalIndicator,
  Pattern,
  Position,
  Portfolio
};
