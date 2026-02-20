import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BackupService } from './backup.service';
import { BackupNotificationService } from './backup-notification.service';
import { BackupMetricsService } from './backup-metrics.service';
import { BackupSchedule, BackupRecord, BackupType, BackupStatus, RetentionTier } from './entities';
import { EnhancedBackupResult } from './interfaces';

@Injectable()
export class BackupSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(BackupSchedulerService.name);
  private readonly schedulingEnabled: boolean;

  constructor(
    private readonly backupService: BackupService,
    private readonly notificationService: BackupNotificationService,
    private readonly metricsService: BackupMetricsService,
    private readonly configService: ConfigService,
    @InjectRepository(BackupSchedule)
    private readonly scheduleRepository: Repository<BackupSchedule>,
    @InjectRepository(BackupRecord)
    private readonly backupRecordRepository: Repository<BackupRecord>,
  ) {
    this.schedulingEnabled = this.configService.get<boolean>('BACKUP_SCHEDULING_ENABLED', true);
  }

  async onModuleInit(): Promise<void> {
    if (!this.schedulingEnabled) {
      this.logger.warn('Backup scheduling is disabled');
      return;
    }

    this.logger.log('Backup scheduler initialized');
    await this.updatePendingBackupCounts();
  }

  // Daily backup at 2:00 AM UTC
  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'daily-backup' })
  async handleDailyBackup(): Promise<void> {
    if (!this.schedulingEnabled) return;

    this.logger.log('Starting scheduled daily backup');

    try {
      const result = await this.backupService.createEnhancedBackup({
        backupType: BackupType.FULL,
        compress: true,
        encrypt: true,
        verify: true,
        uploadToS3: true,
        replicateCrossRegion: true,
        retentionTier: RetentionTier.DAILY,
      });

      await this.handleBackupResult(result, 'daily');
    } catch (error) {
      this.logger.error(`Scheduled daily backup failed: ${error.message}`);
    }
  }

  // Weekly backup on Sunday at 3:00 AM UTC
  @Cron('0 3 * * 0', { name: 'weekly-backup' })
  async handleWeeklyBackup(): Promise<void> {
    if (!this.schedulingEnabled) return;

    this.logger.log('Starting scheduled weekly backup');

    try {
      const result = await this.backupService.createEnhancedBackup({
        backupType: BackupType.FULL,
        compress: true,
        encrypt: true,
        verify: true,
        uploadToS3: true,
        replicateCrossRegion: true,
        retentionTier: RetentionTier.WEEKLY,
      });

      await this.handleBackupResult(result, 'weekly');
    } catch (error) {
      this.logger.error(`Scheduled weekly backup failed: ${error.message}`);
    }
  }

  // Monthly backup on 1st of each month at 4:00 AM UTC
  @Cron('0 4 1 * *', { name: 'monthly-backup' })
  async handleMonthlyBackup(): Promise<void> {
    if (!this.schedulingEnabled) return;

    this.logger.log('Starting scheduled monthly backup');

    try {
      const result = await this.backupService.createEnhancedBackup({
        backupType: BackupType.FULL,
        compress: true,
        encrypt: true,
        verify: true,
        uploadToS3: true,
        replicateCrossRegion: true,
        retentionTier: RetentionTier.MONTHLY,
      });

      await this.handleBackupResult(result, 'monthly');
    } catch (error) {
      this.logger.error(`Scheduled monthly backup failed: ${error.message}`);
    }
  }

  // Cleanup expired backups daily at 5:00 AM UTC
  @Cron(CronExpression.EVERY_DAY_AT_5AM, { name: 'backup-cleanup' })
  async handleBackupCleanup(): Promise<void> {
    if (!this.schedulingEnabled) return;

    this.logger.log('Starting scheduled backup cleanup');

    try {
      const result = await this.backupService.cleanupExpiredBackups();

      if (result.deleted > 0) {
        await this.notificationService.sendRetentionCleanupNotification(
          result.deleted,
          result.freedBytes,
        );
      }
    } catch (error) {
      this.logger.error(`Scheduled cleanup failed: ${error.message}`);
    }
  }

  // Integrity check daily at 6:00 AM UTC
  @Cron('0 6 * * *', { name: 'integrity-check' })
  async handleIntegrityCheck(): Promise<void> {
    if (!this.schedulingEnabled) return;

    this.logger.log('Starting scheduled integrity check');

    try {
      // Get recent successful backups
      const recentBackups = await this.backupRecordRepository.find({
        where: { status: BackupStatus.COMPLETED },
        order: { createdAt: 'DESC' },
        take: 5,
      });

      for (const backup of recentBackups) {
        const isValid = await this.backupService.verifyBackupIntegrity(backup.id);
        if (!isValid) {
          this.logger.error(`Integrity check failed for backup: ${backup.id}`);
        }
      }
    } catch (error) {
      this.logger.error(`Scheduled integrity check failed: ${error.message}`);
    }
  }

  // Update metrics every hour
  @Cron(CronExpression.EVERY_HOUR, { name: 'metrics-update' })
  async handleMetricsUpdate(): Promise<void> {
    try {
      await this.updatePendingBackupCounts();
    } catch (error) {
      this.logger.error(`Metrics update failed: ${error.message}`);
    }
  }

  async triggerManualBackup(options?: {
    type?: BackupType;
    tier?: RetentionTier;
    scheduleId?: string;
  }): Promise<EnhancedBackupResult> {
    this.logger.log('Triggering manual backup');

    return this.backupService.createEnhancedBackup({
      backupType: options?.type || BackupType.FULL,
      compress: true,
      encrypt: true,
      verify: true,
      uploadToS3: true,
      replicateCrossRegion: true,
      retentionTier: options?.tier || RetentionTier.DAILY,
      scheduleId: options?.scheduleId,
    });
  }

  async getSchedules(): Promise<BackupSchedule[]> {
    return this.scheduleRepository.find({
      order: { createdAt: 'ASC' },
    });
  }

  async getScheduleById(id: string): Promise<BackupSchedule | null> {
    return this.scheduleRepository.findOne({ where: { id } });
  }

  async createSchedule(data: Partial<BackupSchedule>): Promise<BackupSchedule> {
    const schedule = this.scheduleRepository.create(data);
    return this.scheduleRepository.save(schedule);
  }

  async updateSchedule(id: string, data: Partial<BackupSchedule>): Promise<BackupSchedule | null> {
    const schedule = await this.scheduleRepository.findOne({ where: { id } });
    if (!schedule) {
      return null;
    }

    Object.assign(schedule, data);
    return this.scheduleRepository.save(schedule);
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const result = await this.scheduleRepository.delete(id);
    return result.affected > 0;
  }

  async toggleSchedule(id: string, enabled: boolean): Promise<BackupSchedule | null> {
    return this.updateSchedule(id, { isEnabled: enabled });
  }

  private async handleBackupResult(
    result: EnhancedBackupResult,
    scheduleName: string,
  ): Promise<void> {
    const backup = await this.backupRecordRepository.findOne({
      where: { id: result.id },
    });

    if (!backup) return;

    if (result.success) {
      this.logger.log(`Scheduled ${scheduleName} backup completed: ${result.filename}`);
      await this.notificationService.sendBackupSuccessNotification(backup);
    } else {
      this.logger.error(`Scheduled ${scheduleName} backup failed: ${result.error}`);
      await this.notificationService.sendBackupFailureNotification(
        backup,
        result.error || 'Unknown error',
      );
    }

    // Update schedule record
    const schedule = await this.scheduleRepository.findOne({
      where: { name: `${scheduleName.charAt(0).toUpperCase() + scheduleName.slice(1)} Backup` },
    });

    if (schedule) {
      schedule.lastRunAt = new Date();
      schedule.lastBackupId = result.id;
      schedule.lastStatus = result.success ? 'success' : 'failed';
      await this.scheduleRepository.save(schedule);
    }
  }

  private async updatePendingBackupCounts(): Promise<void> {
    const pending = await this.backupRecordRepository.count({
      where: { status: BackupStatus.PENDING },
    });
    const active = await this.backupRecordRepository.count({
      where: { status: BackupStatus.IN_PROGRESS },
    });

    this.metricsService.setPendingBackups(pending);
    this.metricsService.setActiveBackups(active);
  }
}
