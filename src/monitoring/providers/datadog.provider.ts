import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * DataDog APM Provider
 * Integrates DataDog APM for comprehensive application monitoring
 */
@Injectable()
export class DatadogProvider {
  private readonly logger = new Logger(DatadogProvider.name);
  private isInitialized = false;

  constructor(private configService: ConfigService) {}

  /**
   * Initialize DataDog APM
   */
  async initialize(): Promise<void> {
    try {
      const apiKey = this.configService.get('DATADOG_API_KEY');
      const appName = this.configService.get('APP_NAME', 'strellerminds-backend');
      const env = this.configService.get('NODE_ENV', 'development');

      if (!apiKey) {
        this.logger.warn('DataDog API key not found, DataDog APM will be disabled');
        return;
      }

      // DataDog initialization - requires dd-trace library
      // This is a configuration template that works with the dd-trace npm package
      const ddTrace = require('dd-trace');

      ddTrace.init({
        service: appName,
        env: env,
        version: this.configService.get('APP_VERSION', '1.0.0'),
        logInjection: true,
        analytics: true,
        runtimeMetrics: true,
        dogstatsdPort: this.configService.get('DATADOG_STATSD_PORT', 8125),
        dogstatsdHostname: this.configService.get('DATADOG_AGENT_HOST', 'localhost'),
        samplingRules: this.getSamplingRules(),
        plugins: {
          'express': {
            enabled: true,
            analytics: true,
          },
          'http': {
            enabled: true,
            analytics: true,
          },
          'pg': {
            enabled: true,
            analytics: true,
          },
          'redis': {
            enabled: true,
            analytics: true,
          },
          'elasticsearch': {
            enabled: true,
            analytics: true,
          },
        },
      });

      this.isInitialized = true;
      this.logger.log('DataDog APM initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize DataDog APM', error);
    }
  }

  /**
   * Get sampling rules for DataDog
   */
  private getSamplingRules(): Array<{
    service?: string;
    name?: string;
    resource?: string;
    sample_rate: number;
  }> {
    return [
      // High priority services - 100% sampling
      {
        service: 'auth-service',
        sample_rate: 1.0,
      },
      {
        service: 'payment-service',
        sample_rate: 1.0,
      },
      // Default - 10% sampling for others
      {
        sample_rate: 0.1,
      },
    ];
  }

  /**
   * Create a DataDog span
   */
  createSpan(operationName: string, tags?: Record<string, any>) {
    if (!this.isInitialized) {
      return null;
    }

    try {
      const ddTrace = require('dd-trace');
      const span = ddTrace.trace(operationName, {}, async (span) => {
        if (tags) {
          Object.entries(tags).forEach(([key, value]) => {
            span.setTag(key, value);
          });
        }
        return span;
      });

      return span;
    } catch (error) {
      this.logger.error('Failed to create DataDog span', error);
      return null;
    }
  }

  /**
   * Add custom metrics to DataDog
   */
  async sendMetric(
    metricName: string,
    value: number,
    tags?: Record<string, string>,
  ): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // This would use StatsD client to send metrics to DataDog agent
      const tagString = tags
        ? Object.entries(tags)
            .map(([k, v]) => `${k}:${v}`)
            .join(',')
        : '';

      // Would be sent via StatsD to DataDog agent
      // For now, logging the metric
      this.logger.debug(
        `DataDog Metric: ${metricName}=${value}${tagString ? ` [${tagString}]` : ''}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send DataDog metric ${metricName}`, error);
    }
  }

  /**
   * Send event to DataDog
   */
  async sendEvent(
    title: string,
    text: string,
    priority: 'low' | 'normal' | 'high' = 'normal',
    tags?: string[],
  ): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      this.logger.debug(
        `DataDog Event: ${title} - ${text} (priority: ${priority})`,
      );
      // In production, this would send to DataDog API
    } catch (error) {
      this.logger.error(`Failed to send DataDog event ${title}`, error);
    }
  }

  /**
   * Check if DataDog is initialized
   */
  isActive(): boolean {
    return this.isInitialized;
  }
}
