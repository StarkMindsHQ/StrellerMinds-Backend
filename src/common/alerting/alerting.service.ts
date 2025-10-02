import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { LoggerService } from '../logging/logger.service';
import { firstValueFrom } from 'rxjs';

export interface AlertConfig {
  enabled: boolean;
  channels: {
    email: {
      enabled: boolean;
      recipients: string[];
      smtpConfig?: any;
    };
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
    };
    webhook: {
      enabled: boolean;
      url: string;
      headers?: Record<string, string>;
    };
  };
  thresholds: {
    errorRate: number;
    responseTime: number;
    criticalErrors: string[];
    // Error category based thresholds
    categoryThresholds: Record<
      string,
      {
        rate: number;
        severity: 'low' | 'medium' | 'high' | 'critical';
      }
    >;
  };
  rateLimiting: {
    enabled: boolean;
    maxAlertsPerHour: number;
    cooldownMinutes: number;
  };
}

export interface AlertContext {
  correlationId?: string;
  userId?: string;
  userEmail?: string;
  method?: string;
  url?: string;
  errorCode?: string;
  statusCode?: number;
  duration?: number;
  stack?: string;
  timestamp: string;
  environment: string;
  service: string;
  [key: string]: any;
}

@Injectable()
export class AlertingService {
  private readonly config: AlertConfig;
  private readonly alertCounts = new Map<string, { count: number; lastAlert: Date }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext('AlertingService');
    this.config = this.loadConfig();
  }

  async sendCriticalErrorAlert(error: Error, context: AlertContext): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const alertKey = `critical_error_${context.errorCode || 'unknown'}`;

    if (!this.shouldSendAlert(alertKey)) {
      this.loggerService.debug('Alert rate limited', { alertKey, context: context.correlationId });
      return;
    }

    const alertData = {
      type: 'critical_error',
      severity: 'high',
      title: `Critical Error: ${error.message}`,
      description: this.formatErrorDescription(error, context),
      context,
      timestamp: new Date().toISOString(),
    };

    await this.sendAlert(alertData);
    this.recordAlert(alertKey);
  }

  /**
   * Send alert for categorized errors based on error rate thresholds
   * @param errorCategory The category of the error
   * @param errorRate The current error rate for this category
   * @param context Additional context for the alert
   */
  async sendCategorizedErrorAlert(
    errorCategory: string,
    errorRate: number,
    context: Partial<AlertContext>,
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Check if there's a specific threshold for this category
    const categoryThreshold = this.config.thresholds.categoryThresholds[errorCategory];
    if (!categoryThreshold || errorRate < categoryThreshold.rate) {
      return;
    }

    const alertKey = `categorized_error_${errorCategory}`;

    if (!this.shouldSendAlert(alertKey)) {
      return;
    }

    const alertData = {
      type: 'categorized_error',
      severity: categoryThreshold.severity,
      title: `High ${errorCategory} Error Rate Detected: ${(errorRate * 100).toFixed(2)}%`,
      description: `${errorCategory} errors have exceeded the threshold of ${(categoryThreshold.rate * 100).toFixed(2)}%`,
      context: {
        ...context,
        errorCategory,
        errorRate,
        threshold: categoryThreshold.rate,
      },
      timestamp: new Date().toISOString(),
    };

    await this.sendAlert(alertData);
    this.recordAlert(alertKey);
  }

  async sendHighErrorRateAlert(errorRate: number, context: Partial<AlertContext>): Promise<void> {
    if (!this.config.enabled || errorRate < this.config.thresholds.errorRate) {
      return;
    }

    const alertKey = 'high_error_rate';

    if (!this.shouldSendAlert(alertKey)) {
      return;
    }

    const alertData = {
      type: 'high_error_rate',
      severity: 'medium',
      title: `High Error Rate Detected: ${(errorRate * 100).toFixed(2)}%`,
      description: `Error rate has exceeded the threshold of ${(this.config.thresholds.errorRate * 100).toFixed(2)}%`,
      context: {
        ...context,
        errorRate,
        threshold: this.config.thresholds.errorRate,
      },
      timestamp: new Date().toISOString(),
    };

    await this.sendAlert(alertData);
    this.recordAlert(alertKey);
  }

  async sendSlowResponseAlert(duration: number, context: Partial<AlertContext>): Promise<void> {
    if (!this.config.enabled || duration < this.config.thresholds.responseTime) {
      return;
    }

    const alertKey = 'slow_response';

    if (!this.shouldSendAlert(alertKey)) {
      return;
    }

    const alertData = {
      type: 'slow_response',
      severity: 'low',
      title: `Slow Response Detected: ${duration}ms`,
      description: `Response time has exceeded the threshold of ${this.config.thresholds.responseTime}ms`,
      context: {
        ...context,
        duration,
        threshold: this.config.thresholds.responseTime,
      },
      timestamp: new Date().toISOString(),
    };

    await this.sendAlert(alertData);
    this.recordAlert(alertKey);
  }

  async sendCustomAlert(
    title: string,
    description: string,
    severity: 'low' | 'medium' | 'high',
    context?: Partial<AlertContext>,
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const alertData = {
      type: 'custom',
      severity,
      title,
      description,
      context: context || {},
      timestamp: new Date().toISOString(),
    };

    await this.sendAlert(alertData);
  }

  private async sendAlert(alertData: any): Promise<void> {
    const promises: Promise<void>[] = [];

    // Send to Slack
    if (this.config.channels.slack.enabled && this.config.channels.slack.webhookUrl) {
      promises.push(this.sendSlackAlert(alertData));
    }

    // Send to webhook
    if (this.config.channels.webhook.enabled && this.config.channels.webhook.url) {
      promises.push(this.sendWebhookAlert(alertData));
    }

    // Send email (if configured)
    if (this.config.channels.email.enabled && this.config.channels.email.recipients.length > 0) {
      promises.push(this.sendEmailAlert(alertData));
    }

    try {
      await Promise.allSettled(promises);
      this.loggerService.info('Alert sent successfully', {
        type: alertData.type,
        severity: alertData.severity,
        correlationId: alertData.context?.correlationId,
      });
    } catch (error: any) {
      this.loggerService.error('Failed to send alert', {
        error: error.message,
        alertType: alertData.type,
      });
    }
  }

  private async sendSlackAlert(alertData: any): Promise<void> {
    const color = this.getSeverityColor(alertData.severity);
    const slackPayload = {
      channel: this.config.channels.slack.channel,
      username: 'StrellerMinds Alert Bot',
      icon_emoji: ':warning:',
      attachments: [
        {
          color,
          title: alertData.title,
          text: alertData.description,
          fields: [
            {
              title: 'Severity',
              value: alertData.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Environment',
              value: alertData.context?.environment || 'unknown',
              short: true,
            },
            {
              title: 'Service',
              value: alertData.context?.service || 'strellerminds-backend',
              short: true,
            },
            {
              title: 'Correlation ID',
              value: alertData.context?.correlationId || 'N/A',
              short: true,
            },
          ],
          timestamp: Math.floor(Date.now() / 1000),
        },
      ],
    };

    await firstValueFrom(
      this.httpService.post(this.config.channels.slack.webhookUrl, slackPayload),
    );
  }

  private async sendWebhookAlert(alertData: any): Promise<void> {
    const headers = {
      'Content-Type': 'application/json',
      ...this.config.channels.webhook.headers,
    };

    await firstValueFrom(
      this.httpService.post(this.config.channels.webhook.url, alertData, { headers }),
    );
  }

  private async sendEmailAlert(alertData: any): Promise<void> {
    // Email implementation would go here
    // This could use nodemailer or another email service
    this.loggerService.info('Email alert would be sent here', {
      recipients: this.config.channels.email.recipients,
      title: alertData.title,
    });
  }

  private shouldSendAlert(alertKey: string): boolean {
    if (!this.config.rateLimiting.enabled) {
      return true;
    }

    const now = new Date();
    const alertInfo = this.alertCounts.get(alertKey);

    if (!alertInfo) {
      return true;
    }

    const hoursSinceLastAlert = (now.getTime() - alertInfo.lastAlert.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastAlert >= 1) {
      // Reset count after an hour
      this.alertCounts.set(alertKey, { count: 0, lastAlert: now });
      return true;
    }

    if (alertInfo.count >= this.config.rateLimiting.maxAlertsPerHour) {
      return false;
    }

    const minutesSinceLastAlert = (now.getTime() - alertInfo.lastAlert.getTime()) / (1000 * 60);
    return minutesSinceLastAlert >= this.config.rateLimiting.cooldownMinutes;
  }

  private recordAlert(alertKey: string): void {
    const now = new Date();
    const alertInfo = this.alertCounts.get(alertKey) || { count: 0, lastAlert: now };

    this.alertCounts.set(alertKey, {
      count: alertInfo.count + 1,
      lastAlert: now,
    });
  }

  private formatErrorDescription(error: Error, context: AlertContext): string {
    let description = `Error: ${error.message}\n`;

    if (context.method && context.url) {
      description += `Request: ${context.method} ${context.url}\n`;
    }

    if (context.userId) {
      description += `User: ${context.userId}\n`;
    }

    if (context.correlationId) {
      description += `Correlation ID: ${context.correlationId}\n`;
    }

    return description;
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'good';
      default:
        return '#808080';
    }
  }

  private loadConfig(): AlertConfig {
    return {
      enabled: this.configService.get<boolean>('ALERTING_ENABLED', false),
      channels: {
        email: {
          enabled: this.configService.get<boolean>('EMAIL_ALERTS_ENABLED', false),
          recipients: this.configService
            .get<string>('EMAIL_ALERT_RECIPIENTS', '')
            .split(',')
            .filter(Boolean),
        },
        slack: {
          enabled: this.configService.get<boolean>('SLACK_ALERTS_ENABLED', false),
          webhookUrl: this.configService.get<string>('SLACK_WEBHOOK_URL', ''),
          channel: this.configService.get<string>('SLACK_ALERT_CHANNEL', '#alerts'),
        },
        webhook: {
          enabled: this.configService.get<boolean>('WEBHOOK_ALERTS_ENABLED', false),
          url: this.configService.get<string>('WEBHOOK_ALERT_URL', ''),
          headers: this.parseHeaders(this.configService.get<string>('WEBHOOK_ALERT_HEADERS', '{}')),
        },
      },
      thresholds: {
        errorRate: this.configService.get<number>('ERROR_RATE_THRESHOLD', 0.05),
        responseTime: this.configService.get<number>('RESPONSE_TIME_THRESHOLD', 5000),
        criticalErrors: this.configService
          .get<string>('CRITICAL_ERROR_CODES', 'INTERNAL_ERROR,DATABASE_ERROR')
          .split(','),
        // Default category thresholds
        categoryThresholds: this.parseCategoryThresholds(
          this.configService.get<string>('CATEGORY_ERROR_THRESHOLDS', '{}'),
        ),
      },
      rateLimiting: {
        enabled: this.configService.get<boolean>('ALERT_RATE_LIMITING_ENABLED', true),
        maxAlertsPerHour: this.configService.get<number>('MAX_ALERTS_PER_HOUR', 10),
        cooldownMinutes: this.configService.get<number>('ALERT_COOLDOWN_MINUTES', 5),
      },
    };
  }

  private parseHeaders(headersString: string): Record<string, string> {
    try {
      return JSON.parse(headersString);
    } catch {
      return {};
    }
  }

  /**
   * Parse category thresholds from configuration string
   * @param thresholdsString JSON string of category thresholds
   * @returns Parsed category thresholds object
   */
  private parseCategoryThresholds(
    thresholdsString: string,
  ): Record<string, { rate: number; severity: 'low' | 'medium' | 'high' | 'critical' }> {
    try {
      return JSON.parse(thresholdsString);
    } catch {
      // Return default thresholds
      return {
        AUTHENTICATION: { rate: 0.1, severity: 'high' },
        VALIDATION: { rate: 0.05, severity: 'medium' },
        RESOURCE: { rate: 0.02, severity: 'medium' },
        BUSINESS_LOGIC: { rate: 0.01, severity: 'low' },
        SYSTEM: { rate: 0.005, severity: 'critical' },
        UNKNOWN: { rate: 0.01, severity: 'medium' },
      };
    }
  }
}
