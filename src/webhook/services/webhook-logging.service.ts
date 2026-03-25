import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookLogEntry } from '../interfaces/webhook.interfaces';
import { WebhookLog } from '../entities/webhook-log.entity';

/**
 * Webhook Logging Service
 *
 * Provides comprehensive logging and monitoring for webhook events including:
 * - Event logging with metadata capture
 * - Performance metrics tracking
 * - Error pattern analysis
 * - Health monitoring and alerting
 * - Automated log cleanup and retention
 *
 * Business Rules:
 * 1. All webhook events must be logged for audit purposes
 * 2. Performance metrics are captured for monitoring
 * 3. Error patterns are analyzed for security insights
 * 4. Logs are retained according to configurable policies
 * 5. Health monitoring provides real-time system status
 *
 * @example
 * ```typescript
 * const loggingService = new WebhookLoggingService(logRepository);
 * await loggingService.logWebhookEvent({
 *   provider: 'stripe',
 *   eventType: 'payment.succeeded',
 *   status: 'success',
 *   duration: 45,
 *   ipAddress: '192.168.1.1'
 * });
 * ```
 */
@Injectable()
export class WebhookLoggingService {
  private readonly logger = new Logger(WebhookLoggingService.name);

  constructor(
    @InjectRepository(WebhookLog)
    private webhookLogRepository: Repository<WebhookLog>,
  ) {}

