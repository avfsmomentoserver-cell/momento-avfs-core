/**
 * WebSocket Service
 * 
 * Real-time WebSocket connection management
 * Handles live data updates and notifications
 */

import type { WebSocketMessage, WebSocketStatus } from '../types';

/**
 * WebSocket Service class
 * Manages WebSocket connections and message handling
 */
export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private status: WebSocketStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private statusSubscribers: Set<(status: WebSocketStatus) => void> = new Set();
  private messageQueue: WebSocketMessage[] = [];
  private isProcessingQueue = false;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
    this.reconnectAttempts = 0;
  }

  /**
   * Send message to WebSocket server
   */
  send(type: string, data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, queuing message');
      this.messageQueue.push({ type, data, timestamp: new Date().toISOString() });
      return;
    }

    try {
      this.ws.send(JSON.stringify({ type, data, timestamp: new Date().toISOString() }));
    } catch (error) {
      console.error('WebSocket send error:', error);
      this.messageQueue.push({ type, data, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Subscribe to specific message type
   */
  subscribe(type: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(type)?.delete(callback);
    };
  }

  /**
   * Subscribe to connection status changes
   */
  subscribeStatus(callback: (status: WebSocketStatus) => void): () => void {
    this.statusSubscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.statusSubscribers.delete(callback);
    };
  }

  /**
   * Get current connection status
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === 'connected';
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private handleOpen(): void {
    console.log('WebSocket connected');
    this.setStatus('connected');
    this.reconnectAttempts = 0;
    this.processMessageQueue();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.notifySubscribers(message.type, message.data);
    } catch (error) {
      console.error('WebSocket message parse error:', error);
    }
  }

  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
    this.setStatus('error');
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket closed:', event.code, event.reason);
    this.setStatus('disconnected');

    if (!event.wasClean) {
      this.scheduleReconnect();
    }
  }

  private setStatus(status: WebSocketStatus): void {
    this.status = status;
    this.notifyStatusSubscribers(status);
  }

  private notifySubscribers(type: string, data: any): void {
    const subscribers = this.subscribers.get(type);
    if (subscribers) {
      subscribers.forEach(callback => callback(data));
    }
  }

  private notifyStatusSubscribers(status: WebSocketStatus): void {
    this.statusSubscribers.forEach(callback => callback(status));
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private processMessageQueue(): void {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message.type, message.data);
      }
    }

    this.isProcessingQueue = false;
  }
}

/**
 * Create WebSocket service instance
 */
export function createWebSocketService(url: string): WebSocketService {
  return new WebSocketService(url);
}
