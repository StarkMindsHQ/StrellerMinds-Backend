import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios } from 'axios';

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Alert types
 */
export enum AlertType {
  HIGH_MEMORY = 'high_memory',
  HIGH_CPU = 'high_cpu',
  SLOW_RESPONSE = 'slow_response',
  ERROR_RATE = 'error_rate',
  DATABASE_LATENCY = 'database_latency',
  CACHE_MISS_RATE = 'cache_miss_rate',
  MEMORY_LEAK = 'memory_leak',
  TRANSACTION_TIMEOUT = 'transaction_timeout',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CUSTOM = 'custom',
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  type: AlertType;
  threshold: number;
  duration: number; // ms
  enabled: boolean;
  action: 'log' | 'notify' | 'page';
}

/**
 * Alert instance
 */
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  value: number;
  threshold: number;
  metadata: Record<string, any>;
  resolved: boolean;
  resolvedAt?: number;
}

/**
 * Alerting Service
 * Manages performance alerts and notifications
 */
@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private alerts: Alert[] = [];
  private activeAlerts = new Map<AlertType, Alert>();
  private alertConfigs = new Map<AlertType, AlertConfig>();
  private alertHistory: Alert[] = [];
  private readonly maxHistorySize = 10000;
  private alertListeners: Array<(alert: Alert) => void> = [];

  // Thresholds for default alerts
  private defaultThresholds = {
    [AlertType.HIGH_MEMORY]: { threshold: 85, duration: 30000 },
    [AlertType.HIGH_CPU]: { threshold: 80, duration: 30000 },
    [AlertType.SLOW_RESPONSE]: { threshold: 5000, duration: 1000 },
    [AlertType.ERROR_RATE]: { threshold: 5, duration: 60000 },
    [AlertType.DATABASE_LATENCY]: { threshold: 1000, duration: 30000 },
    [AlertType.CACHE_MISS_RATE]: { threshold: 30, duration: 60000 },
    [AlertType.MEMORY_LEAK]: { threshold: 20, duration: 300000 },
  };

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.initializeAlerts();
  }

  /**
   * Initialize default alert configurations
   */
  private initializeAlerts(): void {
    Object.entries(this.defaultThresholds).forEach(([type, config]) => {
      this.alertConfigs.set(type as AlertType, {
        type: type as AlertType,
        ...config,
        enabled: true,
        action: 'log',
      });
    });
  }

  /**
   * Create an alert
   */
  async createAlert(
    type: AlertType,
    value: number,
    severity: AlertSeverity = AlertSeverity.WARNING,
    message?: string,
    metadata?: Record<string, any>,
  ): Promise<Alert> {
    const config = this.alertConfigs.get(type);
    if (!config || !config.enabled) {
      return null as any;
    }

    const alert: Alert = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message: message || this.generateAlertMessage(type, value),
      timestamp: Date.now(),
      value,
      threshold: config.threshold,
      metadata: metadata || {},
      resolved: false,
    };

    // Check if we should trigger alert
    if (value > config.threshold) {
      this.alerts.push(alert);
      this.activeAlerts.set(type, alert);

      // Handle alert action
      await this.handleAlertAction(alert, config.action);

      // Emit event
      this.eventEmitter.emit('alert.triggered', alert);

      // Notify listeners
      this.notifyListeners(alert);
    }

    return alert;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) {
      this.logger.warn(`Alert ${alertId} not found`);
      return;
    }

    alert.resolved = true;
    alert.resolvedAt = Date.now();

    this.activeAlerts.delete(alert.type);
    this.alertHistory.push(alert);

    // Maintain history size
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.shift();
    }

    this.eventEmitter.emit('alert.resolved', alert);
    this.logger.log(`Alert ${alert.id} resolved: ${alert.message}`);
  }

  /**
   * Handle alert action
   */
  private async handleAlertAction(alert: Alert, action: string): Promise<void> {
    switch (action) {
      case 'log':
        this.logger.warn(`[${alert.severity.toUpperCase()}] ${alert.message}`, {
          alertId: alert.id,
          value: alert.value,
          threshold: alert.threshold,
          metadata: alert.metadata,
        });
        break;

      case 'notify':
        await this.sendNotification(alert);
        break;

      case 'page':
        await this.pageOnCall(alert);
        break;
    }
  }

  /**
   * Send notification (to Slack, email, etc.)
   */
  private async sendNotification(alert: Alert): Promise<void> {
    const slackWebhook = this.configService.get('SLACK_WEBHOOK_URL');

    if (!slackWebhook) {
      this.logger.debug('Slack webhook not configured, skipping notification');
      return;
    }

    try {
      await axios.post(slackWebhook, {
        text: `🚨 Alert: ${alert.message}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${alert.severity.toUpperCase()}: ${alert.message}*`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Type:*\n${alert.type}`,
              },
              {
                type: 'mrkdwn',
                text: `*Value:*\n${alert.value}`,
              },
              {
                type: 'mrkdwn',
                text: `*Threshold:*\n${alert.threshold}`,
              },
              {
                type: 'mrkdwn',
                text: `*Time:*\n${new Date(alert.timestamp).toISOString()}`,
              },
            ],
          },
        ],
      });
    } catch (error) {
      this.logger.error('Failed to send Slack notification', error);
    }
  }

  /**
   * Page on call (integrate with PagerDuty, VictorOps, etc.)
   */
  private async pageOnCall(alert: Alert): Promise<void> {
    const pagerDutyKey = this.configService.get('PAGERDUTY_INTEGRATION_KEY');

    if (!pagerDutyKey) {
      this.logger.debug('PagerDuty key not configured, skipping page');
      return;
    }

    try {
      await axios.post('https://events.pagerduty.com/v2/enqueue', {
        routing_key: pagerDutyKey,
        event_action: 'trigger',
        payload: {
          summary: alert.message,
          severity: alert.severity === AlertSeverity.CRITICAL ? 'critical' : 'error',
          source: 'StrellerMinds-Backend',
          custom_details: {
            alertId: alert.id,
            type: alert.type,
            value: alert.value,
            threshold: alert.threshold,
            metadata: alert.metadata,
          },
        },
      });

      this.logger.log(`Paged on-call engineer for alert ${alert.id}`);
    } catch (error) {
      this.logger.error('Failed to page on-call engineer', error);
    }
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(type: AlertType, value: number): string {
    const messages: Record<AlertType, string> = {
      [AlertType.HIGH_MEMORY]: `High memory usage detected: ${value.toFixed(2)}%`,
      [AlertType.HIGH_CPU]: `High CPU usage detected: ${value.toFixed(2)}%`,
      [AlertType.SLOW_RESPONSE]: `Slow response time detected: ${value}ms`,
      [AlertType.ERROR_RATE]: `High error rate detected: ${value.toFixed(2)}%`,
      [AlertType.DATABASE_LATENCY]: `Database latency high: ${value}ms`,
      [AlertType.CACHE_MISS_RATE]: `Cache miss rate high: ${value.toFixed(2)}%`,
      [AlertType.MEMORY_LEAK]: `Potential memory leak detected: ${value.toFixed(2)}% increase`,
      [AlertType.TRANSACTION_TIMEOUT]: `Transaction timeout: ${value}ms`,
      [AlertType.RATE_LIMIT_EXCEEDED]: `Rate limit exceeded`,
      [AlertType.CUSTOM]: `Custom alert: ${value}`,
    };

    return messages[type] || `Alert: ${type} - ${value}`;
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(type: AlertType, config: Partial<AlertConfig>): void {
    const existing = this.alertConfigs.get(type);
    if (existing) {
      this.alertConfigs.set(type, { ...existing, ...config });
      this.logger.log(`Alert config updated for ${type}`);
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): Alert[] {
    return [...this.alerts, ...this.alertHistory];
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
    this.activeAlerts.clear();
    this.logger.log('All alerts cleared');
  }

  /**
   * Subscribe to alerts
   */
  subscribe(listener: (alert: Alert) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      this.alertListeners = this.alertListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(alert: Alert): void {
    this.alertListeners.forEach((listener) => {
      try {
        listener(alert);
      } catch (error) {
        this.logger.error('Error in alert listener', error);
      }
    });
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    total: number;
    active: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  } {
    const allAlerts = this.getAllAlerts();
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};

    allAlerts.forEach((alert) => {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      byType[alert.type] = (byType[alert.type] || 0) + 1;
    });

    return {
      total: allAlerts.length,
      active: this.activeAlerts.size,
      bySeverity,
      byType,
    };
  }
}
