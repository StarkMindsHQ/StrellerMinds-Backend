import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';

export interface MigrationMetrics {
  totalMigrations: number;
  successfulMigrations: number;
  failedMigrations: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  lastMigrationTime?: Date;
  migrationSuccessRate: number;
  rollbackCount: number;
  validationFailures: number;
}

export interface MigrationAlert {
  id: string;
  type: 'warning' | 'error' | 'critical' | 'info';
  message: string;
  migrationName?: string;
  timestamp: Date;
  details?: any;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface MigrationPerformance {
  migrationName: string;
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  databaseConnections: number;
  lockWaitTime: number;
  rowsAffected: number;
  timestamp: Date;
}

export interface MigrationHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: 'healthy' | 'degraded' | 'unhealthy';
    migrations: 'healthy' | 'degraded' | 'unhealthy';
    validation: 'healthy' | 'degraded' | 'unhealthy';
    rollback: 'healthy' | 'degraded' | 'unhealthy';
  };
  lastCheck: Date;
  issues: string[];
  recommendations: string[];
}

@Injectable()
export class MigrationMonitoringService implements OnModuleInit {
  private readonly logger = new Logger(MigrationMonitoringService.name);
  private readonly metricsDir = path.join(process.cwd(), 'migration-metrics');
  private readonly alertsDir = path.join(process.cwd(), 'migration-alerts');
  
  private metrics: MigrationMetrics = {
    totalMigrations: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    averageExecutionTime: 0,
    totalExecutionTime: 0,
    migrationSuccessRate: 0,
    rollbackCount: 0,
    validationFailures: 0,
  };

