import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoggerService } from '../common/logging/logger.service';
import { AlertingService } from '../common/alerting/alerting.service';
import { ErrorLog } from '../common/entities/error-log.entity';

export interface ErrorSummary {
  totalErrors: number;
  errorRate: number;
  criticalErrors: number;
  topErrorTypes: Array<{
    errorCode: string;
    count: number;
    percentage: number;
  }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface ErrorTrend {
  timestamp: Date;
  totalCount: number;
  criticalCount: number;
  errorRate: number;
}

export interface TopError {
  errorCode: string;
  errorMessage: string;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedEndpoints: string[];
}

export interface ErrorDetails {
  correlationId: string;
  errorCode: string;
  errorMessage: string;
  statusCode: number;
  timestamp: Date;
  endpoint: string;
  method: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  stackTrace?: string;
  context: Record<string, any>;
}

export interface AlertHistoryItem {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

@Injectable()
export class ErrorDashboardService {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly alertingService: AlertingService,
    @InjectRepository(ErrorLog)
    private readonly errorLogRepository: Repository<ErrorLog>,
  ) {}

  async getErrorSummary(timeRangeHours = 24, errorCode?: string): Promise<ErrorSummary> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - timeRangeHours * 60 * 60 * 1000);

    // Build query
    let query = this.errorLogRepository
      .createQueryBuilder('error')
      .where('error.timestamp >= :startDate AND error.timestamp <= :endDate', {
        startDate,
        endDate,
      });

    if (errorCode) {
      query = query.andWhere('error.errorCode = :errorCode', { errorCode });
    }

    // Get all matching errors
    const filteredLogs = await query.getMany();

    // Calculate statistics
    const totalErrors = filteredLogs.length;
    const criticalErrors = filteredLogs.filter(
      (log: ErrorLog) => log.severity === 'high' || log.severity === 'critical',
    ).length;

    // Calculate error rate (errors per hour)
    const errorRate = totalErrors / timeRangeHours;

    // Group by error code and calculate top errors
    const errorTypeCounts: Record<string, number> = {};
    filteredLogs.forEach((log: ErrorLog) => {
      errorTypeCounts[log.errorCode] = (errorTypeCounts[log.errorCode] || 0) + 1;
    });

    const topErrorTypes = Object.entries(errorTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([errorCode, count]) => ({
        errorCode,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0,
      }));

    return {
      totalErrors,
      errorRate,
      criticalErrors,
      topErrorTypes,
      timeRange: {
        start: startDate,
        end: endDate,
      },
    };
  }

  async getErrorTrends(timeRangeHours = 168, intervalHours = 1): Promise<ErrorTrend[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - timeRangeHours * 60 * 60 * 1000);

    const trends: ErrorTrend[] = [];

    // Create time intervals
    const intervals = Math.ceil(timeRangeHours / intervalHours);
    for (let i = 0; i < intervals; i++) {
      const intervalStart = new Date(startDate.getTime() + i * intervalHours * 60 * 60 * 1000);
      const intervalEnd = new Date(intervalStart.getTime() + intervalHours * 60 * 60 * 1000);

      // Get counts for this interval
      const totalCount = await this.errorLogRepository
        .createQueryBuilder('error')
        .where('error.timestamp >= :intervalStart AND error.timestamp < :intervalEnd', {
          intervalStart,
          intervalEnd,
        })
        .getCount();

      const criticalCount = await this.errorLogRepository
        .createQueryBuilder('error')
        .where('error.timestamp >= :intervalStart AND error.timestamp < :intervalEnd', {
          intervalStart,
          intervalEnd,
        })
        .andWhere('error.severity IN (:...severities)', { severities: ['high', 'critical'] })
        .getCount();

      // Calculate error rate for this interval (errors per hour)
      const errorRate = totalCount / intervalHours;

      trends.push({
        timestamp: intervalStart,
        totalCount,
        criticalCount,
        errorRate,
      });
    }

    return trends;
  }

  async getTopErrors(limit = 10, timeRangeHours = 24): Promise<TopError[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - timeRangeHours * 60 * 60 * 1000);

    // Get errors grouped by error code with aggregation information
    const results = await this.errorLogRepository
      .createQueryBuilder('error')
      .select('error.errorCode', 'errorCode')
      .addSelect('error.errorMessage', 'errorMessage')
      .addSelect('COUNT(error.id)', 'count')
      .addSelect('MIN(error.timestamp)', 'firstOccurrence')
      .addSelect('MAX(error.timestamp)', 'lastOccurrence')
      .addSelect('ARRAY_AGG(DISTINCT error.endpoint)', 'affectedEndpoints')
      .where('error.timestamp >= :startDate AND error.timestamp <= :endDate', {
        startDate,
        endDate,
      })
      .groupBy('error.errorCode, error.errorMessage')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((result: any) => ({
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      count: parseInt(result.count, 10),
      firstOccurrence: new Date(result.firstOccurrence),
      lastOccurrence: new Date(result.lastOccurrence),
      affectedEndpoints: result.affectedEndpoints ? result.affectedEndpoints.filter(Boolean) : [],
    }));
  }

  async getErrorDetails(correlationId: string): Promise<ErrorDetails | null> {
    const log = await this.errorLogRepository
      .createQueryBuilder('error')
      .where('error.correlationId = :correlationId', { correlationId })
      .getOne();

    if (!log) {
      return null;
    }

    return {
      correlationId: log.correlationId,
      errorCode: log.errorCode,
      errorMessage: log.errorMessage,
      statusCode: log.statusCode,
      timestamp: log.timestamp,
      endpoint: log.endpoint,
      method: log.method,
      userId: log.userId,
      userAgent: log.userAgent,
      ip: log.ip,
      stackTrace: log.stackTrace,
      context: log.context || {},
    };
  }

  async getAlertHistory(timeRangeHours = 168, severity?: string): Promise<AlertHistoryItem[]> {
    // For now, we'll return an empty array since alert history is not yet implemented
    // This would typically be stored in a separate table
    return [];
  }

  // Method to add error logs (would be called by the exception filter)
  async addErrorLog(errorLogData: any): Promise<void> {
    try {
      const errorLog = this.errorLogRepository.create({
        correlationId: errorLogData.correlationId,
        errorCode: errorLogData.errorCode,
        errorMessage: errorLogData.message,
        statusCode: errorLogData.statusCode,
        endpoint: errorLogData.endpoint,
        method: errorLogData.method,
        userId: errorLogData.userId,
        userAgent: errorLogData.userAgent,
        ip: errorLogData.ip,
        stackTrace: errorLogData.stackTrace,
        context: errorLogData.context || {},
        severity: errorLogData.severity || 'medium',
        category: errorLogData.category || 'UNKNOWN',
        timestamp: new Date(errorLogData.timestamp),
      });

      await this.errorLogRepository.save(errorLog);
    } catch (error: any) {
      this.loggerService.error('Failed to save error log to database', {
        error: error.message,
        correlationId: errorLogData.correlationId,
      });
    }
  }

  // Method to add alert history (would be called by the alerting service)
  async addAlertHistory(alert: AlertHistoryItem): Promise<void> {
    // This would typically save to a separate alert history table
    this.loggerService.info('Alert history item received', {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
    });
  }
}
