import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { BackupRecord, BackupStatus } from './entities/backup-record.entity';
import { BackupSchedule } from './entities/backup-schedule.entity';
import { BackupMetricsService } from './backup-metrics.service';
import { BackupNotificationService } from './backup-notification.service';
import { BackupAlertPayload, BackupAlertSeverity } from './interfaces';

export interface BackupHealthStatus {
  overallStatus: 'healthy' | 'warning' | 'critical';
  lastBackupStatus: BackupStatus;
  backupLag: number; // in hours
  storageUsage: number; // percentage
  successRate: number; // percentage
  alerts: BackupAlert[];
}

export interface BackupAlert {
  id: string;
  type: 'backup_failure' | 'backup_lag' | 'storage_full' | 'recovery_test_failed' | 'performance_degradation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface BackupPerformanceMetrics {
  backupDuration: number; // in seconds
  compressionRatio: number;
  transferSpeed: number; // MB/s
  cpuUsage: number; // percentage
  memoryUsage: number; // MB
  timestamp: Date;
}

@Injectable()
export class BackupMonitoringService {
  private readonly logger = new Logger(BackupMonitoringService.name);
  private readonly alerts: BackupAlert[] = [];
  private readonly performanceHistory: BackupPerformanceMetrics[] = [];

  constructor(
    @InjectRepository(BackupRecord)
    private readonly backupRecordRepository: Repository<BackupRecord>,
    @InjectRepository(BackupSchedule)
    private readonly backupScheduleRepository: Repository<BackupSchedule>,
    private readonly configService: ConfigService,
    private readonly metricsService: BackupMetricsService,
    private readonly notificationService: BackupNotificationService,
  ) {}

  /**
   * Check overall backup system health
   */
  async checkBackupHealth(): Promise<BackupHealthStatus> {
    this.logger.log('Performing backup health check');

    try {
      const [lastBackup, schedule] = await Promise.all([
        this.getLastSuccessfulBackup(),
        this.getActiveSchedule(),
      ]);

      const backupLag = this.calculateBackupLag(lastBackup);
      const successRate = await this.calculateSuccessRate();
      const storageUsage = await this.getStorageUsage();
      
      const alerts = this.generateHealthAlerts(
        lastBackup,
        backupLag,
        storageUsage,
        successRate
      );

      const overallStatus = this.determineOverallStatus(alerts, backupLag);

      const healthStatus: BackupHealthStatus = {
        overallStatus,
        lastBackupStatus: lastBackup?.status || BackupStatus.PENDING,
        backupLag,
        storageUsage,
        successRate,
        alerts,
      };

      // Send alerts if critical issues detected
      if (overallStatus === 'critical' || alerts.some(a => a.severity === 'critical')) {
        await this.sendCriticalAlerts(alerts);
      }

      this.logger.log(`Backup health check completed: ${overallStatus}`);
      return healthStatus;
    } catch (error) {
      this.logger.error('Backup health check failed', error);
      throw error;
    }
  }

  /**
   * Monitor backup performance metrics
   */
  async monitorPerformance(backupId: string): Promise<void> {
    this.logger.log(`Monitoring performance for backup ${backupId}`);

    try {
      const metrics = await this.collectPerformanceMetrics();
      this.performanceHistory.push(metrics);
      
      // Keep only last 100 performance records
      if (this.performanceHistory.length > 100) {
        this.performanceHistory.shift();
      }

      // Check for performance degradation
      await this.checkPerformanceDegradation(metrics);
    } catch (error) {
      this.logger.error(`Performance monitoring failed for backup ${backupId}`, error);
    }
  }

