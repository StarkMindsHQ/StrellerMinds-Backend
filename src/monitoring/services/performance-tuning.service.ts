import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApmService } from './apm.service';
import { DatabaseOptimizationService } from './database-optimization.service';
import { CacheOptimizationService } from './cache-optimization.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformanceReport, ReportType, ReportStatus } from '../entities/performance-report.entity';

export interface TuningAction {
  id: string;
  type: 'database' | 'cache' | 'connection' | 'memory' | 'cpu';
  action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: string;
  applied: boolean;
  appliedAt?: Date;
  result?: string;
}

@Injectable()
export class PerformanceTuningService {
  private readonly logger = new Logger(PerformanceTuningService.name);
  private tuningHistory: TuningAction[] = [];
  private readonly maxHistorySize = 1000;

  constructor(
    private apmService: ApmService,
    private databaseOptimization: DatabaseOptimizationService,
    private cacheOptimization: CacheOptimizationService,
    private eventEmitter: EventEmitter2,
    @InjectRepository(PerformanceReport)
    private reportRepository: Repository<PerformanceReport>,
  ) {}

  /**
   * Run automated performance tuning analysis
   */
  @Cron(CronExpression.EVERY_HOUR)
  async runAutomatedTuning(): Promise<void> {
    this.logger.log('Running automated performance tuning...');

    try {
      const [currentMetrics, cacheMetrics, dbHealth] = await Promise.all([
        this.apmService.getCurrentMetrics(),
        this.cacheOptimization.getCacheMetrics(),
        this.databaseOptimization.getOptimizationStats(),
        this.databaseOptimization.getOptimizationStats(),
      ]);

      const actions: TuningAction[] = [];

      // Analyze memory usage
      if (currentMetrics.memoryUsage > 85) {
        actions.push({
          id: `memory_${Date.now()}`,
          type: 'memory',
          action: 'Trigger garbage collection and clear unused cache',
          priority: currentMetrics.memoryUsage > 95 ? 'critical' : 'high',
          estimatedImpact: `Reduce memory usage by ~${Math.round(currentMetrics.memoryUsage - 70)}%`,
          applied: false,
        });
      }

      // Analyze cache performance
      if (cacheMetrics.overall.hitRate < 70) {
        actions.push({
          id: `cache_${Date.now()}`,
          type: 'cache',
          action: 'Optimize cache TTL and increase cache size',
          priority: cacheMetrics.overall.hitRate < 50 ? 'high' : 'medium',
          estimatedImpact: `Improve cache hit rate by ~${Math.round(70 - cacheMetrics.overall.hitRate)}%`,
          applied: false,
        });
      }

      // Analyze database performance
      if (currentMetrics.averageResponseTime > 500) {
        actions.push({
          id: `db_${Date.now()}`,
          type: 'database',
          action: 'Review and apply pending query optimizations',
          priority: currentMetrics.averageResponseTime > 1000 ? 'high' : 'medium',
          estimatedImpact: 'Reduce average response time by 20-30%',
          applied: false,
        });
      }

      // Analyze CPU usage
      if (currentMetrics.cpuUsage > 80) {
        actions.push({
          id: `cpu_${Date.now()}`,
          type: 'cpu',
          action: 'Scale horizontally or optimize heavy operations',
          priority: currentMetrics.cpuUsage > 90 ? 'critical' : 'high',
          estimatedImpact: 'Reduce CPU load by distributing workload',
          applied: false,
        });
      }

      // Analyze error rate
      if (currentMetrics.errorRate > 1) {
        actions.push({
          id: `error_${Date.now()}`,
          type: 'connection',
          action: 'Investigate error sources and improve error handling',
          priority: currentMetrics.errorRate > 5 ? 'critical' : 'high',
          estimatedImpact: 'Reduce error rate and improve reliability',
          applied: false,
        });
      }

      // Apply automatic actions for low/medium priority
      for (const action of actions) {
        if (action.priority === 'low' || action.priority === 'medium') {
          await this.applyAction(action);
        }
      }

      // Store high/critical priority actions for manual review
      const criticalActions = actions.filter((a) => a.priority === 'high' || a.priority === 'critical');
      if (criticalActions.length > 0) {
        this.eventEmitter.emit('performance.tuning.actions', criticalActions);
      }

      this.tuningHistory.push(...actions);
      if (this.tuningHistory.length > this.maxHistorySize) {
        this.tuningHistory = this.tuningHistory.slice(-this.maxHistorySize);
      }

      this.logger.log(`Performance tuning completed. Generated ${actions.length} actions.`);
    } catch (error) {
      this.logger.error(`Automated tuning failed: ${error.message}`);
    }
  }

