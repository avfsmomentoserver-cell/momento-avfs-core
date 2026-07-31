/**
 * Chart Service
 * 
 * Chart data preparation and management
 * Provides data formatting, aggregation, and chart synchronization
 */

import type {
  ExtendedCandleData,
  VolumeData,
  IndicatorLineData,
  Timeframe,
} from '../types';
import { TIMEFRAME_CONFIG, API_LIMITS } from '../constants';
import { platformApiService } from './PlatformApiService';
import { aggregateCandles } from '../utils/dataProcessing';

/**
 * Chart Service class
 * Handles chart data preparation and management
 */
export class ChartService {
  private candleCache: Map<string, ExtendedCandleData[]> = new Map();
  private volumeCache: Map<string, VolumeData[]> = new Map();
  private indicatorCache: Map<string, Map<string, IndicatorLineData[]>> = new Map();

  /**
   * Get candle data for chart
   */
  async getCandles(source: string, timeframe: Timeframe, limit: number = 50): Promise<ExtendedCandleData[]> {
    const cacheKey = `${source}:${timeframe}`;
    
    // Check cache first
    const cached = this.candleCache.get(cacheKey);
    if (cached && cached.length >= limit) {
      return cached.slice(0, limit);
    }

    try {
      // Fetch candle data from platform API
      const roundsPerCandle = TIMEFRAME_CONFIG[timeframe].roundsPerCandle;
      const response = await platformApiService.fetchCandles(source, Math.min(limit, API_LIMITS.MAX_CANDLES), roundsPerCandle);
      const candles = response.data.candles;

      // Cache the result
      this.candleCache.set(cacheKey, candles);

      return candles;
    } catch (error) {
      console.error('Failed to fetch candles from platform API:', error);
      // Fallback to placeholder data
      return this.fetchCandles(source, timeframe, limit);
    }
  }

  /**
   * Get volume data for chart
   */
  async getVolume(source: string, timeframe: Timeframe, limit: number = 50): Promise<VolumeData[]> {
    const cacheKey = `${source}:${timeframe}`;
    
    // Check cache first
    const cached = this.volumeCache.get(cacheKey);
    if (cached && cached.length >= limit) {
      return cached.slice(0, limit);
    }

    // Fetch volume data (placeholder for actual implementation)
    const volume = await this.fetchVolume(source, timeframe, limit);

    // Cache the result
    this.volumeCache.set(cacheKey, volume);

    return volume;
  }

  /**
   * Get indicator data for chart overlay
   */
  async getIndicatorData(
    source: string,
    timeframe: Timeframe,
    indicator: string,
    limit: number = 50
  ): Promise<IndicatorLineData[]> {
    const cacheKey = `${source}:${timeframe}`;
    
    // Check cache first
    const cached = this.indicatorCache.get(cacheKey);
    if (cached && cached.has(indicator)) {
      const data = cached.get(indicator)!;
      if (data.length >= limit) {
        return data.slice(0, limit);
      }
    }

    // Fetch indicator data (placeholder for actual implementation)
    const data = await this.fetchIndicatorData(source, timeframe, indicator, limit);

    // Cache the result
    if (!this.indicatorCache.has(cacheKey)) {
      this.indicatorCache.set(cacheKey, new Map());
    }
    this.indicatorCache.get(cacheKey)!.set(indicator, data);

    return data;
  }

  /**
   * Convert raw data to candle format
   */
  convertToCandles(rawData: any[]): ExtendedCandleData[] {
    return rawData.map((item, index) => ({
      time: Math.floor(new Date(item.timestamp).getTime() / 1000),
      open: item.open || item.multiplier,
      high: item.high || item.multiplier,
      low: item.low || item.multiplier,
      close: item.close || item.multiplier,
      volume: item.volume || 100,
      timestamp: item.timestamp,
    }));
  }

  /**
   * Aggregate candles for different timeframes
   */
  aggregateCandles(candles: ExtendedCandleData[], targetTimeframe: Timeframe): ExtendedCandleData[] {
    const roundsPerCandle = TIMEFRAME_CONFIG[targetTimeframe].roundsPerCandle;
    
    if (roundsPerCandle === 1) {
      return candles;
    }

    const aggregated: ExtendedCandleData[] = [];
    
    for (let i = 0; i < candles.length; i += roundsPerCandle) {
      const group = candles.slice(i, i + roundsPerCandle);
      
      if (group.length === 0) continue;

      aggregated.push({
        time: group[0].time,
        open: group[0].open,
        high: Math.max(...group.map(c => c.high)),
        low: Math.min(...group.map(c => c.low)),
        close: group[group.length - 1].close,
        volume: group.reduce((sum, c) => sum + c.volume, 0),
        timestamp: group[0].timestamp,
      });
    }

    return aggregated;
  }

  /**
   * Synchronize multiple charts
   */
  synchronizeCharts(chartIds: string[], action: 'zoom' | 'pan', data: any): void {
    // Placeholder for chart synchronization logic
    // This would communicate with chart instances to keep them in sync
    console.log(`Synchronizing charts ${chartIds.join(', ')} for ${action}`, data);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.candleCache.clear();
    this.volumeCache.clear();
    this.indicatorCache.clear();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async fetchCandles(source: string, timeframe: Timeframe, limit: number): Promise<ExtendedCandleData[]> {
    // Placeholder for actual API call
    // In production, this would call the platform API
    const candles: ExtendedCandleData[] = [];
    const now = Date.now();
    
    for (let i = 0; i < Math.min(limit, API_LIMITS.MAX_CANDLES); i++) {
      const timestamp = now - i * 60000; // 1 minute intervals
      const base = Math.random() * 5 + 1;
      
      candles.push({
        time: Math.floor(timestamp / 1000),
        open: base,
        high: base + Math.random() * 0.5,
        low: base - Math.random() * 0.5,
        close: base + (Math.random() - 0.5) * 0.5,
        volume: Math.floor(Math.random() * 1000) + 100,
        timestamp: new Date(timestamp).toISOString(),
      });
    }

    return candles.reverse();
  }

  private async fetchVolume(source: string, timeframe: Timeframe, limit: number): Promise<VolumeData[]> {
    // Placeholder for actual API call
    const volume: VolumeData[] = [];
    const now = Date.now();
    
    for (let i = 0; i < Math.min(limit, API_LIMITS.MAX_CANDLES); i++) {
      const timestamp = now - i * 60000;
      const value = Math.floor(Math.random() * 1000) + 100;
      
      volume.push({
        time: Math.floor(timestamp / 1000),
        value,
        color: value > 500 ? '#10b981' : '#ef4444',
      });
    }

    return volume.reverse();
  }

  private async fetchIndicatorData(
    source: string,
    timeframe: Timeframe,
    indicator: string,
    limit: number
  ): Promise<IndicatorLineData[]> {
    // Placeholder for actual API call
    const data: IndicatorLineData[] = [];
    const now = Date.now();
    
    for (let i = 0; i < Math.min(limit, API_LIMITS.MAX_CANDLES); i++) {
      const timestamp = now - i * 60000;
      
      data.push({
        time: Math.floor(timestamp / 1000),
        value: Math.random() * 10 + 5,
      });
    }

    return data.reverse();
  }
}

// Singleton instance
export const chartService = new ChartService();
