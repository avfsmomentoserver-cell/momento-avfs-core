/**
 * Platform API Service
 * 
 * Integration with the existing platform API
 * Handles data fetching and API communication
 */

import type {
  ApiResponse,
  PaginatedResponse,
  ExtendedCandleData,
  AnalyticsMetrics,
} from '../types';

/**
 * Platform API Service class
 * Handles communication with the platform backend
 */
export class PlatformApiService {
  private baseUrl: string;
  private apiKey: string | null = null;

  constructor(baseUrl: string = 'http://20.57.171.198:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Set API key for authentication
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Get API headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Make API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Fetch candle data from platform
   */
  async fetchCandles(
    source: string,
    limit: number = 50,
    roundsPerCandle: number = 1
  ): Promise<ApiResponse<{ candles: ExtendedCandleData[] }>> {
    return this.request<{ candles: ExtendedCandleData[] }>(
      `/api/v1/market/candles?source=${source}&limit=${limit}&rounds_per_candle=${roundsPerCandle}`
    );
  }

  /**
   * Fetch live price data
   */
  async fetchLivePrice(source: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/v1/market/live?source=${source}`);
  }

  /**
   * Fetch historical crash data
   */
  async fetchCrashHistory(
    source: string,
    limit: number = 100
  ): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/api/v1/market/history?source=${source}&limit=${limit}`);
  }

  /**
   * Fetch analytics data
   */
  async fetchAnalytics(
    source: string,
    timeframe: string
  ): Promise<ApiResponse<AnalyticsMetrics>> {
    return this.request<AnalyticsMetrics>(
      `/api/v1/analytics/metrics?source=${source}&timeframe=${timeframe}`
    );
  }

  /**
   * Fetch pressure metrics
   */
  async fetchPressureMetrics(source: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/v1/analytics/pressure?source=${source}`);
  }

  /**
   * Fetch pattern detection results
   */
  async fetchPatterns(
    source: string,
    timeframe: string
  ): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(
      `/api/v1/analytics/patterns?source=${source}&timeframe=${timeframe}`
    );
  }

  /**
   * Fetch survival estimate
   */
  async fetchSurvivalEstimate(source: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/v1/analytics/survival?source=${source}`);
  }

  /**
   * Fetch available sources
   */
  async fetchSources(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/api/v1/market/sources');
  }

  /**
   * Fetch backtest results
   */
  async fetchBacktestResults(
    strategyId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<any>> {
    return this.request<any>(
      `/api/v1/backtest/run?strategy_id=${strategyId}&start_date=${startDate}&end_date=${endDate}`
    );
  }

  /**
   * Create strategy
   */
  async createStrategy(strategy: any): Promise<ApiResponse<any>> {
    return this.request<any>('/api/v1/backtest/strategy', {
      method: 'POST',
      body: JSON.stringify(strategy),
    });
  }

  /**
   * List strategies
   */
  async listStrategies(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/api/v1/backtest/strategies');
  }

  /**
   * Delete strategy
   */
  async deleteStrategy(strategyId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/v1/backtest/strategy/${strategyId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Fetch user preferences
   */
  async fetchUserPreferences(): Promise<ApiResponse<any>> {
    return this.request<any>('/api/v1/user/preferences');
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences: any): Promise<ApiResponse<any>> {
    return this.request<any>('/api/v1/user/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  /**
   * Fetch workspace
   */
  async fetchWorkspace(workspaceId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/v1/workspace/${workspaceId}`);
  }

  /**
   * List workspaces
   */
  async listWorkspaces(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/api/v1/workspace');
  }

  /**
   * Create workspace
   */
  async createWorkspace(workspace: any): Promise<ApiResponse<any>> {
    return this.request<any>('/api/v1/workspace', {
      method: 'POST',
      body: JSON.stringify(workspace),
    });
  }

  /**
   * Update workspace
   */
  async updateWorkspace(
    workspaceId: string,
    workspace: any
  ): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/v1/workspace/${workspaceId}`, {
      method: 'PUT',
      body: JSON.stringify(workspace),
    });
  }

  /**
   * Delete workspace
   */
  async deleteWorkspace(workspaceId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/v1/workspace/${workspaceId}`, {
      method: 'DELETE',
    });
  }
}

// Singleton instance
export const platformApiService = new PlatformApiService();