  /**
   * Generate automated alerts based on monitoring data
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async generateAutomatedAlerts(): Promise<void> {
    this.logger.log('Generating automated alerts');

    try {
      const healthStatus = await this.checkBackupHealth();
      
      // Log health status
      this.logger.log(`System Health: ${healthStatus.overallStatus}`);
      this.logger.log(`Backup Lag: ${healthStatus.backupLag} hours`);
      this.logger.log(`Success Rate: ${healthStatus.successRate}%`);
      this.logger.log(`Storage Usage: ${healthStatus.storageUsage}%`);

      // Store alerts in database
      await this.storeAlerts(healthStatus.alerts);
    } catch (error) {
      this.logger.error('Failed to generate automated alerts', error);
    }
  }

  /**
   * Check for backup lag exceeding thresholds
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkBackupLag(): Promise<void> {
    const lastBackup = await this.getLastSuccessfulBackup();
    const backupLag = this.calculateBackupLag(lastBackup);
    
    const warningThreshold = this.configService.get<number>('BACKUP_LAG_WARNING_HOURS', 2);
    const criticalThreshold = this.configService.get<number>('BACKUP_LAG_CRITICAL_HOURS', 6);

    if (backupLag > criticalThreshold) {
      const alert: BackupAlert = {
        id: `lag-critical-${Date.now()}`,
        type: 'backup_lag',
        severity: 'critical',
        message: `Backup lag critical: ${backupLag} hours since last successful backup`,
        timestamp: new Date(),
        resolved: false,
      };
      await this.sendAlert(alert);
    } else if (backupLag > warningThreshold) {
      const alert: BackupAlert = {
        id: `lag-warning-${Date.now()}`,
        type: 'backup_lag',
        severity: 'high',
        message: `Backup lag warning: ${backupLag} hours since last successful backup`,
        timestamp: new Date(),
        resolved: false,
      };
      await this.sendAlert(alert);
    }
  }

  /**
   * Monitor storage usage and alert when thresholds exceeded
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async monitorStorageUsage(): Promise<void> {
    const storageUsage = await this.getStorageUsage();
    
    const warningThreshold = this.configService.get<number>('STORAGE_WARNING_PERCENTAGE', 80);
    const criticalThreshold = this.configService.get<number>('STORAGE_CRITICAL_PERCENTAGE', 95);

    if (storageUsage > criticalThreshold) {
      const alert: BackupAlert = {
        id: `storage-critical-${Date.now()}`,
        type: 'storage_full',
        severity: 'critical',
        message: `Storage critical: ${storageUsage}% capacity used`,
        timestamp: new Date(),
        resolved: false,
      };
      await this.sendAlert(alert);
    } else if (storageUsage > warningThreshold) {
      const alert: BackupAlert = {
        id: `storage-warning-${Date.now()}`,
        type: 'storage_full',
        severity: 'high',
        message: `Storage warning: ${storageUsage}% capacity used`,
        timestamp: new Date(),
        resolved: false,
      };
      await this.sendAlert(alert);
    }
  }

  /**
   * Get current backup alerts
   */
  async getActiveAlerts(): Promise<BackupAlert[]> {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.logger.log(`Alert resolved: ${alertId}`);
    }
  }

  /**
   * Get performance metrics history
   */
  getPerformanceHistory(hours: number = 24): BackupPerformanceMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.performanceHistory.filter(metric => metric.timestamp >= cutoff);
  }

  /**
   * Get backup system metrics for dashboard
   */
  async getSystemMetrics(): Promise<any> {
    const [
      totalBackups,
      successfulBackups,
      failedBackups,
      lastBackup,
      healthStatus,
      performanceMetrics,
    ] = await Promise.all([
      this.backupRecordRepository.count(),
      this.backupRecordRepository.count({ where: { status: BackupStatus.COMPLETED } }),
      this.backupRecordRepository.count({ where: { status: BackupStatus.FAILED } }),
      this.getLastSuccessfulBackup(),
      this.checkBackupHealth(),
      this.getPerformanceMetrics(),
    ]);

    return {
      backupStats: {
        total: totalBackups,
        successful: successfulBackups,
        failed: failedBackups,
        successRate: totalBackups > 0 ? (successfulBackups / totalBackups) * 100 : 0,
      },
      lastBackup: {
        timestamp: lastBackup?.createdAt,
        status: lastBackup?.status,
      },
      health: healthStatus,
      performance: performanceMetrics,
      activeAlerts: await this.getActiveAlerts(),
    };
  }

  // Private helper methods

  private async getLastSuccessfulBackup(): Promise<BackupRecord | null> {
    return this.backupRecordRepository.findOne({
      where: { status: BackupStatus.COMPLETED },
      order: { createdAt: 'DESC' },
    });
  }

  private async getActiveSchedule(): Promise<BackupSchedule | null> {
    return this.backupScheduleRepository.findOne({
      where: { isEnabled: true },
    });
  }

  private calculateBackupLag(lastBackup: BackupRecord | null): number {
    if (!lastBackup) return Infinity;
    
    const now = new Date();
    const lastBackupTime = new Date(lastBackup.createdAt);
    const diffHours = (now.getTime() - lastBackupTime.getTime()) / (1000 * 60 * 60);
    
    return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
  }

  private async calculateSuccessRate(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [total, successful] = await Promise.all([
      this.backupRecordRepository.count({
        where: { createdAt: MoreThan(thirtyDaysAgo) },
      }),
      this.backupRecordRepository.count({
        where: {
          status: BackupStatus.COMPLETED,
          createdAt: MoreThan(thirtyDaysAgo),
        },
      }),
    ]);

    return total > 0 ? (successful / total) * 100 : 100;
  }

  private async getStorageUsage(): Promise<number> {
    // This would integrate with your cloud storage provider
    // For now, returning simulated data
    try {
      // In a real implementation, you'd query your storage provider's API
      const response = await axios.get(
        `${this.configService.get('BACKUP_STORAGE_ENDPOINT')}/usage`,
        {
          headers: {
            'Authorization': `Bearer ${this.configService.get('BACKUP_STORAGE_TOKEN')}`,
          },
        }
      );
      return response.data.usagePercentage;
    } catch (error) {
      this.logger.warn('Failed to get storage usage, using simulated data');
      // Simulate storage usage (in real implementation, query actual storage)
      return Math.floor(Math.random() * 70) + 20; // 20-90%
    }
  }

  private generateHealthAlerts(
    lastBackup: BackupRecord | null,
    backupLag: number,
    storageUsage: number,
    successRate: number
  ): BackupAlert[] {
    const alerts: BackupAlert[] = [];

    // Backup failure alert
    if (lastBackup?.status === BackupStatus.FAILED) {
      alerts.push({
        id: `failure-${lastBackup.id}`,
        type: 'backup_failure',
        severity: 'high',
        message: `Last backup failed: ${lastBackup.errorMessage}`,
        timestamp: lastBackup.createdAt,
        resolved: false,
      });
    }

    // Backup lag alerts
    const criticalLag = this.configService.get<number>('BACKUP_LAG_CRITICAL_HOURS', 6);
    const warningLag = this.configService.get<number>('BACKUP_LAG_WARNING_HOURS', 2);

    if (backupLag > criticalLag) {
      alerts.push({
        id: `lag-critical-${Date.now()}`,
        type: 'backup_lag',
        severity: 'critical',
        message: `Critical backup lag: ${backupLag} hours since last backup`,
        timestamp: new Date(),
        resolved: false,
      });
    } else if (backupLag > warningLag) {
      alerts.push({
        id: `lag-warning-${Date.now()}`,
        type: 'backup_lag',
        severity: 'high',
        message: `Backup lag warning: ${backupLag} hours since last backup`,
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Storage alerts
    const criticalStorage = this.configService.get<number>('STORAGE_CRITICAL_PERCENTAGE', 95);
    const warningStorage = this.configService.get<number>('STORAGE_WARNING_PERCENTAGE', 80);

    if (storageUsage > criticalStorage) {
      alerts.push({
        id: `storage-critical-${Date.now()}`,
        type: 'storage_full',
        severity: 'critical',
        message: `Storage critical: ${storageUsage}% capacity used`,
        timestamp: new Date(),
        resolved: false,
      });
    } else if (storageUsage > warningStorage) {
      alerts.push({
        id: `storage-warning-${Date.now()}`,
        type: 'storage_full',
        severity: 'high',
        message: `Storage warning: ${storageUsage}% capacity used`,
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Success rate alerts
    if (successRate < 90) {
      alerts.push({
        id: `success-rate-${Date.now()}`,
        type: 'performance_degradation',
        severity: 'medium',
        message: `Backup success rate below threshold: ${successRate.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false,
      });
    }

    return alerts;
  }

  private determineOverallStatus(alerts: BackupAlert[], backupLag: number): 'healthy' | 'warning' | 'critical' {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const highAlerts = alerts.filter(a => a.severity === 'high');
    
    const criticalLag = this.configService.get<number>('BACKUP_LAG_CRITICAL_HOURS', 6);

    if (criticalAlerts.length > 0 || backupLag > criticalLag) {
      return 'critical';
    }
    
    if (highAlerts.length > 0 || backupLag > this.configService.get<number>('BACKUP_LAG_WARNING_HOURS', 2)) {
      return 'warning';
    }
    
    return 'healthy';
  }

  private async collectPerformanceMetrics(): Promise<BackupPerformanceMetrics> {
    // In a real implementation, you'd collect actual system metrics
    return {
      backupDuration: Math.floor(Math.random() * 300) + 60, // 1-5 minutes
      compressionRatio: parseFloat((Math.random() * 0.5 + 0.3).toFixed(2)), // 0.3-0.8
      transferSpeed: parseFloat((Math.random() * 50 + 10).toFixed(1)), // 10-60 MB/s
      cpuUsage: Math.floor(Math.random() * 30) + 10, // 10-40%
      memoryUsage: Math.floor(Math.random() * 1000) + 500, // 500-1500 MB
      timestamp: new Date(),
    };
  }

  private async checkPerformanceDegradation(currentMetrics: BackupPerformanceMetrics): Promise<void> {
    if (this.performanceHistory.length < 5) return; // Need sufficient history

    const recentMetrics = this.performanceHistory.slice(-5);
    const avgDuration = recentMetrics.reduce((sum, m) => sum + m.backupDuration, 0) / 5;
    
    // Alert if current duration is 50% higher than average
    if (currentMetrics.backupDuration > avgDuration * 1.5) {
      const alert: BackupAlert = {
        id: `performance-${Date.now()}`,
        type: 'performance_degradation',
        severity: 'medium',
        message: `Backup performance degradation detected. Current duration: ${currentMetrics.backupDuration}s, Average: ${avgDuration.toFixed(0)}s`,
        timestamp: new Date(),
        resolved: false,
      };
      await this.sendAlert(alert);
    }
  }

  private async getPerformanceMetrics(): Promise<any> {
    if (this.performanceHistory.length === 0) {
      return null;
    }

    const latest = this.performanceHistory[this.performanceHistory.length - 1];
    const average = {
      duration: this.performanceHistory.reduce((sum, m) => sum + m.backupDuration, 0) / this.performanceHistory.length,
      compression: this.performanceHistory.reduce((sum, m) => sum + m.compressionRatio, 0) / this.performanceHistory.length,
      speed: this.performanceHistory.reduce((sum, m) => sum + m.transferSpeed, 0) / this.performanceHistory.length,
    };

    return {
      latest,
      average,
      trend: this.calculatePerformanceTrend(),
    };
  }

  private calculatePerformanceTrend(): 'improving' | 'degrading' | 'stable' {
    if (this.performanceHistory.length < 10) return 'stable';
    
    const recent = this.performanceHistory.slice(-5);
    const older = this.performanceHistory.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, m) => sum + m.backupDuration, 0) / 5;
    const olderAvg = older.reduce((sum, m) => sum + m.backupDuration, 0) / 5;
    
    if (recentAvg < olderAvg * 0.9) return 'improving';
    if (recentAvg > olderAvg * 1.1) return 'degrading';
    return 'stable';
  }

  private async sendAlert(alert: BackupAlert): Promise<void> {
    this.alerts.push(alert);
    this.logger.warn(`New alert: ${alert.message}`);
    
    // Send notification via configured channels
    await this.sendNotificationAlert(alert);
  }

  private async sendCriticalAlerts(alerts: BackupAlert[]): Promise<void> {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      await this.sendCriticalNotifications(criticalAlerts);
    }
  }

  private async storeAlerts(alerts: BackupAlert[]): Promise<void> {
    // In a real implementation, store alerts in database
    // For now, just log them
    alerts.forEach(alert => {
      this.logger.log(`Stored alert: ${alert.id} - ${alert.message}`);
    });
  }

  private async sendNotificationAlert(alert: BackupAlert): Promise<void> {
    const severityMap = {
      'low': BackupAlertSeverity.INFO,
      'medium': BackupAlertSeverity.WARNING,
      'high': BackupAlertSeverity.ERROR,
      'critical': BackupAlertSeverity.CRITICAL,
    };

    const payload: BackupAlertPayload = {
      severity: severityMap[alert.severity] || BackupAlertSeverity.INFO,
      title: `Backup Alert: ${alert.type}`,
      message: alert.message,
      timestamp: alert.timestamp,
      metadata: {
        alertId: alert.id,
        type: alert.type,
        resolved: alert.resolved,
      },
    };

    await this.notificationService.sendAlert(payload);
  }

  private async sendCriticalNotifications(alerts: BackupAlert[]): Promise<void> {
    for (const alert of alerts) {
      await this.sendNotificationAlert(alert);
    }
  }
}