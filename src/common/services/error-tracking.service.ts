import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ErrorCode, ErrorSeverity, ErrorCategory } from '../errors/error-types';

/**
 * Error tracking event
 */
export interface ErrorTrackingEvent {
  id: string;
  errorCode: ErrorCode;
  message: string;
  statusCode: number;
  severity: ErrorSeverity;
  category: ErrorCategory;
  path: string;
  method: string;
  requestId: string;
  timestamp: Date;
  userId?: string;
  userAgent?: string;
  ip?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Error statistics for a time window
 */
export interface ErrorStatistics {
  totalErrors: number;
  errorsByCode: Record<ErrorCode, number>;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByPath: Record<string, number>;
  averageErrorsPerMinute: number;
  topErrors: Array<{ errorCode: ErrorCode; count: number; message: string }>;
}

/**
 * Error alert configuration
 */
export interface ErrorAlertConfig {
  errorCode?: ErrorCode;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  threshold: number;
  timeWindowMinutes: number;
}

/**
 * Error alert
 */
export interface ErrorAlert {
  id: string;
  config: ErrorAlertConfig;
  triggeredAt: Date;
  currentCount: number;
  message: string;
  acknowledged: boolean;
}

/**
 * Service for tracking, analyzing, and alerting on errors
 * Provides error metrics, trend analysis, and alerting capabilities
 */
@Injectable()
export class ErrorTrackingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ErrorTrackingService.name);
  private errorEvents: ErrorTrackingEvent[] = [];
  private alerts: ErrorAlert[] = [];
  private alertConfigs: ErrorAlertConfig[] = [];
  private cleanupInterval?: NodeJS.Timeout;
  private maxEvents = 10000;
  private retentionMinutes = 60;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.maxEvents = this.configService.get('ERROR_TRACKING_MAX_EVENTS', 10000);
    this.retentionMinutes = this.configService.get('ERROR_TRACKING_RETENTION_MINUTES', 60);
  }

  onModuleInit() {
    // Initialize default alert configurations
    this.initializeDefaultAlerts();

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldEvents();
    }, 60000); // Every minute

    this.logger.log('Error tracking service initialized');
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Track an error event
   */
  trackError(event: Omit<ErrorTrackingEvent, 'id' | 'timestamp'>): string {
    const trackingEvent: ErrorTrackingEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date(),
    };

    // Add to events array
    this.errorEvents.push(trackingEvent);

    // Trim if exceeding max size
    if (this.errorEvents.length > this.maxEvents) {
      this.errorEvents = this.errorEvents.slice(-this.maxEvents);
    }

    // Check alerts
    this.checkAlerts(trackingEvent);

    // Emit event for external subscribers
    this.eventEmitter.emit('error.tracked', trackingEvent);

    this.logger.debug(`Error tracked: ${event.errorCode} at ${event.path}`, {
      errorCode: event.errorCode,
      statusCode: event.statusCode,
      path: event.path,
      requestId: event.requestId,
    });

    return trackingEvent.id;
  }

  /**
   * Get error statistics for a time window
   */
  getStatistics(timeWindowMinutes: number = 60): ErrorStatistics {
    const cutoff = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentEvents = this.errorEvents.filter((e) => e.timestamp >= cutoff);

    const errorsByCode: Record<ErrorCode, number> = {} as any;
    const errorsByCategory: Record<ErrorCategory, number> = {} as any;
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as any;
    const errorsByPath: Record<string, number> = {};

    for (const event of recentEvents) {
      errorsByCode[event.errorCode] = (errorsByCode[event.errorCode] || 0) + 1;
      errorsByCategory[event.category] = (errorsByCategory[event.category] || 0) + 1;
      errorsBySeverity[event.severity] = (errorsBySeverity[event.severity] || 0) + 1;
      errorsByPath[event.path] = (errorsByPath[event.path] || 0) + 1;
    }

    // Get top errors
    const sortedByCode = Object.entries(errorsByCode)
      .map(([code, count]) => ({
        errorCode: code as ErrorCode,
        count,
        message: this.getEventMessageByCode(recentEvents, code as ErrorCode),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const averageErrorsPerMinute = recentEvents.length / timeWindowMinutes;

    return {
      totalErrors: recentEvents.length,
      errorsByCode,
      errorsByCategory,
      errorsBySeverity,
      errorsByPath,
      averageErrorsPerMinute,
      topErrors: sortedByCode,
    };
  }

  /**
   * Get error events filtered by criteria
   */
  getEvents(filter: {
    errorCode?: ErrorCode;
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    path?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): ErrorTrackingEvent[] {
    let events = [...this.errorEvents];

    if (filter.errorCode) {
      events = events.filter((e) => e.errorCode === filter.errorCode);
    }
    if (filter.severity) {
      events = events.filter((e) => e.severity === filter.severity);
    }
    if (filter.category) {
      events = events.filter((e) => e.category === filter.category);
    }
    if (filter.path) {
      events = events.filter((e) => e.path.includes(filter.path!));
    }
    if (filter.startTime) {
      events = events.filter((e) => e.timestamp >= filter.startTime!);
    }
    if (filter.endTime) {
      events = events.filter((e) => e.timestamp <= filter.endTime!);
    }

    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filter.limit) {
      events = events.slice(0, filter.limit);
    }

    return events;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): ErrorAlert[] {
    return this.alerts.filter((a) => !a.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.logger.log(`Alert acknowledged: ${alertId}`);
      return true;
    }
    return false;
  }

  /**
   * Add custom alert configuration
   */
  addAlertConfig(config: ErrorAlertConfig): void {
    this.alertConfigs.push(config);
    this.logger.log(`Alert configuration added: ${JSON.stringify(config)}`);
  }

  /**
   * Get error rate (errors per minute)
   */
  getErrorRate(timeWindowMinutes: number = 5): number {
    const cutoff = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentEvents = this.errorEvents.filter((e) => e.timestamp >= cutoff);
    return recentEvents.length / timeWindowMinutes;
  }

  /**
   * Check if error rate exceeds threshold
   */
  isErrorRateHigh(threshold: number = 10): boolean {
    return this.getErrorRate(5) > threshold;
  }

  /**
   * Get unique users affected by errors
   */
  getAffectedUsers(timeWindowMinutes: number = 60): string[] {
    const cutoff = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentEvents = this.errorEvents.filter(
      (e) => e.timestamp >= cutoff && e.userId,
    );
    const uniqueUsers = new Set(recentEvents.map((e) => e.userId!));
    return Array.from(uniqueUsers);
  }

  /**
   * Export error data for external analysis
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.errorEvents, null, 2);
    }

    // CSV format
    const headers = [
      'id',
      'errorCode',
      'statusCode',
      'severity',
      'category',
      'path',
      'method',
      'requestId',
      'timestamp',
      'userId',
    ];
    const rows = this.errorEvents.map((e) =>
      headers.map((h) => String((e as any)[h] || '')).join(','),
    );
    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Clear all tracked errors
   */
  clearAll(): void {
    this.errorEvents = [];
    this.alerts = [];
    this.logger.warn('All error tracking data cleared');
  }

  // Private methods

  private initializeDefaultAlerts(): void {
    // High severity alert
    this.alertConfigs.push({
      severity: ErrorSeverity.HIGH,
      threshold: 5,
      timeWindowMinutes: 5,
    });

    // Critical severity alert
    this.alertConfigs.push({
      severity: ErrorSeverity.CRITICAL,
      threshold: 1,
      timeWindowMinutes: 5,
    });

    // High error rate alert
    this.alertConfigs.push({
      threshold: 50,
      timeWindowMinutes: 5,
    });
  }

  private checkAlerts(event: ErrorTrackingEvent): void {
    for (const config of this.alertConfigs) {
      const cutoff = new Date(Date.now() - config.timeWindowMinutes * 60 * 1000);
      const recentEvents = this.errorEvents.filter((e) => {
        if (e.timestamp < cutoff) return false;
        if (config.errorCode && e.errorCode !== config.errorCode) return false;
        if (config.category && e.category !== config.category) return false;
        if (config.severity && e.severity !== config.severity) return false;
        return true;
      });

      if (recentEvents.length >= config.threshold) {
        this.triggerAlert(config, recentEvents.length);
      }
    }
  }

  private triggerAlert(config: ErrorAlertConfig, currentCount: number): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(
      (a) =>
        JSON.stringify(a.config) === JSON.stringify(config) && !a.acknowledged,
    );

    if (existingAlert) {
      existingAlert.currentCount = currentCount;
      existingAlert.triggeredAt = new Date();
      return;
    }

    const alert: ErrorAlert = {
      id: this.generateId(),
      config,
      triggeredAt: new Date(),
      currentCount,
      message: this.generateAlertMessage(config, currentCount),
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Emit alert event
    this.eventEmitter.emit('error.alert', alert);

    this.logger.warn(`Error alert triggered: ${alert.message}`, {
      alertId: alert.id,
      config,
      currentCount,
    });
  }

  private generateAlertMessage(
    config: ErrorAlertConfig,
    count: number,
  ): string {
    const parts: string[] = [];

    if (config.errorCode) {
      parts.push(`Error code: ${config.errorCode}`);
    }
    if (config.severity) {
      parts.push(`Severity: ${config.severity}`);
    }
    if (config.category) {
      parts.push(`Category: ${config.category}`);
    }

    parts.push(`${count} occurrences in ${config.timeWindowMinutes} minutes`);

    return parts.join('. ');
  }

  private cleanupOldEvents(): void {
    const cutoff = new Date(Date.now() - this.retentionMinutes * 60 * 1000);
    const before = this.errorEvents.length;
    this.errorEvents = this.errorEvents.filter((e) => e.timestamp >= cutoff);

    // Also cleanup old acknowledged alerts
    const alertCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    this.alerts = this.alerts.filter(
      (a) => !a.acknowledged || a.triggeredAt >= alertCutoff,
    );

    const removed = before - this.errorEvents.length;
    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} old error events`);
    }
  }

  private getEventMessageByCode(
    events: ErrorTrackingEvent[],
    code: ErrorCode,
  ): string {
    const event = events.find((e) => e.errorCode === code);
    return event?.message || 'Unknown error';
  }

  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
