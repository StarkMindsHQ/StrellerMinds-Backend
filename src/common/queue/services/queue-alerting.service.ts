import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueMonitoringService } from './queue-monitoring.service';
import { ConfigService } from '@nestjs/config';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface Alert {
  id: string;
  queueName: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  queueName: string;
  condition: (metrics: any) => boolean;
  severity: AlertSeverity;
  title: string;
  message: string;
  cooldownPeriod: number; // minutes
  enabled: boolean;
  lastTriggered?: Date;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

@Injectable()
export class QueueAlertingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueAlertingService.name);
  private readonly alerts: Map<string, Alert> = new Map();
  private readonly alertRules: Map<string, AlertRule> = new Map();
  private readonly notificationChannels: Map<string, NotificationChannel> = new Map();
  private readonly alertHistory: Alert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectQueue('analytics') private analyticsQueue: Queue,
    @InjectQueue('file-processing') private fileProcessingQueue: Queue,
    @InjectQueue('dead-letter') private deadLetterQueue: Queue,
    private monitoringService: QueueMonitoringService,
    private configService: ConfigService,
  ) {
    this.initializeAlertRules();
    this.initializeNotificationChannels();
  }

  async onModuleInit() {
    await this.initializeMonitoring();
  }

  async onModuleDestroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  private initializeMonitoring() {
    // Start continuous monitoring
    this.monitoringInterval = setInterval(
      () => this.checkAlertRules(),
      30000, // Every 30 seconds
    );
    
    this.logger.log('Queue alerting service initialized');
  }

  private initializeAlertRules() {
    // High error rate alert
    this.addAlertRule({
      id: 'high-error-rate',
      name: 'High Error Rate',
      queueName: '*', // Applies to all queues
      condition: (metrics) => metrics.errorRate > 15,
      severity: AlertSeverity.ERROR,
      title: 'High Error Rate Detected',
      message: `Queue {{queueName}} has error rate of {{errorRate}}%`,
      cooldownPeriod: 5,
      enabled: true,
    });

    // Queue backlog alert
    this.addAlertRule({
      id: 'queue-backlog',
      name: 'Queue Backlog',
      queueName: '*',
      condition: (metrics) => metrics.waiting > 100,
      severity: AlertSeverity.WARNING,
      title: 'Queue Backlog Detected',
      message: `Queue {{queueName}} has {{waiting}} jobs waiting`,
      cooldownPeriod: 10,
      enabled: true,
    });

    // No active workers alert
    this.addAlertRule({
      id: 'no-active-workers',
      name: 'No Active Workers',
      queueName: '*',
      condition: (metrics) => metrics.active === 0 && metrics.waiting > 0,
      severity: AlertSeverity.CRITICAL,
      title: 'No Active Workers',
      message: `Queue {{queueName}} has jobs waiting but no active workers`,
      cooldownPeriod: 2,
      enabled: true,
    });

    // Slow processing alert
    this.addAlertRule({
      id: 'slow-processing',
      name: 'Slow Processing',
      queueName: '*',
      condition: (metrics) => metrics.avgProcessingTime > 300000, // 5 minutes
      severity: AlertSeverity.WARNING,
      title: 'Slow Processing Detected',
      message: `Queue {{queueName}} average processing time is {{avgProcessingTime}}ms`,
      cooldownPeriod: 15,
      enabled: true,
    });

    // Dead letter queue growth alert
    this.addAlertRule({
      id: 'dlq-growth',
      name: 'Dead Letter Queue Growth',
      queueName: 'dead-letter',
      condition: (metrics) => metrics.waiting > 20,
      severity: AlertSeverity.ERROR,
      title: 'Dead Letter Queue Growing',
      message: `Dead letter queue has {{waiting}} jobs`,
      cooldownPeriod: 30,
      enabled: true,
    });

    this.logger.log(`Initialized ${this.alertRules.size} alert rules`);
  }

  private initializeNotificationChannels() {
    // Email channel (configuration would come from environment variables)
    this.addNotificationChannel({
      id: 'email',
      name: 'Email Notifications',
      type: 'email',
      config: {
        smtpHost: this.configService.get('SMTP_HOST'),
        smtpPort: this.configService.get('SMTP_PORT'),
        username: this.configService.get('SMTP_USERNAME'),
        password: this.configService.get('SMTP_PASSWORD'),
        from: this.configService.get('ALERT_EMAIL_FROM'),
        to: this.configService.get('ALERT_EMAIL_TO', 'admin@example.com'),
      },
      enabled: this.configService.get('EMAIL_ALERTS_ENABLED', false),
    });

    // Slack channel
    this.addNotificationChannel({
      id: 'slack',
      name: 'Slack Notifications',
      type: 'slack',
      config: {
        webhookUrl: this.configService.get('SLACK_WEBHOOK_URL'),
        channel: this.configService.get('SLACK_CHANNEL', '#alerts'),
      },
      enabled: this.configService.get('SLACK_ALERTS_ENABLED', false),
    });

    // Webhook channel
    this.addNotificationChannel({
      id: 'webhook',
      name: 'Webhook Notifications',
      type: 'webhook',
      config: {
        url: this.configService.get('ALERT_WEBHOOK_URL'),
        headers: {
          'Content-Type': 'application/json',
        },
      },
      enabled: this.configService.get('WEBHOOK_ALERTS_ENABLED', false),
    });

    this.logger.log(`Initialized ${this.notificationChannels.size} notification channels`);
  }

  /**
   * Check all alert rules against current metrics
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAlertRules(): Promise<void> {
    try {
      const allMetrics = await this.monitoringService.getMetrics();
      
      for (const metrics of allMetrics) {
        await this.evaluateRulesForQueue(metrics);
      }
    } catch (error) {
      this.logger.error('Error checking alert rules:', error);
    }
  }

  private async evaluateRulesForQueue(metrics: any): Promise<void> {
    const applicableRules = Array.from(this.alertRules.values())
      .filter(rule => rule.enabled && (rule.queueName === '*' || rule.queueName === metrics.queueName));

    for (const rule of applicableRules) {
      try {
        // Check cooldown period
        if (rule.lastTriggered) {
          const cooldownMs = rule.cooldownPeriod * 60 * 1000;
          if (Date.now() - rule.lastTriggered.getTime() < cooldownMs) {
            continue; // Still in cooldown
          }
        }

        // Evaluate condition
        if (rule.condition(metrics)) {
          await this.triggerAlert(rule, metrics);
          rule.lastTriggered = new Date();
        }
      } catch (error) {
        this.logger.error(`Error evaluating alert rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(rule: AlertRule, metrics: any): Promise<void> {
    const alertId = `${rule.id}-${Date.now()}`;
    
    // Interpolate message with metrics
    const title = this.interpolateMessage(rule.title, metrics);
    const message = this.interpolateMessage(rule.message, metrics);

    const alert: Alert = {
      id: alertId,
      queueName: metrics.queueName,
      severity: rule.severity,
      title,
      message,
      timestamp: new Date(),
      metadata: {
        ruleId: rule.id,
        metrics,
      },
    };

    // Store alert
    this.alerts.set(alertId, alert);
    this.alertHistory.push(alert);

    // Keep history size manageable
    if (this.alertHistory.length > 1000) {
      this.alertHistory.splice(0, 500); // Remove oldest 500
    }

    // Send notifications
    await this.sendNotifications(alert);

    this.logger.warn(`Alert triggered: ${alert.title} for queue ${metrics.queueName}`);
  }

  /**
   * Send notifications for an alert
   */
  private async sendNotifications(alert: Alert): Promise<void> {
    const enabledChannels = Array.from(this.notificationChannels.values())
      .filter(channel => channel.enabled);

    const notifications = enabledChannels.map(channel => 
      this.sendNotification(channel, alert).catch(error => 
        this.logger.error(`Failed to send ${channel.type} notification:`, error)
      )
    );

    await Promise.allSettled(notifications);
  }

  /**
   * Send notification to specific channel
   */
  private async sendNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(channel, alert);
        break;
      case 'slack':
        await this.sendSlackNotification(channel, alert);
        break;
      case 'webhook':
        await this.sendWebhookNotification(channel, alert);
        break;
      case 'sms':
        await this.sendSMSNotification(channel, alert);
        break;
      default:
        this.logger.warn(`Unknown notification channel type: ${channel.type}`);
    }
  }

  private async sendEmailNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // Implementation would depend on email service
    this.logger.debug(`Sending email notification for alert ${alert.id}`);
    // This would integrate with an email service like Nodemailer
  }

  private async sendSlackNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    const webhookUrl = channel.config.webhookUrl;
    if (!webhookUrl) return;

    const payload = {
      channel: channel.config.channel,
      username: 'Queue Alert Bot',
      text: alert.title,
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          fields: [
            { title: 'Queue', value: alert.queueName, short: true },
            { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
            { title: 'Message', value: alert.message, short: false },
            { title: 'Time', value: alert.timestamp.toISOString(), short: true },
          ],
        },
      ],
    };

    // Implementation would use fetch or axios to send to Slack webhook
    this.logger.debug(`Sending Slack notification for alert ${alert.id}`);
  }

  private async sendWebhookNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    const url = channel.config.url;
    if (!url) return;

    const payload = {
      alert,
      timestamp: new Date().toISOString(),
    };

    // Implementation would use fetch or axios to send webhook
    this.logger.debug(`Sending webhook notification for alert ${alert.id}`);
  }

  private async sendSMSNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // Implementation would depend on SMS service
    this.logger.debug(`Sending SMS notification for alert ${alert.id}`);
  }

  /**
   * Get color for Slack message based on severity
   */
  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.INFO:
        return 'good';
      case AlertSeverity.WARNING:
        return 'warning';
      case AlertSeverity.ERROR:
        return 'danger';
      case AlertSeverity.CRITICAL:
        return '#ff0000';
      default:
        return 'good';
    }
  }

  /**
   * Interpolate message template with metrics
   */
  private interpolateMessage(template: string, metrics: any): string {
    let message = template;
    
    // Replace {{variable}} with actual values
    Object.keys(metrics).forEach(key => {
      const value = metrics[key];
      const placeholder = `{{${key}}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return message;
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.logger.log(`Added alert rule: ${rule.name}`);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId);
    if (removed) {
      this.logger.log(`Removed alert rule: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Add notification channel
   */
  addNotificationChannel(channel: NotificationChannel): void {
    this.notificationChannels.set(channel.id, channel);
    this.logger.log(`Added notification channel: ${channel.name}`);
  }

  /**
   * Remove notification channel
   */
  removeNotificationChannel(channelId: string): boolean {
    const removed = this.notificationChannels.delete(channelId);
    if (removed) {
      this.logger.log(`Removed notification channel: ${channelId}`);
    }
    return removed;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit).reverse();
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date();
    
    this.logger.log(`Resolved alert: ${alert.title}`);
    return true;
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    total: number;
    active: number;
    resolved: number;
    bySeverity: Record<AlertSeverity, number>;
    byQueue: Record<string, number>;
  } {
    const alerts = Array.from(this.alerts.values());
    
    const stats = {
      total: alerts.length,
      active: alerts.filter(a => !a.resolved).length,
      resolved: alerts.filter(a => a.resolved).length,
      bySeverity: {
        [AlertSeverity.INFO]: 0,
        [AlertSeverity.WARNING]: 0,
        [AlertSeverity.ERROR]: 0,
        [AlertSeverity.CRITICAL]: 0,
      },
      byQueue: {} as Record<string, number>,
    };

    alerts.forEach(alert => {
      stats.bySeverity[alert.severity]++;
      stats.byQueue[alert.queueName] = (stats.byQueue[alert.queueName] || 0) + 1;
    });

    return stats;
  }

  /**
   * Test alert system
   */
  async testAlert(queueName: string = 'analytics'): Promise<void> {
    const testAlert: Alert = {
      id: `test-${Date.now()}`,
      queueName,
      severity: AlertSeverity.INFO,
      title: 'Test Alert',
      message: 'This is a test alert to verify the notification system',
      timestamp: new Date(),
      metadata: { test: true },
    };

    await this.sendNotifications(testAlert);
    this.logger.log('Test alert sent');
  }
}
