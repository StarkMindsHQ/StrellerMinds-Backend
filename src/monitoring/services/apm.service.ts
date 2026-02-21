import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformanceMetric, MetricType, MetricSeverity } from '../entities/performance-metric.entity';
import { Transaction, PerformanceSnapshot, PerformanceThresholds } from '../interfaces/apm.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as os from 'os';

@Injectable()
export class ApmService {
  private readonly logger = new Logger(ApmService.name);
  private activeTransactions = new Map<string, Transaction>();
  private performanceHistory: PerformanceSnapshot[] = [];
  private readonly maxHistorySize = 1000;
  private readonly thresholds: PerformanceThresholds = {
    responseTime: {
      p50: 200,
      p95: 500,
      p99: 1000,
    },
    errorRate: 1.0,
    throughput: 100,
    memoryUsage: 85,
    cpuUsage: 80,
    databaseQueryTime: 1000,
    cacheHitRate: 70,
  };

  constructor(
    @InjectRepository(PerformanceMetric)
    private metricRepository: Repository<PerformanceMetric>,
    private eventEmitter: EventEmitter2,
  ) {
    // Start periodic performance snapshots
    this.startPerformanceMonitoring();
  }

  /**
   * Start a new transaction
   */
  startTransaction(name: string, type: Transaction['type'], metadata?: Record<string, any>): string {
    const transactionId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const transaction: Transaction = {
      id: transactionId,
      name,
      type,
      startTime: Date.now(),
      status: 'success',
      metadata,
      children: [],
    };

    this.activeTransactions.set(transactionId, transaction);
    return transactionId;
  }

  /**
   * End a transaction
   */
  endTransaction(
    transactionId: string,
    status: Transaction['status'] = 'success',
    metadata?: Record<string, any>,
  ): void {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      this.logger.warn(`Transaction ${transactionId} not found`);
      return;
    }

    transaction.endTime = Date.now();
    transaction.duration = transaction.endTime - transaction.startTime;
    transaction.status = status;
    if (metadata) {
      transaction.metadata = { ...transaction.metadata, ...metadata };
    }

    // Save metric
    this.saveMetric(transaction);

    // Check thresholds
    this.checkThresholds(transaction);

    // Remove from active transactions
    this.activeTransactions.delete(transactionId);

