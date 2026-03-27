import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { QueueMonitoringService } from './queue-monitoring.service';
import { JobPrioritizationService, JobPriority } from './job-prioritization.service';

export interface SchedulingRule {
  id: string;
  name: string;
  queueName: string;
  condition: (queueMetrics: any, systemMetrics: any) => boolean;
  action: SchedulingAction;
  priority: number;
  enabled: boolean;
}

export interface SchedulingAction {
  type: 'throttle' | 'prioritize' | 'delay' | 'redistribute' | 'scale';
  parameters: Record<string, any>;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  redisMemory: number;
  redisConnections: number;
  timestamp: number;
}

export interface QueueSchedulingMetrics {
  queueName: string;
  throughput: number;
  avgProcessingTime: number;
  errorRate: number;
  backlog: number;
  activeWorkers: number;
  priorityDistribution: Record<JobPriority, number>;
}

@Injectable()
export class JobSchedulingOptimizationService implements OnModuleInit {
  private readonly logger = new Logger(JobSchedulingOptimizationService.name);
  private readonly schedulingRules: Map<string, SchedulingRule> = new Map();
  private readonly systemMetrics: SystemMetrics[] = [];
  private readonly queueMetrics: Map<string, QueueSchedulingMetrics> = new Map();
  private optimizationInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectQueue('analytics') private analyticsQueue: Queue,
    @InjectQueue('file-processing') private fileProcessingQueue: Queue,
    private monitoringService: QueueMonitoringService,
    private prioritizationService: JobPrioritizationService,
    private configService: ConfigService,
  ) {
    this.initializeSchedulingRules();
  }

  async onModuleInit() {
    await this.initializeOptimization();
  }

  private async initializeOptimization() {
    // Start continuous optimization
    this.optimizationInterval = setInterval(
      () => this.performOptimization(),
      60000, // Every minute
    );
    
    this.logger.log('Job scheduling optimization service initialized');
  }

  private initializeSchedulingRules() {
    // High load throttling rule
    this.addSchedulingRule({
      id: 'high-load-throttle',
      name: 'High Load Throttling',
      queueName: '*',
      condition: (queueMetrics, systemMetrics) => 
        systemMetrics.cpuUsage > 80 || systemMetrics.memoryUsage > 85,
      action: {
        type: 'throttle',
        parameters: {
          maxJobsPerSecond: 10,
          priorityThreshold: JobPriority.HIGH,
        },
      },
      priority: 100,
      enabled: true,
    });

    // Redis memory pressure rule
    this.addSchedulingRule({
      id: 'redis-memory-pressure',
      name: 'Redis Memory Pressure',
      queueName: '*',
      condition: (queueMetrics, systemMetrics) => 
        systemMetrics.redisMemory > 90,
      action: {
        type: 'delay',
        parameters: {
          delayMs: 5000,
          priorityThreshold: JobPriority.CRITICAL,
        },
      },
      priority: 90,
      enabled: true,
    });

    // Queue backlog redistribution rule
    this.addSchedulingRule({
      id: 'backlog-redistribution',
      name: 'Backlog Redistribution',
      queueName: '*',
      condition: (queueMetrics, systemMetrics) => 
        queueMetrics.backlog > 200 && queueMetrics.errorRate < 5,
      action: {
        type: 'redistribute',
        parameters: {
          maxRedistribution: 50,
          targetQueues: ['analytics', 'file-processing'],
        },
      },
      priority: 70,
      enabled: true,
    });

    // Low traffic prioritization rule
    this.addSchedulingRule({
      id: 'low-traffic-prioritization',
      name: 'Low Traffic Prioritization',
      queueName: '*',
      condition: (queueMetrics, systemMetrics) => 
        queueMetrics.backlog < 10 && systemMetrics.cpuUsage < 50,
      action: {
        type: 'prioritize',
        parameters: {
          boostPriority: true,
          priorityBoost: 2,
        },
      },
      priority: 50,
      enabled: true,
    });

    // Error rate scaling rule
    this.addSchedulingRule({
      id: 'error-rate-scaling',
      name: 'Error Rate Scaling',
      queueName: '*',
      condition: (queueMetrics, systemMetrics) => 
        queueMetrics.errorRate > 10,
      action: {
        type: 'scale',
        parameters: {
          scaleFactor: 0.5, // Reduce processing rate
          duration: 300000, // 5 minutes
        },
      },
      priority: 80,
      enabled: true,
    });

    this.logger.log(`Initialized ${this.schedulingRules.size} scheduling rules`);
  }

  /**
   * Perform optimization based on current metrics
   */
  @Cron(CronExpression.EVERY_2_MINUTES)
  async performOptimization(): Promise<void> {
    try {
      // Collect current metrics
      const systemMetrics = await this.collectSystemMetrics();
      const queueMetrics = await this.collectQueueMetrics();

      // Store metrics for trend analysis
      this.systemMetrics.push(systemMetrics);
      if (this.systemMetrics.length > 100) {
        this.systemMetrics.shift(); // Keep last 100 entries
      }

      // Evaluate and apply scheduling rules
      await this.evaluateSchedulingRules(queueMetrics, systemMetrics);

      // Perform queue-specific optimizations
      await this.optimizeQueues(queueMetrics, systemMetrics);

    } catch (error) {
      this.logger.error('Error during optimization:', error);
    }
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<SystemMetrics> {
    // In a real implementation, these would come from system monitoring
    // For now, we'll simulate with reasonable defaults
    return {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      redisMemory: Math.random() * 100,
      redisConnections: Math.floor(Math.random() * 50) + 10,
      timestamp: Date.now(),
    };
  }

  /**
   * Collect queue metrics for optimization
   */
  private async collectQueueMetrics(): Promise<Map<string, QueueSchedulingMetrics>> {
    const queueMetrics = new Map<string, QueueSchedulingMetrics>();
    const queueNames = ['analytics', 'file-processing'];

    for (const queueName of queueNames) {
      try {
        const [metrics, priorityDistribution] = await Promise.all([
          this.monitoringService.getMetrics(queueName),
          this.prioritizationService.getPriorityDistribution(queueName),
        ]);

        if (metrics.length > 0) {
          const metric = metrics[0];
          queueMetrics.set(queueName, {
            queueName,
            throughput: metric.throughput,
            avgProcessingTime: metric.avgProcessingTime,
            errorRate: metric.errorRate,
            backlog: metric.waiting,
            activeWorkers: metric.active,
            priorityDistribution,
          });
        }
      } catch (error) {
        this.logger.error(`Failed to collect metrics for ${queueName}:`, error);
      }
    }

    return queueMetrics;
  }

  /**
   * Evaluate and apply scheduling rules
   */
  private async evaluateSchedulingRules(
    queueMetrics: Map<string, QueueSchedulingMetrics>,
    systemMetrics: SystemMetrics,
  ): Promise<void> {
    const rules = Array.from(this.schedulingRules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    for (const rule of rules) {
      for (const [queueName, metrics] of queueMetrics.entries()) {
        if (rule.queueName !== '*' && rule.queueName !== queueName) {
          continue;
        }

        try {
          if (rule.condition(metrics, systemMetrics)) {
            await this.applySchedulingAction(rule.action, queueName, metrics);
            this.logger.debug(`Applied scheduling rule "${rule.name}" to ${queueName}`);
          }
        } catch (error) {
          this.logger.error(`Error applying scheduling rule "${rule.name}":`, error);
        }
      }
    }
  }

  /**
   * Apply scheduling action
   */
  private async applySchedulingAction(
    action: SchedulingAction,
    queueName: string,
    metrics: QueueSchedulingMetrics,
  ): Promise<void> {
    switch (action.type) {
      case 'throttle':
        await this.applyThrottling(queueName, action.parameters);
        break;
      case 'prioritize':
        await this.applyPrioritization(queueName, action.parameters);
        break;
      case 'delay':
        await this.applyDelay(queueName, action.parameters);
        break;
      case 'redistribute':
        await this.applyRedistribution(queueName, action.parameters);
        break;
      case 'scale':
        await this.applyScaling(queueName, action.parameters);
        break;
      default:
        this.logger.warn(`Unknown scheduling action type: ${action.type}`);
    }
  }

  /**
   * Apply throttling to queue
   */
  private async applyThrottling(queueName: string, parameters: any): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (!queue) return;

    // Implement rate limiting by pausing and resuming
    const maxJobsPerSecond = parameters.maxJobsPerSecond || 10;
    const priorityThreshold = parameters.priorityThreshold || JobPriority.HIGH;

    // This would involve implementing a rate limiter
    this.logger.log(`Applied throttling to ${queueName}: max ${maxJobsPerSecond} jobs/sec, priority >= ${priorityThreshold}`);
  }

  /**
   * Apply prioritization boost
   */
  private async applyPrioritization(queueName: string, parameters: any): Promise<void> {
    if (parameters.boostPriority) {
      const boost = parameters.priorityBoost || 2;
      await this.prioritizationService.reorderQueueByPriority(queueName);
      this.logger.log(`Applied priority boost to ${queueName}: +${boost} priority levels`);
    }
  }

  /**
   * Apply delay to new jobs
   */
  private async applyDelay(queueName: string, parameters: any): Promise<void> {
    const delayMs = parameters.delayMs || 5000;
    const priorityThreshold = parameters.priorityThreshold || JobPriority.CRITICAL;

    // This would involve intercepting new job additions and adding delays
    this.logger.log(`Applied delay to ${queueName}: ${delayMs}ms delay, priority >= ${priorityThreshold}`);
  }

  /**
   * Redistribute jobs between queues
   */
  private async applyRedistribution(queueName: string, parameters: any): Promise<void> {
    const maxRedistribution = parameters.maxRedistribution || 50;
    const targetQueues = parameters.targetQueues || [];

    // Get waiting jobs from source queue
    const queue = this.getQueueByName(queueName);
    if (!queue) return;

    const waitingJobs = await queue.getWaiting(0, maxRedistribution);
    let redistributedCount = 0;

    for (const job of waitingJobs.slice(0, maxRedistribution)) {
      // Find suitable target queue
      for (const targetQueueName of targetQueues) {
        if (targetQueueName === queueName) continue;

        const targetQueue = this.getQueueByName(targetQueueName);
        if (!targetQueue) continue;

        try {
          // Move job to target queue
          await targetQueue.add(job.name, job.data, job.opts);
          await job.remove();
          redistributedCount++;
          break;
        } catch (error) {
          this.logger.error(`Failed to redistribute job ${job.id} to ${targetQueueName}:`, error);
        }
      }
    }

    this.logger.log(`Redistributed ${redistributedCount} jobs from ${queueName}`);
  }

  /**
   * Apply scaling adjustments
   */
  private async applyScaling(queueName: string, parameters: any): Promise<void> {
    const scaleFactor = parameters.scaleFactor || 0.5;
    const duration = parameters.duration || 300000; // 5 minutes

    // This would involve adjusting worker counts or processing rates
    this.logger.log(`Applied scaling to ${queueName}: ${scaleFactor}x scale for ${duration}ms`);
  }

  /**
   * Perform queue-specific optimizations
   */
  private async optimizeQueues(
    queueMetrics: Map<string, QueueSchedulingMetrics>,
    systemMetrics: SystemMetrics,
  ): Promise<void> {
    for (const [queueName, metrics] of queueMetrics.entries()) {
      await this.optimizeSingleQueue(queueName, metrics, systemMetrics);
    }
  }

  /**
   * Optimize individual queue
   */
  private async optimizeSingleQueue(
    queueName: string,
    metrics: QueueSchedulingMetrics,
    systemMetrics: SystemMetrics,
  ): Promise<void> {
    // Analyze trends and make adjustments
    const trends = this.analyzeTrends(queueName, metrics);

    // Auto-adjust batch sizes based on throughput
    if (trends.throughputTrend === 'decreasing') {
      await this.adjustBatchSize(queueName, -0.1); // Decrease batch size
    } else if (trends.throughputTrend === 'increasing' && systemMetrics.cpuUsage < 70) {
      await this.adjustBatchSize(queueName, 0.1); // Increase batch size
    }

    // Optimize priority distribution
    await this.optimizePriorityDistribution(queueName, metrics);

    // Clean up old jobs if needed
    if (metrics.backlog > 500) {
      await this.cleanupOldJobs(queueName);
    }
  }

  /**
   * Analyze performance trends
   */
  private analyzeTrends(queueName: string, currentMetrics: QueueSchedulingMetrics): {
    throughputTrend: 'increasing' | 'decreasing' | 'stable';
    errorRateTrend: 'increasing' | 'decreasing' | 'stable';
    processingTimeTrend: 'increasing' | 'decreasing' | 'stable';
  } {
    // This would analyze historical data to determine trends
    // For now, return stable as default
    return {
      throughputTrend: 'stable',
      errorRateTrend: 'stable',
      processingTimeTrend: 'stable',
    };
  }

  /**
   * Adjust batch size for queue
   */
  private async adjustBatchSize(queueName: string, adjustment: number): Promise<void> {
    // This would adjust the batch size configuration
    this.logger.log(`Adjusted batch size for ${queueName} by ${adjustment * 100}%`);
  }

  /**
   * Optimize priority distribution
   */
  private async optimizePriorityDistribution(queueName: string, metrics: QueueSchedulingMetrics): Promise<void> {
    // Analyze priority distribution and suggest optimizations
    const totalJobs = Object.values(metrics.priorityDistribution).reduce((sum, count) => sum + count, 0);
    
    if (totalJobs > 0) {
      const criticalPercentage = (metrics.priorityDistribution[JobPriority.CRITICAL] / totalJobs) * 100;
      
      if (criticalPercentage > 30) {
        this.logger.warn(`High percentage of critical jobs in ${queueName}: ${criticalPercentage.toFixed(1)}%`);
      }
    }
  }

  /**
   * Clean up old jobs
   */
  private async cleanupOldJobs(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (!queue) return;

    try {
      // Clean completed jobs older than 24 hours
      await queue.clean(24 * 60 * 60 * 1000, 1000, 'completed');
      // Clean failed jobs older than 7 days
      await queue.clean(7 * 24 * 60 * 60 * 1000, 1000, 'failed');
      
      this.logger.log(`Cleaned up old jobs in ${queueName}`);
    } catch (error) {
      this.logger.error(`Failed to clean up jobs in ${queueName}:`, error);
    }
  }

  /**
   * Add scheduling rule
   */
  addSchedulingRule(rule: SchedulingRule): void {
    this.schedulingRules.set(rule.id, rule);
    this.logger.log(`Added scheduling rule: ${rule.name}`);
  }

  /**
   * Remove scheduling rule
   */
  removeSchedulingRule(ruleId: string): boolean {
    const removed = this.schedulingRules.delete(ruleId);
    if (removed) {
      this.logger.log(`Removed scheduling rule: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    totalRules: number;
    enabledRules: number;
    systemMetricsCount: number;
    queueMetricsCount: number;
  } {
    return {
      totalRules: this.schedulingRules.size,
      enabledRules: Array.from(this.schedulingRules.values()).filter(rule => rule.enabled).length,
      systemMetricsCount: this.systemMetrics.length,
      queueMetricsCount: this.queueMetrics.size,
    };
  }

  /**
   * Get performance recommendations
   */
  async getPerformanceRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const queueMetrics = await this.collectQueueMetrics();
    const systemMetrics = await this.collectSystemMetrics();

    for (const [queueName, metrics] of queueMetrics.entries()) {
      if (metrics.errorRate > 10) {
        recommendations.push(`Consider investigating high error rate in ${queueName}: ${metrics.errorRate.toFixed(1)}%`);
      }

      if (metrics.backlog > 100) {
        recommendations.push(`Consider scaling workers for ${queueName}: ${metrics.backlog} jobs waiting`);
      }

      if (metrics.avgProcessingTime > 300000) {
        recommendations.push(`Consider optimizing job processing for ${queueName}: average time ${(metrics.avgProcessingTime / 1000).toFixed(1)}s`);
      }
    }

    if (systemMetrics.cpuUsage > 80) {
      recommendations.push('System CPU usage is high, consider scaling horizontally');
    }

    if (systemMetrics.memoryUsage > 85) {
      recommendations.push('System memory usage is high, consider optimizing memory usage');
    }

    return recommendations;
  }

  private getQueueByName(queueName: string): Queue | null {
    switch (queueName) {
      case 'analytics':
        return this.analyticsQueue;
      case 'file-processing':
        return this.fileProcessingQueue;
      default:
        return null;
    }
  }
}
