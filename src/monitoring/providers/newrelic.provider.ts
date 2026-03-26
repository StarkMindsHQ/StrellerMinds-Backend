import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * New Relic APM Provider
 * Integrates New Relic APM for comprehensive application monitoring
 */
@Injectable()
export class NewRelicProvider {
  private readonly logger = new Logger(NewRelicProvider.name);
  private isInitialized = false;
  private newrelic: any;

  constructor(private configService: ConfigService) {}

  /**
   * Initialize New Relic APM
   */
  async initialize(): Promise<void> {
    try {
      const licenseKey = this.configService.get('NEW_RELIC_LICENSE_KEY');
      const appName = this.configService.get('APP_NAME', 'strellerminds-backend');
      const env = this.configService.get('NODE_ENV', 'development');

      if (!licenseKey) {
        this.logger.warn('New Relic license key not found, New Relic APM will be disabled');
        return;
      }

      // New Relic must be required at the very beginning of application
      try {
        this.newrelic = require('newrelic');
      } catch (err) {
        this.logger.warn('New Relic module not available, install with: npm install newrelic');
        return;
      }

      this.isInitialized = true;
      this.logger.log('New Relic APM initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize New Relic APM', error);
    }
  }

  /**
   * Start a custom transaction
   */
  startTransaction(name: string, category: string = 'custom'): any {
    if (!this.isInitialized || !this.newrelic) {
      return null;
    }

    try {
      return this.newrelic.startTransaction(name, category);
    } catch (error) {
      this.logger.error(`Failed to start New Relic transaction ${name}`, error);
      return null;
    }
  }

  /**
   * Record custom metrics
   */
  recordMetric(
    metricName: string,
    value: number,
    unit?: string,
  ): void {
    if (!this.isInitialized || !this.newrelic) {
      return;
    }

    try {
      this.newrelic.recordMetric(metricName, value);
      this.logger.debug(`New Relic Metric: ${metricName}=${value}${unit ? ` ${unit}` : ''}`);
    } catch (error) {
      this.logger.error(`Failed to record New Relic metric ${metricName}`, error);
    }
  }

  /**
   * Add custom attributes to current transaction
   */
  addTransactionAttribute(key: string, value: any): void {
    if (!this.isInitialized || !this.newrelic) {
      return;
    }

    try {
      this.newrelic.addCustomAttribute(key, value);
    } catch (error) {
      this.logger.error(`Failed to add New Relic transaction attribute ${key}`, error);
    }
  }

  /**
   * Notify about errors
   */
  noticeError(error: Error, customAttributes?: Record<string, any>): void {
    if (!this.isInitialized || !this.newrelic) {
      return;
    }

    try {
      this.newrelic.noticeError(error, customAttributes);
    } catch (err) {
      this.logger.error('Failed to notify New Relic about error', err);
    }
  }

  /**
   * Record custom events
   */
  recordCustomEvent(eventType: string, attributes: Record<string, any>): void {
    if (!this.isInitialized || !this.newrelic) {
      return;
    }

    try {
      this.newrelic.recordCustomEvent(eventType, attributes);
    } catch (error) {
      this.logger.error(`Failed to record New Relic custom event ${eventType}`, error);
    }
  }

  /**
   * Get current transaction ID
   */
  getTransactionId(): string | null {
    if (!this.isInitialized || !this.newrelic) {
      return null;
    }

    try {
      return this.newrelic.getTransaction()?.id || null;
    } catch (error) {
      this.logger.error('Failed to get New Relic transaction ID', error);
      return null;
    }
  }

  /**
   * Create a web transaction
   */
  createWebTransaction(
    name: string,
    callback: () => Promise<any>,
  ): Promise<any> {
    if (!this.isInitialized || !this.newrelic) {
      return callback();
    }

    try {
      return new Promise((resolve, reject) => {
        const transaction = this.startTransaction(name, 'web');
        if (!transaction) {
          callback().then(resolve).catch(reject);
          return;
        }

        callback()
          .then((result) => {
            this.logger.debug(`New Relic transaction ${name} completed successfully`);
            resolve(result);
          })
          .catch((error) => {
            this.noticeError(error);
            reject(error);
          });
      });
    } catch (error) {
      this.logger.error(`Failed to create New Relic web transaction ${name}`, error);
      return callback();
    }
  }

  /**
   * Check if New Relic is initialized
   */
  isActive(): boolean {
    return this.isInitialized && !!this.newrelic;
  }
}
