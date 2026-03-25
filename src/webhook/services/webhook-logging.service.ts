import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookLogEntry } from '../interfaces/webhook.interfaces';
import { WebhookLog } from '../entities/webhook-log.entity';

@Injectable()
export class WebhookLoggingService {
  private readonly logger = new Logger(WebhookLoggingService.name);

  constructor(
    @InjectRepository(WebhookLog)
    private webhookLogRepository: Repository<WebhookLog>,
  ) {}

  /**
   * Log webhook event
   */
  async logWebhookEvent(logEntry: Partial<WebhookLogEntry>): Promise<WebhookLog> {
    try {
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

      const savedLog = await this.webhookLogRepository.save(log);

      // Also log to application logger for immediate visibility
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
   * Get webhook logs with filtering
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
      const queryBuilder = this.webhookLogRepository.createQueryBuilder('log');

      if (filters.provider) {
        queryBuilder.andWhere('log.provider = :provider', { provider: filters.provider });
      }

      if (filters.eventType) {
        queryBuilder.andWhere('log.eventType = :eventType', { eventType: filters.eventType });
      }

      if (filters.status) {
        queryBuilder.andWhere('log.status = :status', { status: filters.status });
      }

      if (filters.startDate) {
        queryBuilder.andWhere('log.timestamp >= :startDate', { startDate: filters.startDate });
      }

      if (filters.endDate) {
        queryBuilder.andWhere('log.timestamp <= :endDate', { endDate: filters.endDate });
      }

      const total = await queryBuilder.getCount();

      queryBuilder
        .orderBy('log.timestamp', 'DESC')
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
   * Get webhook statistics
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

      const queryBuilder = this.webhookLogRepository
        .createQueryBuilder('log')
        .where('log.timestamp >= :startDate', { startDate });

      const logs = await queryBuilder.getMany();

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

      // Group by provider
      logs.forEach((log) => {
        if (!stats.byProvider[log.provider]) {
          stats.byProvider[log.provider] = { total: 0, success: 0, failed: 0 };
        }
        stats.byProvider[log.provider].total++;
        if (log.status === 'success') stats.byProvider[log.provider].success++;
        if (log.status === 'failed') stats.byProvider[log.provider].failed++;
      });

      // Group by event type
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
   * Clean up old logs based on retention policy
   */
  async cleanupOldLogs(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.webhookLogRepository
        .createQueryBuilder()
        .delete()
        .where('timestamp < :cutoffDate', { cutoffDate })
        .execute();

      const deletedCount = result.affected || 0;

      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} old webhook log entries`);
      }

      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to cleanup old logs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get error patterns from failed webhooks
   */
  async getErrorPatterns(
    limit: number = 10,
  ): Promise<Array<{ error: string; count: number; lastOccurred: Date }>> {
    try {
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
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `webhook_log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Monitor webhook health and alert on issues
   */
  async monitorWebhookHealth(): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check recent failure rate
      const recentStats = await this.getWebhookStatistics('hour');
      const failureRate =
        recentStats.total > 0 ? (recentStats.failed / recentStats.total) * 100 : 0;

      if (failureRate > 10) {
        issues.push(`High failure rate: ${failureRate.toFixed(2)}% in the last hour`);
        recommendations.push('Check webhook provider status and configuration');
      }

      // Check for repeated errors
      const errorPatterns = await this.getErrorPatterns(5);
      if (errorPatterns.length > 0 && errorPatterns[0].count > 5) {
        issues.push(
          `Repeated error: "${errorPatterns[0].error}" occurred ${errorPatterns[0].count} times`,
        );
        recommendations.push('Investigate root cause of repeated errors');
      }

      // Check average processing time
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
}