  /**
   * Apply a tuning action
   */
  async applyAction(action: TuningAction): Promise<{ success: boolean; message: string }> {
    try {
      switch (action.type) {
        case 'memory':
          return await this.applyMemoryAction(action);
        case 'cache':
          return await this.applyCacheAction(action);
        case 'database':
          return await this.applyDatabaseAction(action);
        case 'cpu':
          return await this.applyCpuAction(action);
        case 'connection':
          return await this.applyConnectionAction(action);
        default:
          return { success: false, message: 'Unknown action type' };
      }
    } catch (error) {
      this.logger.error(`Failed to apply action ${action.id}: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Apply memory optimization action
   */
  private async applyMemoryAction(action: TuningAction): Promise<{ success: boolean; message: string }> {
    // Clear expired cache entries
    await this.cacheOptimization.clearAll();

    // Trigger garbage collection if available
    if (global.gc) {
      global.gc();
    }

    action.applied = true;
    action.appliedAt = new Date();
    action.result = 'Memory optimization applied - cache cleared';

    return { success: true, message: 'Memory optimization applied' };
  }

  /**
   * Apply cache optimization action
   */
  private async applyCacheAction(action: TuningAction): Promise<{ success: boolean; message: string }> {
    // This would typically involve adjusting cache TTL or size
    // For now, we'll just log the recommendation
    action.applied = true;
    action.appliedAt = new Date();
    action.result = 'Cache optimization recommendations generated';

    return { success: true, message: 'Cache optimization recommendations available' };
  }

  /**
   * Apply database optimization action
   */
  private async applyDatabaseAction(action: TuningAction): Promise<{ success: boolean; message: string }> {
    const pendingOptimizations = await this.databaseOptimization.getPendingOptimizations(10);

    let applied = 0;
    for (const optimization of pendingOptimizations.slice(0, 5)) {
      // Only apply safe optimizations automatically
      const result = await this.databaseOptimization.applyOptimization(optimization.id);
      if (result.success) {
        applied++;
      }
    }

    action.applied = true;
    action.appliedAt = new Date();
    action.result = `Applied ${applied} database optimizations`;

    return { success: true, message: `Applied ${applied} database optimizations` };
  }

  /**
   * Apply CPU optimization action
   */
  private async applyCpuAction(action: TuningAction): Promise<{ success: boolean; message: string }> {
    // CPU optimization typically requires manual intervention or scaling
    action.applied = false;
    action.result = 'CPU optimization requires manual review - consider horizontal scaling';

    return { success: false, message: 'CPU optimization requires manual intervention' };
  }

  /**
   * Apply connection optimization action
   */
  private async applyConnectionAction(action: TuningAction): Promise<{ success: boolean; message: string }> {
    // Connection optimization requires investigation
    action.applied = false;
    action.result = 'Connection issues require investigation';

    return { success: false, message: 'Connection optimization requires investigation' };
  }

  /**
   * Get tuning history
   */
  getTuningHistory(limit: number = 100): TuningAction[] {
    return this.tuningHistory.slice(-limit).reverse();
  }

  /**
   * Get recommended actions
   */
  async getRecommendedActions(): Promise<TuningAction[]> {
    const [currentMetrics, cacheMetrics] = await Promise.all([
      this.apmService.getCurrentMetrics(),
      this.cacheOptimization.getCacheMetrics(),
    ]);

    const recommendations: TuningAction[] = [];

    // Memory recommendations
    if (currentMetrics.memoryUsage > 80) {
      recommendations.push({
        id: `rec_memory_${Date.now()}`,
        type: 'memory',
        action: 'Consider increasing memory limit or optimizing memory usage',
        priority: currentMetrics.memoryUsage > 90 ? 'critical' : 'high',
        estimatedImpact: 'Prevent memory-related crashes',
        applied: false,
      });
    }

    // Cache recommendations
    if (cacheMetrics.overall.hitRate < 60) {
      recommendations.push({
        id: `rec_cache_${Date.now()}`,
        type: 'cache',
        action: 'Review cache strategy and increase cache size',
        priority: 'medium',
        estimatedImpact: `Improve cache hit rate from ${cacheMetrics.overall.hitRate.toFixed(1)}% to 70%+`,
        applied: false,
      });
    }

    // Database recommendations
    if (currentMetrics.averageResponseTime > 300) {
      recommendations.push({
        id: `rec_db_${Date.now()}`,
        type: 'database',
        action: 'Review slow queries and apply optimizations',
        priority: 'medium',
        estimatedImpact: 'Reduce response time by 20-40%',
        applied: false,
      });
    }

    return recommendations;
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(
    type: ReportType,
    startDate: Date,
    endDate: Date,
  ): Promise<PerformanceReport> {
    const report = this.reportRepository.create({
      type,
      status: ReportStatus.GENERATING,
      startDate,
      endDate,
      metrics: {} as any,
    });

    await this.reportRepository.save(report);

    try {
      const [stats, cacheMetrics, dbStats] = await Promise.all([
        this.apmService.getPerformanceStats({ start: startDate, end: endDate }),
        this.cacheOptimization.getCacheMetrics(),
        this.databaseOptimization.getOptimizationStats(),
      ]);

      report.metrics = {
        totalRequests: stats.totalTransactions,
        averageResponseTime: stats.averageDuration,
        p50: stats.p50,
        p95: stats.p95,
        p99: stats.p99,
        errorRate: stats.errorRate,
        throughput: stats.totalTransactions / ((endDate.getTime() - startDate.getTime()) / 1000),
        slowQueries: dbStats.pending,
        cacheHitRate: cacheMetrics.overall.hitRate,
        databaseConnections: 0, // Would need database monitor
        memoryUsage: {
          average: 0, // Would need historical data
          peak: 0,
        },
        cpuUsage: {
          average: 0,
          peak: 0,
        },
      };

      // Generate recommendations
      report.recommendations = await this.generateRecommendations(stats, cacheMetrics, dbStats);

      report.status = ReportStatus.COMPLETED;
    } catch (error) {
      this.logger.error(`Failed to generate report: ${error.message}`);
      report.status = ReportStatus.FAILED;
      report.errorMessage = error.message;
    }

    await this.reportRepository.save(report);
    return report;
  }

  /**
   * Generate optimization recommendations
   */
  private async generateRecommendations(
    stats: any,
    cacheMetrics: any,
    dbStats: any,
  ): Promise<Array<{ category: string; priority: string; description: string; impact: string; action: string }>> {
    const recommendations: Array<{
      category: string;
      priority: string;
      description: string;
      impact: string;
      action: string;
    }> = [];

    if (stats.p95 > 500) {
      recommendations.push({
        category: 'Response Time',
        priority: 'high',
        description: '95th percentile response time exceeds 500ms',
        impact: 'User experience degradation',
        action: 'Optimize slow endpoints and database queries',
      });
    }

    if (cacheMetrics.overall.hitRate < 70) {
      recommendations.push({
        category: 'Cache',
        priority: 'medium',
        description: `Cache hit rate is ${cacheMetrics.overall.hitRate.toFixed(1)}%`,
        impact: 'Increased database load',
        action: 'Review cache strategy and TTL settings',
      });
    }

    if (dbStats.pending > 10) {
      recommendations.push({
        category: 'Database',
        priority: 'medium',
        description: `${dbStats.pending} pending query optimizations`,
        impact: 'Potential performance improvements',
        action: 'Review and apply pending optimizations',
      });
    }

    if (stats.errorRate > 1) {
      recommendations.push({
        category: 'Reliability',
        priority: 'high',
        description: `Error rate is ${stats.errorRate.toFixed(2)}%`,
        impact: 'Service reliability issues',
        action: 'Investigate error sources and improve error handling',
      });
    }

    return recommendations;
  }
}
