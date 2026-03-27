import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseConfig } from '../config/database.config';
import { DatabaseMonitorService } from './database.monitor.service';

export interface PoolSizingMetrics {
  currentLoad: number;
  averageWaitTime: number;
  connectionUtilization: number;
  queriesPerSecond: number;
  recommendedMin: number;
  recommendedMax: number;
  lastAdjustment: Date;
  adjustmentReason: string;
}

/**
 * Service for dynamic database connection pool sizing
 * Automatically adjusts pool size based on load patterns and performance metrics
 */
@Injectable()
export class DynamicPoolSizingService {
  private readonly logger = new Logger(DynamicPoolSizingService.name);
  private sizingHistory: PoolSizingMetrics[] = [];
  private readonly historyLimit = 50;
  private lastSizingCheck = new Date();
  private adjustmentCooldown = 5 * 60 * 1000; // 5 minutes between adjustments

  constructor(
    private databaseConfig: DatabaseConfig,
    private monitorService: DatabaseMonitorService,
  ) {}

  /**
   * Analyze current load and recommend pool size adjustments
   */
  async analyzePoolSizing(): Promise<PoolSizingMetrics> {
    try {
      const metrics = await this.monitorService.getMetrics();
      
      // Calculate load factors
      const currentLoad = this.calculateCurrentLoad(metrics);
      const averageWaitTime = metrics.connectionPool.averageWaitTime;
      const connectionUtilization = metrics.connectionPool.utilization;
      const queriesPerSecond = metrics.performance.queriesPerSecond;

      // Generate recommendations
      const { recommendedMin, recommendedMax, reason } = this.generateRecommendations(
        metrics,
        currentLoad,
        averageWaitTime,
        connectionUtilization,
        queriesPerSecond,
      );

      const sizingMetrics: PoolSizingMetrics = {
        currentLoad,
        averageWaitTime,
        connectionUtilization,
        queriesPerSecond,
        recommendedMin,
        recommendedMax,
        lastAdjustment: new Date(),
        adjustmentReason: reason,
      };

      // Store in history
      this.sizingHistory.push(sizingMetrics);
      if (this.sizingHistory.length > this.historyLimit) {
        this.sizingHistory.shift();
      }

      return sizingMetrics;
    } catch (error) {
      this.logger.error(`Failed to analyze pool sizing: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate current system load (0-100 scale)
   */
  private calculateCurrentLoad(metrics: any): number {
    const poolUtilization = metrics.connectionPool.utilization;
    const waitTimeScore = Math.min(100, (metrics.connectionPool.averageWaitTime / 1000) * 100);
    const qpsScore = Math.min(100, (metrics.performance.queriesPerSecond / 100) * 100);
    
    // Weighted average: pool utilization is most important
    return Math.round((poolUtilization * 0.5 + waitTimeScore * 0.3 + qpsScore * 0.2));
  }

  /**
   * Generate pool size recommendations based on metrics
   */
  private generateRecommendations(
    metrics: any,
    currentLoad: number,
    averageWaitTime: number,
    connectionUtilization: number,
    queriesPerSecond: number,
  ): { recommendedMin: number; recommendedMax: number; reason: string } {
    const currentMax = metrics.connectionPool.maxConnections;
    const currentMin = metrics.connectionPool.minConnections;
    
    let recommendedMax = currentMax;
    let recommendedMin = currentMin;
    let reason = 'No adjustment needed';

    // Scale up conditions
    if (connectionUtilization > 85 || averageWaitTime > 500 || currentLoad > 80) {
      recommendedMax = Math.min(currentMax * 2, 50); // Cap at 50
      recommendedMin = Math.max(currentMin, Math.floor(recommendedMax * 0.3));
      reason = 'High utilization and wait times detected';
    }
    // Scale down conditions
    else if (connectionUtilization < 30 && averageWaitTime < 50 && currentLoad < 40) {
      recommendedMax = Math.max(currentMin * 2, 5); // Minimum 5 connections
      recommendedMin = Math.max(1, Math.floor(recommendedMax * 0.2));
      reason = 'Low utilization - optimizing for efficiency';
    }
    // Fine-tuning for moderate load
    else if (connectionUtilization > 70 && connectionUtilization < 85) {
      recommendedMax = Math.min(currentMax + 2, 30);
      recommendedMin = Math.max(currentMin, Math.floor(recommendedMax * 0.25));
      reason = 'Moderate load - slight increase recommended';
    }

    return { recommendedMin, recommendedMax, reason };
  }

  /**
   * Apply pool size adjustments (if safe to do so)
   */
  async applyPoolAdjustment(): Promise<{ applied: boolean; reason: string; newSize: { min: number; max: number } }> {
    try {
      // Check cooldown period
      const timeSinceLastAdjustment = Date.now() - this.lastSizingCheck.getTime();
      if (timeSinceLastAdjustment < this.adjustmentCooldown) {
        return {
          applied: false,
          reason: `Adjustment cooldown active (${Math.round((this.adjustmentCooldown - timeSinceLastAdjustment) / 1000)}s remaining)`,
          newSize: { min: 0, max: 0 },
        };
      }

      const sizingMetrics = await this.analyzePoolSizing();
      const metrics = await this.monitorService.getMetrics();
      
      const currentMax = metrics.connectionPool.maxConnections;
      const currentMin = metrics.connectionPool.minConnections;

      // Check if adjustment is needed
      if (sizingMetrics.recommendedMax === currentMax && sizingMetrics.recommendedMin === currentMin) {
        return {
          applied: false,
          reason: 'Pool size already optimal',
          newSize: { min: currentMin, max: currentMax },
        };
      }

      // Safety checks
      if (sizingMetrics.recommendedMax < sizingMetrics.recommendedMin) {
        return {
          applied: false,
          reason: 'Invalid pool size configuration',
          newSize: { min: 0, max: 0 },
        };
      }

      // Log the adjustment
      this.logger.log(`Pool adjustment: ${currentMin}/${currentMax} -> ${sizingMetrics.recommendedMin}/${sizingMetrics.recommendedMax} (${sizingMetrics.adjustmentReason})`);

      // In a real implementation, you would dynamically update the pool configuration
      // For now, we'll just log the recommendation
      this.lastSizingCheck = new Date();

      return {
        applied: true,
        reason: sizingMetrics.adjustmentReason,
        newSize: {
          min: sizingMetrics.recommendedMin,
          max: sizingMetrics.recommendedMax,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to apply pool adjustment: ${error.message}`);
      return {
        applied: false,
        reason: `Error: ${error.message}`,
        newSize: { min: 0, max: 0 },
      };
    }
  }