  private alerts: MigrationAlert[] = [];
  private performanceData: MigrationPerformance[] = [];
  private healthStatus: MigrationHealth = {
    status: 'healthy',
    checks: {
      database: 'healthy',
      migrations: 'healthy',
      validation: 'healthy',
      rollback: 'healthy',
    },
    lastCheck: new Date(),
    issues: [],
    recommendations: [],
  };

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.ensureDirectories();
    this.loadHistoricalData();
  }

  async onModuleInit() {
    // Start monitoring
    this.logger.log('🚀 Migration monitoring service initialized');
    
    // Emit initial health check
    this.eventEmitter.emit('migration.monitoring.initialized', {
      timestamp: new Date(),
      metrics: this.metrics,
    });
  }

  /**
   * Event handlers for migration monitoring
   */

  @OnEvent('migration.started')
  handleMigrationStarted(payload: { migrationName: string; timestamp: Date }) {
    this.logger.log(`📊 Migration started: ${payload.migrationName}`);
    this.metrics.totalMigrations++;
    this.updateHealthStatus();
    
    // Emit monitoring event
    this.eventEmitter.emit('migration.monitoring.started', {
      migrationName: payload.migrationName,
      timestamp: payload.timestamp,
      metrics: this.metrics,
    });
  }

  @OnEvent('migration.completed')
  handleMigrationCompleted(payload: { migrationName: string; metadata: any }) {
    this.logger.log(`✅ Migration completed: ${payload.migrationName}`);
    this.metrics.successfulMigrations++;
    this.metrics.lastMigrationTime = new Date();
    
    // Update execution time metrics
    const executionTime = payload.metadata.executionTime || 0;
    this.updateExecutionTimeMetrics(executionTime);
    
    // Update health status
    this.updateHealthStatus();
    
    // Emit monitoring event
    this.eventEmitter.emit('migration.monitoring.completed', {
      migrationName: payload.migrationName,
      metadata: payload.metadata,
      metrics: this.metrics,
    });
  }

  @OnEvent('migration.failed')
  handleMigrationFailed(payload: { migrationName: string; error: string; metadata: any }) {
    this.logger.error(`❌ Migration failed: ${payload.migrationName}`);
    this.metrics.failedMigrations++;
    
    // Create alert
    this.createAlert('error', `Migration ${payload.migrationName} failed: ${payload.error}`, payload.migrationName);
    
    // Update health status
    this.updateHealthStatus();
    
    // Emit monitoring event
    this.eventEmitter.emit('migration.monitoring.failed', {
      migrationName: payload.migrationName,
      error: payload.error,
      metadata: payload.metadata,
      metrics: this.metrics,
    });
  }

  @OnEvent('migration.rollback_started')
  handleRollbackStarted(payload: { migrationName: string; timestamp: Date }) {
    this.logger.log(`🔄 Rollback started: ${payload.migrationName}`);
    
    // Emit monitoring event
    this.eventEmitter.emit('migration.monitoring.rollback_started', {
      migrationName: payload.migrationName,
      timestamp: payload.timestamp,
    });
  }

  @OnEvent('migration.rollback_completed')
  handleRollbackCompleted(payload: { migrationName: string }) {
    this.logger.log(`✅ Rollback completed: ${payload.migrationName}`);
    this.metrics.rollbackCount++;
    
    // Update health status
    this.updateHealthStatus();
    
    // Emit monitoring event
    this.eventEmitter.emit('migration.monitoring.rollback_completed', {
      migrationName: payload.migrationName,
      metrics: this.metrics,
    });
  }

  @OnEvent('migration.rollback_failed')
  handleRollbackFailed(payload: { migrationName: string; error: string }) {
    this.logger.error(`❌ Rollback failed: ${payload.migrationName}`);
    
    // Create critical alert
    this.createAlert('critical', `Rollback failed for ${payload.migrationName}: ${payload.error}`, payload.migrationName);
    
    // Update health status
    this.updateHealthStatus();
    
    // Emit monitoring event
    this.eventEmitter.emit('migration.monitoring.rollback_failed', {
      migrationName: payload.migrationName,
      error: payload.error,
    });
  }

  @OnEvent('migration.validation_failed')
  handleValidationFailed(payload: { migrationName: string; validationResult: any }) {
    this.logger.warn(`⚠️ Validation failed: ${payload.migrationName}`);
    this.metrics.validationFailures++;
    
    // Create warning alert
    this.createAlert('warning', `Validation failed for ${payload.migrationName}`, payload.migrationName, payload.validationResult);
    
    // Update health status
    this.updateHealthStatus();
    
    // Emit monitoring event
    this.eventEmitter.emit('migration.monitoring.validation_failed', {
      migrationName: payload.migrationName,
      validationResult: payload.validationResult,
    });
  }

  @OnEvent('migration.progress')
  handleMigrationProgress(payload: { migrationName: string; progress: number; message: string }) {
    // Log progress for long-running migrations
    if (payload.progress % 25 === 0) {
      this.logger.log(`📈 Migration progress: ${payload.migrationName} - ${payload.progress}%`);
    }
    
    // Emit monitoring event
    this.eventEmitter.emit('migration.monitoring.progress', {
      migrationName: payload.migrationName,
      progress: payload.progress,
      message: payload.message,
      timestamp: new Date(),
    });
  }

  /**
   * Get current migration metrics
   */
  getMetrics(): MigrationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get migration alerts
   */
  getAlerts(includeAcknowledged: boolean = false): MigrationAlert[] {
    if (includeAcknowledged) {
      return [...this.alerts];
    }
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Get migration performance data
   */
  getPerformanceData(limit: number = 100): MigrationPerformance[] {
    return this.performanceData
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get migration health status
   */
  getHealthStatus(): MigrationHealth {
    return { ...this.healthStatus };
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();
      
      this.saveAlerts();
      this.logger.log(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);
      return true;
    }
    return false;
  }

  /**
   * Create a new alert
   */
  createAlert(
    type: MigrationAlert['type'],
    message: string,
    migrationName?: string,
    details?: any
  ): void {
    const alert: MigrationAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      migrationName,
      timestamp: new Date(),
      details,
      acknowledged: false,
    };

    this.alerts.push(alert);
    this.saveAlerts();

    // Emit alert event
    this.eventEmitter.emit('migration.monitoring.alert_created', alert);

    this.logger.log(`Alert created: ${type.toUpperCase()} - ${message}`);
  }

  /**
   * Record performance data for a migration
   */
  recordPerformanceData(performance: Omit<MigrationPerformance, 'timestamp'>): void {
    const performanceRecord: MigrationPerformance = {
      ...performance,
      timestamp: new Date(),
    };

    this.performanceData.push(performanceRecord);
    
    // Keep only last 1000 records
    if (this.performanceData.length > 1000) {
      this.performanceData = this.performanceData.slice(-1000);
    }

    this.savePerformanceData();
  }

  /**
   * Generate migration report
   */
  generateReport(startDate: Date, endDate: Date): {
    period: { start: Date; end: Date };
    metrics: MigrationMetrics;
    alerts: MigrationAlert[];
    performance: MigrationPerformance[];
    health: MigrationHealth;
    recommendations: string[];
  } {
    const periodAlerts = this.alerts.filter(
      alert => alert.timestamp >= startDate && alert.timestamp <= endDate
    );

    const periodPerformance = this.performanceData.filter(
      perf => perf.timestamp >= startDate && perf.timestamp <= endDate
    );

    const recommendations = this.generateRecommendations();

    return {
      period: { start: startDate, end: endDate },
      metrics: this.metrics,
      alerts: periodAlerts,
      performance: periodPerformance,
      health: this.healthStatus,
      recommendations,
    };
  }

  /**
   * Export monitoring data
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      metrics: this.metrics,
      alerts: this.alerts,
      performance: this.performanceData,
      health: this.healthStatus,
      exportTimestamp: new Date(),
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Clear old monitoring data
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  cleanupOldData(): void {
    this.logger.log('🧹 Cleaning up old monitoring data');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Clean up old performance data
    this.performanceData = this.performanceData.filter(
      perf => perf.timestamp >= thirtyDaysAgo
    );

    // Clean up old alerts (keep acknowledged ones for 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    this.alerts = this.alerts.filter(
      alert => !alert.acknowledged || alert.acknowledgedAt! >= sevenDaysAgo
    );

    this.saveData();
    this.logger.log('✅ Old monitoring data cleaned up');
  }

  /**
   * Health check cron job
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  performHealthCheck(): void {
    this.logger.log('🏥 Performing migration health check');
    
    this.updateHealthStatus();
    this.saveData();
    
    // Emit health check event
    this.eventEmitter.emit('migration.monitoring.health_check', {
      timestamp: new Date(),
      health: this.healthStatus,
    });
  }

  // Private helper methods

  private updateExecutionTimeMetrics(executionTime: number): void {
    this.metrics.totalExecutionTime += executionTime;
    this.metrics.averageExecutionTime = this.metrics.totalExecutionTime / this.metrics.successfulMigrations;
  }

  private updateHealthStatus(): void {
    const totalMigrations = this.metrics.totalMigrations;
    const successRate = totalMigrations > 0 ? this.metrics.successfulMigrations / totalMigrations : 1;
    
    // Update migration health
    if (successRate >= 0.95) {
      this.healthStatus.checks.migrations = 'healthy';
    } else if (successRate >= 0.8) {
      this.healthStatus.checks.migrations = 'degraded';
    } else {
      this.healthStatus.checks.migrations = 'unhealthy';
    }

    // Update validation health
    if (this.metrics.validationFailures === 0) {
      this.healthStatus.checks.validation = 'healthy';
    } else if (this.metrics.validationFailures <= 5) {
      this.healthStatus.checks.validation = 'degraded';
    } else {
      this.healthStatus.checks.validation = 'unhealthy';
    }

    // Update rollback health
    if (this.metrics.rollbackCount === 0) {
      this.healthStatus.checks.rollback = 'healthy';
    } else if (this.metrics.rollbackCount <= 3) {
      this.healthStatus.checks.rollback = 'degraded';
    } else {
      this.healthStatus.checks.rollback = 'unhealthy';
    }

    // Determine overall health status
    const checkStatuses = Object.values(this.healthStatus.checks);
    if (checkStatuses.every(status => status === 'healthy')) {
      this.healthStatus.status = 'healthy';
    } else if (checkStatuses.some(status => status === 'unhealthy')) {
      this.healthStatus.status = 'unhealthy';
    } else {
      this.healthStatus.status = 'degraded';
    }

    this.healthStatus.lastCheck = new Date();
    this.healthStatus.issues = this.identifyIssues();
    this.healthStatus.recommendations = this.generateRecommendations();
  }

  private identifyIssues(): string[] {
    const issues: string[] = [];

    if (this.metrics.failedMigrations > 0) {
      issues.push(`${this.metrics.failedMigrations} migrations have failed`);
    }

    if (this.metrics.validationFailures > 0) {
      issues.push(`${this.metrics.validationFailures} validation failures detected`);
    }

    if (this.metrics.rollbackCount > 0) {
      issues.push(`${this.metrics.rollbackCount} rollbacks have occurred`);
    }

    const unacknowledgedAlerts = this.alerts.filter(alert => !alert.acknowledged);
    if (unacknowledgedAlerts.length > 0) {
      issues.push(`${unacknowledgedAlerts.length} unacknowledged alerts`);
    }

    return issues;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.failedMigrations > 0) {
      recommendations.push('Investigate failed migrations and fix underlying issues');
    }

    if (this.metrics.validationFailures > 0) {
      recommendations.push('Review validation rules and fix data integrity issues');
    }

    if (this.metrics.rollbackCount > 0) {
      recommendations.push('Analyze rollback patterns to prevent future failures');
    }

    if (this.metrics.averageExecutionTime > 30000) { // 30 seconds
      recommendations.push('Optimize migration performance - consider breaking large migrations');
    }

    const criticalAlerts = this.alerts.filter(alert => alert.type === 'critical' && !alert.acknowledged);
    if (criticalAlerts.length > 0) {
      recommendations.push('Address critical alerts immediately');
    }

    return recommendations;
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - in practice, you'd use a proper CSV library
    return 'timestamp,type,message\n' +
      Object.entries(data).map(([key, value]) => 
        `${new Date().toISOString()},${key},${JSON.stringify(value)}`
      ).join('\n');
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.metricsDir)) {
      fs.mkdirSync(this.metricsDir, { recursive: true });
    }
    if (!fs.existsSync(this.alertsDir)) {
      fs.mkdirSync(this.alertsDir, { recursive: true });
    }
  }

  private loadHistoricalData(): void {
    try {
      // Load metrics
      const metricsPath = path.join(this.metricsDir, 'metrics.json');
      if (fs.existsSync(metricsPath)) {
        const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
        this.metrics = { ...this.metrics, ...data };
      }

      // Load alerts
      const alertsPath = path.join(this.alertsDir, 'alerts.json');
      if (fs.existsSync(alertsPath)) {
        const data = JSON.parse(fs.readFileSync(alertsPath, 'utf8'));
        this.alerts = data.map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp),
          acknowledgedAt: alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : undefined,
        }));
      }

      // Load performance data
      const performancePath = path.join(this.metricsDir, 'performance.json');
      if (fs.existsSync(performancePath)) {
        const data = JSON.parse(fs.readFileSync(performancePath, 'utf8'));
        this.performanceData = data.map((perf: any) => ({
          ...perf,
          timestamp: new Date(perf.timestamp),
        }));
      }

    } catch (error) {
      this.logger.error('Failed to load historical monitoring data:', error.message);
    }
  }

  private saveData(): void {
    this.saveMetrics();
    this.saveAlerts();
    this.savePerformanceData();
  }

  private saveMetrics(): void {
    try {
      const metricsPath = path.join(this.metricsDir, 'metrics.json');
      fs.writeFileSync(metricsPath, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      this.logger.error('Failed to save metrics:', error.message);
    }
  }

  private saveAlerts(): void {
    try {
      const alertsPath = path.join(this.alertsDir, 'alerts.json');
      fs.writeFileSync(alertsPath, JSON.stringify(this.alerts, null, 2));
    } catch (error) {
      this.logger.error('Failed to save alerts:', error.message);
    }
  }

  private savePerformanceData(): void {
    try {
      const performancePath = path.join(this.metricsDir, 'performance.json');
      fs.writeFileSync(performancePath, JSON.stringify(this.performanceData, null, 2));
    } catch (error) {
      this.logger.error('Failed to save performance data:', error.message);
    }
  }
}
