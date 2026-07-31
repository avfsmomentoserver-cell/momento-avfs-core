/**
 * Data Ingester - Read-only API client for main system
 * 
 * Fetches data from Momento Core API without modifying the main system.
 * Implements rate limiting, retry logic, and error handling.
 */

interface Round {
  id: number;
  multiplier: number;
  timestamp: string;
  source: string;
}

interface Analysis {
  source: string;
  ladders: any[];
  resistance: any;
  streaks: any;
  distributions: any;
}

interface Forecast {
  source: string;
  prediction: number;
  confidence: number;
  timestamp: string;
}

class DataIngester {
  private baseUrl: string;
  private rateLimitDelay: number = 100; // ms between requests
  private lastRequestTime: number = 0;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(baseUrl: string = 'http://localhost:8000/api/v1') {
    this.baseUrl = baseUrl;
  }

  /**
   * Rate-limited fetch with retry logic
   */
  private async fetchWithRetry(endpoint: string, options?: RequestInit): Promise<Response> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, options);
        if (response.ok) {
          return response;
        }
        if (response.status === 429) {
          // Rate limited - wait and retry
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
        }
      }
    }
    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Fetch rounds from main system
   */
  async getRounds(source: string, limit: number = 100, offset: number = 0): Promise<Round[]> {
    try {
      const response = await this.fetchWithRetry(
        `/rounds?source=${source}&limit=${limit}&offset=${offset}&order=asc`
      );
      const data = await response.json();
      return data.rounds || [];
    } catch (error) {
      console.error('Failed to fetch rounds:', error);
      return [];
    }
  }

  /**
   * Fetch all rounds from main system (fullscreen mode - no limit)
   */
  async getAllRounds(source: string): Promise<Round[]> {
    try {
      const response = await this.fetchWithRetry(
        `/rounds/all?source=${source}`
      );
      const data = await response.json();
      return data.rounds || [];
    } catch (error) {
      console.error('Failed to fetch all rounds:', error);
      return [];
    }
  }

  /**
   * Fetch analysis from main system
   */
  async getAnalysis(source: string, limit: number = 600): Promise<Analysis | null> {
    try {
      const response = await this.fetchWithRetry(
        `/analysis?source=${source}&limit=${limit}`
      );
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
      return null;
    }
  }

  /**
   * Fetch forecasts from main system
   */
  async getForecasts(source: string): Promise<Forecast[]> {
    try {
      const response = await this.fetchWithRetry(
        `/forecasts?source=${source}`
      );
      const data = await response.json();
      return data.forecasts || [];
    } catch (error) {
      console.error('Failed to fetch forecasts:', error);
      return [];
    }
  }

  /**
   * Fetch market data from main system
   */
  async getMarketData(source: string): Promise<any> {
    try {
      const response = await this.fetchWithRetry(
        `/market?source=${source}`
      );
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      return null;
    }
  }

  /**
   * Fetch platform overview
   */
  async getPlatformOverview(): Promise<any> {
    try {
      const response = await this.fetchWithRetry('/platform/overview');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch platform overview:', error);
      return null;
    }
  }
}

export const dataIngester = new DataIngester();
export type { Round, Analysis, Forecast };