    // Emit event
    this.eventEmitter.emit('transaction.completed', transaction);
  }

  /**
   * Add child transaction
   */
  addChildTransaction(parentId: string, child: Transaction): void {
    const parent = this.activeTransactions.get(parentId);
    if (parent) {
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(child);
    }
  }

  /**
   * Get active transactions
   */
  getActiveTransactions(): Transaction[] {
    return Array.from(this.activeTransactions.values());
  }

  /**
   * Get transaction by ID
   */
  getTransaction(transactionId: string): Transaction | undefined {
    return this.activeTransactions.get(transactionId);
  }

  /**
   * Capture performance snapshot
   */
  captureSnapshot(): PerformanceSnapshot {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const startUsage = process.cpuUsage();

    // Calculate CPU percentage (simplified)
    const totalCpu = os.cpus().length;
    const cpuPercentage = (cpuUsage.user + cpuUsage.system) / 1000000 / totalCpu;

    const snapshot: PerformanceSnapshot = {
      timestamp: new Date(),
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        percentage: cpuPercentage,
      },
      eventLoop: {
        delay: 0, // Would need additional library for accurate measurement
        utilization: 0,
      },
      activeHandles: (process as any)._getActiveHandles?.()?.length || 0,
      activeRequests: (process as any)._getActiveRequests?.()?.length || 0,
    };

    this.performanceHistory.push(snapshot);
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }

    return snapshot;
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(limit: number = 100): PerformanceSnapshot[] {
    return this.performanceHistory.slice(-limit);
  }

  /**
   * Get current performance metrics
   */
  async getCurrentMetrics(): Promise<{
    activeTransactions: number;
    averageResponseTime: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
    throughput: number;
  }> {
    const recentMetrics = await this.metricRepository.find({
      where: { type: MetricType.HTTP_REQUEST },
      order: { timestamp: 'DESC' },
      take: 1000,
    });

    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recent = recentMetrics.filter((m) => m.timestamp.getTime() > oneMinuteAgo);

    const durations = recent.map((m) => m.duration);
    const errors = recent.filter((m) => m.statusCode && m.statusCode >= 400).length;
    const latestSnapshot = this.performanceHistory[this.performanceHistory.length - 1];

    return {
      activeTransactions: this.activeTransactions.size,
      averageResponseTime: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      errorRate: recent.length > 0 ? (errors / recent.length) * 100 : 0,
      memoryUsage: latestSnapshot
        ? (latestSnapshot.memory.heapUsed / latestSnapshot.memory.heapTotal) * 100
        : 0,
      cpuUsage: latestSnapshot ? latestSnapshot.cpu.percentage : 0,
      throughput: recent.length / 60, // requests per second
    };
  }

  /**
   * Save metric to database
   */
  private async saveMetric(transaction: Transaction): Promise<void> {
    try {
      const metricType = this.mapTransactionTypeToMetricType(transaction.type);
      const severity = this.calculateSeverity(transaction);

      const metric = this.metricRepository.create({
        type: metricType,
        endpoint: transaction.metadata?.endpoint,
        method: transaction.metadata?.method,
        duration: transaction.duration || 0,
        statusCode: transaction.metadata?.statusCode,
        severity,
        metadata: transaction.metadata,
        requestId: transaction.id,
      });

      await this.metricRepository.save(metric);
    } catch (error) {
      this.logger.error(`Failed to save metric: ${error.message}`);
    }
  }

  /**
   * Check performance thresholds
   */
  private checkThresholds(transaction: Transaction): void {
    if (!transaction.duration) return;

    const thresholds = this.thresholds.responseTime;
    let severity: MetricSeverity = MetricSeverity.LOW;

    if (transaction.duration > thresholds.p99) {
      severity = MetricSeverity.CRITICAL;
    } else if (transaction.duration > thresholds.p95) {
      severity = MetricSeverity.HIGH;
    } else if (transaction.duration > thresholds.p50) {
      severity = MetricSeverity.MEDIUM;
    }

    if (severity !== MetricSeverity.LOW) {
      this.eventEmitter.emit('performance.threshold.exceeded', {
        transaction,
        severity,
        threshold: thresholds,
      });
    }
  }

  /**
   * Calculate severity based on transaction
   */
  private calculateSeverity(transaction: Transaction): MetricSeverity {
    if (!transaction.duration) return MetricSeverity.LOW;

    const thresholds = this.thresholds.responseTime;
    if (transaction.duration > thresholds.p99) return MetricSeverity.CRITICAL;
    if (transaction.duration > thresholds.p95) return MetricSeverity.HIGH;
    if (transaction.duration > thresholds.p50) return MetricSeverity.MEDIUM;
    return MetricSeverity.LOW;
  }

  /**
   * Map transaction type to metric type
   */
  private mapTransactionTypeToMetricType(type: Transaction['type']): MetricType {
    const mapping: Record<Transaction['type'], MetricType> = {
      http: MetricType.HTTP_REQUEST,
      database: MetricType.DATABASE_QUERY,
      cache: MetricType.CACHE_OPERATION,
      external: MetricType.EXTERNAL_API,
      background: MetricType.BACKGROUND_JOB,
    };
    return mapping[type] || MetricType.CUSTOM;
  }

  /**
   * Start periodic performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.captureSnapshot();
    }, 5000); // Every 5 seconds
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(timeRange: { start: Date; end: Date }): Promise<{
    totalTransactions: number;
    averageDuration: number;
    p50: number;
    p95: number;
    p99: number;
    errorRate: number;
    byType: Record<string, number>;
  }> {
    const metrics = await this.metricRepository.find({
      where: {
        timestamp: {
          $gte: timeRange.start,
          $lte: timeRange.end,
        } as any,
      },
    });

    if (metrics.length === 0) {
      return {
        totalTransactions: 0,
        averageDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        errorRate: 0,
        byType: {},
      };
    }

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const errors = metrics.filter((m) => m.statusCode && m.statusCode >= 400).length;

    const byType: Record<string, number> = {};
    metrics.forEach((m) => {
      byType[m.type] = (byType[m.type] || 0) + 1;
    });

    return {
      totalTransactions: metrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      errorRate: (errors / metrics.length) * 100,
      byType,
    };
  }
}
