/**
 * Notification Service
 * 
 * Real-time notification management for alerts and updates
 * Provides notification creation, delivery, and management
 */

import type { Notification } from '../types';

/**
 * Notification Service class
 * Handles real-time notifications and alerts
 */
export class NotificationService {
  private notifications: Notification[] = [];
  private subscribers: Set<(notification: Notification) => void> = new Set();
  private maxNotifications = 100;

  /**
   * Create a new notification
   */
  createNotification(
    type: Notification['type'],
    severity: Notification['severity'],
    title: string,
    message: string,
    data?: any,
    source?: string
  ): Notification {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      message,
      data,
      timestamp: new Date().toISOString(),
      read: false,
      source,
    };

    this.addNotification(notification);
    return notification;
  }

  /**
   * Add notification to the list
   */
  private addNotification(notification: Notification): void {
    this.notifications.unshift(notification);
    
    // Keep only the most recent notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    // Notify subscribers
    this.notifySubscribers(notification);
  }

  /**
   * Get all notifications
   */
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): Notification[] {
    return this.notifications.filter(n => !n.read);
  }

  /**
   * Get notification by ID
   */
  getNotification(id: string): Notification | undefined {
    return this.notifications.find(n => n.id === id);
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: string): boolean {
    const notification = this.getNotification(id);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
  }

  /**
   * Delete notification
   */
  deleteNotification(id: string): boolean {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications = [];
  }

  /**
   * Clear notifications by type
   */
  clearByType(type: Notification['type']): void {
    this.notifications = this.notifications.filter(n => n.type !== type);
  }

  /**
   * Subscribe to new notifications
   */
  subscribe(callback: (notification: Notification) => void): () => void {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Create pattern detection notification
   */
  createPatternNotification(
    patternName: string,
    confidence: number,
    source: string
  ): Notification {
    const severity = confidence > 0.8 ? 'critical' : confidence > 0.6 ? 'warning' : 'info';
    
    return this.createNotification(
      'pattern',
      severity,
      `${patternName} Detected`,
      `Pattern detected with ${Math.round(confidence * 100)}% confidence`,
      { patternName, confidence },
      source
    );
  }

  /**
   * Create pressure change notification
   */
  createPressureNotification(
    pressure: number,
    trend: string,
    source: string
  ): Notification {
    const severity = pressure > 0.8 ? 'critical' : pressure > 0.5 ? 'warning' : 'info';
    
    return this.createNotification(
      'pressure',
      severity,
      `Pressure Alert: ${trend.toUpperCase()}`,
      `Pressure score at ${Math.round(pressure * 100)}%`,
      { pressure, trend },
      source
    );
  }

  /**
   * Create survival estimate notification
   */
  createSurvivalNotification(
    predictedCrash: number,
    confidence: number,
    source: string
  ): Notification {
    const severity = confidence > 0.8 ? 'critical' : 'warning';
    
    return this.createNotification(
      'survival',
      severity,
      `ETA Forecast Update`,
      `Predicted crash point: ${predictedCrash.toFixed(2)}x (${Math.round(confidence * 100)}% confidence)`,
      { predictedCrash, confidence },
      source
    );
  }

  /**
   * Create indicator signal notification
   */
  createIndicatorNotification(
    indicator: string,
    signal: string,
    strength: number,
    source: string
  ): Notification {
    const severity = strength > 0.7 ? 'warning' : 'info';
    
    return this.createNotification(
      'indicator',
      severity,
      `${indicator} Signal: ${signal.toUpperCase()}`,
      `Signal strength: ${Math.round(strength * 100)}%`,
      { indicator, signal, strength },
      source
    );
  }

  /**
   * Create system notification
   */
  createSystemNotification(
    title: string,
    message: string,
    severity: Notification['severity'] = 'info'
  ): Notification {
    return this.createNotification(
      'system',
      severity,
      title,
      message
    );
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private notifySubscribers(notification: Notification): void {
    this.subscribers.forEach(callback => callback(notification));
  }
}

// Singleton instance
export const notificationService = new NotificationService();