  /**
   * Get pool sizing history
   */
  getSizingHistory(limit: number = 20): PoolSizingMetrics[] {
    return this.sizingHistory.slice(-limit).reverse();
  }

  /**
   * Get pool sizing statistics
   */
  getSizingStatistics(): {
    totalAdjustments: number;
    averageLoad: number;
    averageUtilization: number;
    lastAdjustment: Date | null;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (this.sizingHistory.length === 0) {
      return {
        totalAdjustments: 0,
        averageLoad: 0,
        averageUtilization: 0,
        lastAdjustment: null,
        trend: 'stable',
      };
    }

    const recentHistory = this.sizingHistory.slice(-10); // Last 10 measurements
    const averageLoad = recentHistory.reduce((sum, m) => sum + m.currentLoad, 0) / recentHistory.length;
    const averageUtilization = recentHistory.reduce((sum, m) => sum + m.connectionUtilization, 0) / recentHistory.length;

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentHistory.length >= 3) {
      const recent = recentHistory.slice(-3);
      const firstLoad = recent[0].currentLoad;
      const lastLoad = recent[2].currentLoad;
      
      if (lastLoad > firstLoad + 10) trend = 'increasing';
      else if (lastLoad < firstLoad - 10) trend = 'decreasing';
    }

    return {
      totalAdjustments: this.sizingHistory.length,
      averageLoad: Math.round(averageLoad),
      averageUtilization: Math.round(averageUtilization),
      lastAdjustment: this.sizingHistory[this.sizingHistory.length - 1]?.lastAdjustment || null,
      trend,
    };
  }

  /**
   * Scheduled pool sizing analysis
   */
  @Cron(CronExpression.EVERY_2_MINUTES)
  async scheduledPoolAnalysis(): Promise<void> {
    try {
      const sizingMetrics = await this.analyzePoolSizing();
      
      // Log if significant adjustments are recommended
      const metrics = await this.monitorService.getMetrics();
      const currentMax = metrics.connectionPool.maxConnections;
      const currentMin = metrics.connectionPool.minConnections;

      if (Math.abs(sizingMetrics.recommendedMax - currentMax) > 2 || 
          Math.abs(sizingMetrics.recommendedMin - currentMin) > 1) {
        this.logger.warn(`Pool adjustment recommended: ${currentMin}/${currentMax} -> ${sizingMetrics.recommendedMin}/${sizingMetrics.recommendedMax} (${sizingMetrics.adjustmentReason})`);
      }
    } catch (error) {
      this.logger.error(`Scheduled pool analysis failed: ${error.message}`);
    }
  }

  /**
   * Manual pool size override (for emergency situations)
   */
  async overridePoolSize(min: number, max: number, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      if (min < 1 || max < min || max > 100) {
        return {
          success: false,
          message: 'Invalid pool size: min must be >= 1, max must be >= min and <= 100',
        };
      }

      this.logger.warn(`Manual pool override: ${min}/${max} - Reason: ${reason}`);

      // In a real implementation, you would update the pool configuration here
      return {
        success: true,
        message: `Pool size override scheduled: min=${min}, max=${max}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Override failed: ${error.message}`,
      };
    }
  }
}