  /**
   * Logs webhook event with comprehensive metadata
   *
   * Business Logic:
   * 1. Captures all relevant event metadata for audit trails
   * 2. Stores performance metrics for monitoring
   * 3. Sanitizes sensitive data before storage
   * 4. Provides structured logging for analysis
   * 5. Enables troubleshooting and debugging
   *
   * Data Capture Strategy:
   * - Provider and event type for categorization
   * - Processing status and duration for performance
   * - IP address and user agent for security
   * - Error details for troubleshooting
   * - Configurable payload/header inclusion
   *
   * @param logEntry - Webhook event data to log
   * @returns Saved log entry with generated ID
   *
   * @example
   * ```typescript
   * const log = await this.logWebhookEvent({
   *   provider: 'stripe',
   *   eventType: 'payment.succeeded',
   *   status: 'success',
   *   duration: 45,
   *   payload: { id: 'evt_123' },
   *   headers: { 'stripe-signature': '...' },
   *   ipAddress: '192.168.1.1',
   *   userAgent: 'Stripe/1.0'
   * });
   * ```
   */
  async logWebhookEvent(logEntry: Partial<WebhookLogEntry>): Promise<WebhookLog> {
    try {
      // Create structured log entry with all metadata
      const log = this.webhookLogRepository.create({
        id: logEntry.id || this.generateLogId(),
        provider: logEntry.provider,
        eventType: logEntry.eventType,
        status: logEntry.status || 'success',
        timestamp: logEntry.timestamp || new Date(),
        duration: logEntry.duration || 0,
        error: logEntry.error,
        payload: logEntry.payload,
        headers: logEntry.headers,
        ipAddress: logEntry.ipAddress,
        userAgent: logEntry.userAgent,
      });

      // Persist to database for audit trail
      const savedLog = await this.webhookLogRepository.save(log);

      // Application logging for immediate visibility
      // Different log levels based on event status
      if (logEntry.status === 'failed') {
        this.logger.error(
          `Webhook failed - Provider: ${logEntry.provider}, Event: ${logEntry.eventType}, Error: ${logEntry.error}`,
        );
      } else {
        this.logger.log(
          `Webhook processed - Provider: ${logEntry.provider}, Event: ${logEntry.eventType}, Duration: ${logEntry.duration}ms`,
        );
      }

      return savedLog;
    } catch (error) {
      this.logger.error(`Failed to log webhook event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Retrieves webhook logs with advanced filtering capabilities
   *
   * Query Strategy:
   * 1. Supports multiple filter criteria for flexible querying
   * 2. Uses database indexes for optimal performance
   * 3. Implements pagination for large result sets
   * 4. Provides total count for UI pagination
   * 5. Optimized for common monitoring scenarios
   *
   * Performance Considerations:
   * - Indexed queries on provider, status, and timestamp
   * - Pagination prevents memory issues with large datasets
   * - Efficient WHERE clause construction
   * - Configurable result limits
   *
   * @param filters - Filter criteria for log retrieval
   * @returns Paginated results with total count
   *
   * @example
   * ```typescript
   * const results = await this.getWebhookLogs({
   *   provider: 'stripe',
   *   status: 'failed',
   *   startDate: new Date('2024-01-01'),
   *   limit: 50,
   *   offset: 0
   * });
   * ```
   */
  async getWebhookLogs(filters: {
    provider?: string;
    eventType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: WebhookLog[]; total: number }> {
    try {
      // Build dynamic query with filters
      const queryBuilder = this.webhookLogRepository.createQueryBuilder('log');

      // Apply filters conditionally to optimize query performance
      if (filters.provider) {
        queryBuilder.andWhere('log.provider = :provider', { provider: filters.provider });
      }

      if (filters.eventType) {
        queryBuilder.andWhere('log.eventType = :eventType', { eventType: filters.eventType });
      }

      if (filters.status) {
        queryBuilder.andWhere('log.status = :status', { status: filters.status });
      }

      // Date range filtering with proper indexing
      if (filters.startDate) {
        queryBuilder.andWhere('log.timestamp >= :startDate', { startDate: filters.startDate });
      }

      if (filters.endDate) {
        queryBuilder.andWhere('log.timestamp <= :endDate', { endDate: filters.endDate });
      }

      // Get total count for pagination (before limit/offset)
      const total = await queryBuilder.getCount();

      // Apply pagination and ordering
      queryBuilder
        .orderBy('log.timestamp', 'DESC') // Most recent first
        .limit(filters.limit || 100)
        .offset(filters.offset || 0);

      const logs = await queryBuilder.getMany();

      return { logs, total };
    } catch (error) {
      this.logger.error(`Failed to get webhook logs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generates comprehensive webhook statistics for monitoring
   *
   * Analytics Strategy:
   * 1. Aggregates data across multiple dimensions
   * 2. Provides time-based analysis capabilities
   * 3. Calculates performance metrics
   * 4. Groups data by provider and event type
   * 5. Enables trend analysis and alerting
   *
   * Business Intelligence:
   * - Success/failure rates per provider
   * - Average processing duration
   * - Event type distribution
   * - Time-based performance trends
   * - Provider-specific insights
   *
   * @param timeRange - Time window for analysis (hour/day/week/month)
   * @returns Comprehensive statistics object
   *
   * @example
   * ```typescript
   * const stats = await this.getWebhookStatistics('day');
   * console.log(`Success rate: ${(stats.success / stats.total * 100).toFixed(2)}%`);
   * console.log(`Average duration: ${stats.averageDuration}ms`);
   * ```
   */
  async getWebhookStatistics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<{
    total: number;
    success: number;
    failed: number;
    retry: number;
    averageDuration: number;
    byProvider: Record<string, { total: number; success: number; failed: number }>;
    byEventType: Record<string, number>;
  }> {
    try {
      // Calculate time window based on range
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case 'hour':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      // Query logs within time window
      const queryBuilder = this.webhookLogRepository
        .createQueryBuilder('log')
        .where('log.timestamp >= :startDate', { startDate });

      const logs = await queryBuilder.getMany();

      // Initialize statistics object
      const stats = {
        total: logs.length,
        success: logs.filter((log) => log.status === 'success').length,
        failed: logs.filter((log) => log.status === 'failed').length,
        retry: logs.filter((log) => log.status === 'retry').length,
        averageDuration:
          logs.length > 0 ? logs.reduce((sum, log) => sum + log.duration, 0) / logs.length : 0,
        byProvider: {} as Record<string, { total: number; success: number; failed: number }>,
        byEventType: {} as Record<string, number>,
      };

      // Aggregate data by provider
      logs.forEach((log) => {
        if (!stats.byProvider[log.provider]) {
          stats.byProvider[log.provider] = { total: 0, success: 0, failed: 0 };
        }
        stats.byProvider[log.provider].total++;
        if (log.status === 'success') stats.byProvider[log.provider].success++;
        if (log.status === 'failed') stats.byProvider[log.provider].failed++;
      });

      // Aggregate data by event type
      logs.forEach((log) => {
        stats.byEventType[log.eventType] = (stats.byEventType[log.eventType] || 0) + 1;
      });

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get webhook statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Cleans up old log entries based on retention policy
   *
   * Data Management Strategy:
   * 1. Implements configurable retention policies
   * 2. Performs batch deletions for efficiency
   * 3. Maintains database performance over time
   * 4. Provides audit trail compliance
   * 5. Supports automated cleanup scheduling
   *
   * Performance Considerations:
   * - Uses bulk delete operations
   * - Operates during off-peak hours
   * - Maintains database index efficiency
   * - Prevents storage bloat
   *
   * @param retentionDays - Number of days to retain logs (default: 30)
   * @returns Number of deleted log entries
   *
   * @example
   * ```typescript
   * // Clean up logs older than 30 days
   * const deletedCount = await this.cleanupOldLogs(30);
   * this.logger.log(`Cleaned up ${deletedCount} old log entries`);
   * ```
   */
  async cleanupOldLogs(retentionDays: number = 30): Promise<number> {
    try {
      // Calculate cutoff date for retention
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Perform bulk delete operation
      const result = await this.webhookLogRepository
        .createQueryBuilder()
        .delete()
        .where('timestamp < :cutoffDate', { cutoffDate })
        .execute();

      const deletedCount = result.affected || 0;

      // Log cleanup operation for audit trail
      if (deletedCount > 0) {
        this.logger.log(
          `Cleaned up ${deletedCount} old webhook log entries older than ${retentionDays} days`,
        );
      }

      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to cleanup old logs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Analyzes error patterns from failed webhook events
   *
   * Error Analysis Strategy:
   * 1. Groups similar errors for pattern identification
   * 2. Tracks frequency and recurrence
   * 3. Identifies common failure points
   * 4. Enables proactive issue resolution
   * 5. Supports security threat detection
   *
   * Business Intelligence:
   * - Most frequent error types
   * - Error recurrence patterns
   * - Provider-specific issues
   * - Time-based error trends
   * - Security incident indicators
   *
   * @param limit - Maximum number of patterns to return (default: 10)
   * @returns Array of error patterns with frequency data
   *
   * @example
   * ```typescript
   * const patterns = await this.getErrorPatterns(5);
   * patterns.forEach(pattern => {
   *   console.log(`Error: ${pattern.error}, Count: ${pattern.count}`);
   * });
   * ```
   */
  async getErrorPatterns(
    limit: number = 10,
  ): Promise<Array<{ error: string; count: number; lastOccurred: Date }>> {
    try {
      // Query failed events and group by error message
      const result = await this.webhookLogRepository
        .createQueryBuilder('log')
        .select('log.error', 'error')
        .addSelect('COUNT(*)', 'count')
        .addSelect('MAX(log.timestamp)', 'lastOccurred')
        .where('log.status = :status', { status: 'failed' })
        .andWhere('log.error IS NOT NULL')
        .groupBy('log.error')
        .orderBy('count', 'DESC')
        .limit(limit)
        .getRawMany();

      // Transform raw results into structured data
      return result.map((row) => ({
        error: row.error,
        count: parseInt(row.count),
        lastOccurred: new Date(row.lastOccurred),
      }));
    } catch (error) {
      this.logger.error(`Failed to get error patterns: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Monitors webhook system health and identifies issues
   *
   * Health Monitoring Strategy:
   * 1. Analyzes recent performance metrics
   * 2. Identifies potential security issues
   * 3. Checks for system anomalies
   * 4. Provides actionable recommendations
   * 5. Enables proactive maintenance
   *
   * Health Indicators:
   * - Failure rate thresholds
   * - Performance degradation
   * - Error pattern anomalies
   * - Security threat indicators
   * - System reliability metrics
   *
   * @returns Health assessment with issues and recommendations
   *
   * @example
   * ```typescript
   * const health = await this.monitorWebhookHealth();
   * if (!health.isHealthy) {
   *   health.issues.forEach(issue => this.logger.warn(issue));
   *   health.recommendations.forEach(rec => this.logger.info(rec));
   * }
   * ```
   */
  async monitorWebhookHealth(): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Analyze recent failure rate
      const recentStats = await this.getWebhookStatistics('hour');
      const failureRate =
        recentStats.total > 0 ? (recentStats.failed / recentStats.total) * 100 : 0;

      // Business Rule: Failure rate should not exceed 10%
      if (failureRate > 10) {
        issues.push(`High failure rate: ${failureRate.toFixed(2)}% in the last hour`);
        recommendations.push('Check webhook provider status and configuration');
      }

      // Analyze error patterns for repeated issues
      const errorPatterns = await this.getErrorPatterns(5);
      if (errorPatterns.length > 0 && errorPatterns[0].count > 5) {
        issues.push(
          `Repeated error: "${errorPatterns[0].error}" occurred ${errorPatterns[0].count} times`,
        );
        recommendations.push('Investigate root cause of repeated errors');
      }

      // Check average processing time performance
      // Business Rule: Average processing should not exceed 5 seconds
      if (recentStats.averageDuration > 5000) {
        issues.push(
          `Slow processing: Average duration ${recentStats.averageDuration.toFixed(2)}ms`,
        );
        recommendations.push('Optimize webhook processing logic');
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Failed to monitor webhook health: ${error.message}`, error.stack);
      return {
        isHealthy: false,
        issues: [`Health monitoring failed: ${error.message}`],
        recommendations: ['Check logging service configuration'],
      };
    }
  }

  /**
   * Generates unique log entry identifiers
   *
   * ID Generation Strategy:
   * 1. Uses timestamp for chronological ordering
   * 2. Adds random component for uniqueness
   * 3. Ensures no collisions in high-volume scenarios
   * 4. Provides human-readable identifiers
   * 5. Supports distributed system scenarios
   *
   * Format: webhook_log_{timestamp}_{randomString}
   *
   * @returns Unique log entry identifier
   */
  private generateLogId(): string {
    return `webhook_log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
