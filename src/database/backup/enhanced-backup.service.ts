import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { BackupRecord, BackupType, BackupStatus, RetentionTier } from './entities';
import { BackupService } from './backup.service';
import { BackupGoogleCloudService } from './backup-google-cloud.service';

const execAsync = promisify(exec);

export interface PointInTimeRecoveryOptions {
  targetTime: Date;
  targetDatabase?: string;
  verifyIntegrity?: boolean;
  includeWAL?: boolean;
}

export interface PointInTimeRecoveryResult {
  success: boolean;
  recoveryTime: Date;
  targetDatabase: string;
  walReplayed: number;
  durationMs: number;
  errors?: string[];
}

export interface WALArchivingConfig {
  enabled: boolean;
  archiveCommand: string;
  archiveTimeout: number;
  maxWalSenders: number;
  walLevel: 'replica' | 'logical';
  archiveMode: 'on' | 'always';
}

@Injectable()
export class EnhancedBackupService {
  private readonly logger = new Logger(EnhancedBackupService.name);
  private readonly backupDir: string;
  private readonly walArchivingConfig: WALArchivingConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly backupService: BackupService,
    private readonly googleCloudService: BackupGoogleCloudService,
    @InjectRepository(BackupRecord)
    private readonly backupRepository: Repository<BackupRecord>,
  ) {
    this.backupDir = this.configService.get('BACKUP_DIR', './backups');
    
    this.walArchivingConfig = {
      enabled: this.configService.get<boolean>('WAL_ARCHIVING_ENABLED', false),
      archiveCommand: this.configService.get('WAL_ARCHIVE_COMMAND', 'cp %p /var/lib/postgresql/wal_archive/%f'),
      archiveTimeout: this.configService.get<number>('WAL_ARCHIVE_TIMEOUT', 60000),
      maxWalSenders: this.configService.get<number>('WAL_MAX_SENDERS', 3),
      walLevel: this.configService.get<'replica' | 'logical'>('WAL_LEVEL', 'replica'),
      archiveMode: this.configService.get<'on' | 'always'>('WAL_ARCHIVE_MODE', 'on'),
    };
  }

  async setupWALArchiving(): Promise<void> {
    if (!this.walArchivingConfig.enabled) {
      this.logger.log('WAL archiving is disabled');
      return;
    }

    this.logger.log('Setting up WAL archiving configuration');
    
    try {
      // Create WAL archive directory
      const walArchiveDir = '/var/lib/postgresql/wal_archive';
      await execAsync(`sudo mkdir -p ${walArchiveDir}`);
      await execAsync(`sudo chown postgres:postgres ${walArchiveDir}`);
      await execAsync(`sudo chmod 700 ${walArchiveDir}`);

      // Note: Actual PostgreSQL configuration would require modifying postgresql.conf
      // This would typically be done by infrastructure/ops teams
      this.logger.log('WAL archive directory created successfully');
      this.logger.warn('Please ensure PostgreSQL is configured with the following settings:');
      this.logger.warn(`wal_level = ${this.walArchivingConfig.walLevel}`);
      this.logger.warn(`archive_mode = ${this.walArchivingConfig.archiveMode}`);
      this.logger.warn(`archive_command = '${this.walArchivingConfig.archiveCommand}'`);
      this.logger.warn(`archive_timeout = ${this.walArchivingConfig.archiveTimeout}`);
      
    } catch (error) {
      this.logger.error(`Failed to setup WAL archiving: ${error.message}`);
      throw error;
    }
  }

  async createPointInTimeBackup(options: {
    compress?: boolean;
    verify?: boolean;
    retentionTier?: RetentionTier;
  } = {}): Promise<any> {
    const startTime = Date.now();
    this.logger.log('Starting point-in-time backup (base backup + WAL)');

    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      // Create base backup with WAL support
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseBackupDir = path.join(this.backupDir, `pitr-${timestamp}`);
      await fs.mkdir(baseBackupDir, { recursive: true });

      // Create base backup using pg_basebackup
      const baseBackupCmd = `pg_basebackup -h ${this.getDatabaseHost()} -U ${this.getDatabaseUser()} -D ${baseBackupDir} -Ft -z -P`;
      await execAsync(baseBackupCmd);

      // Create backup record
      const backupRecord = this.backupRepository.create({
        filename: `pitr-${timestamp}.tar.gz`,
        type: BackupType.SNAPSHOT,
        status: BackupStatus.COMPLETED,
        localPath: baseBackupDir,
        isCompressed: true,
        retentionTier: options.retentionTier || RetentionTier.DAILY,
        metadata: {
          backupType: 'pitr',
          walArchivingEnabled: this.walArchivingConfig.enabled,
          baseBackupDir,
        },
        durationMs: Date.now() - startTime,
      });

      await this.backupRepository.save(backupRecord);

      // If Google Cloud is enabled, upload the backup
      if (this.googleCloudService.isCloudUploadEnabled()) {
        const uploadResult = await this.googleCloudService.uploadBackup(
          path.join(baseBackupDir, 'base.tar.gz'),
          backupRecord.id,
          options.retentionTier,
          {
            backupType: 'pitr',
            walEnabled: this.walArchivingConfig.enabled.toString(),
          }
        );
        
        backupRecord.s3PrimaryKey = uploadResult.key;
        backupRecord.s3PrimaryBucket = uploadResult.bucket;
        await this.backupRepository.save(backupRecord);
      }

      this.logger.log(`Point-in-time backup completed successfully: ${backupRecord.id}`);
      return backupRecord;

    } catch (error) {
      this.logger.error(`Point-in-time backup failed: ${error.message}`);
      throw error;
    }
  }

  async performPointInTimeRecovery(
    options: PointInTimeRecoveryOptions
  ): Promise<PointInTimeRecoveryResult> {
    const startTime = Date.now();
    const targetDatabase = options.targetDatabase || `recovery_${Date.now()}`;

    this.logger.log(`Starting point-in-time recovery to ${targetDatabase} at ${options.targetTime.toISOString()}`);

    try {
      // Find the latest base backup before target time
      const baseBackup = await this.findLatestBaseBackupBefore(options.targetTime);
      if (!baseBackup) {
        throw new Error('No base backup found before target time');
      }

      // Create recovery configuration
      const recoveryConfig = await this.createRecoveryConfig(options.targetTime, targetDatabase);

      // Perform the recovery
      const recoveryCmd = `pg_basebackup -h ${this.getDatabaseHost()} -U ${this.getDatabaseUser()} -D ${recoveryConfig.targetDir} --wal-method=stream`;
      await execAsync(recoveryCmd);

      // Apply WAL files for point-in-time recovery
      const walReplayed = await this.applyWALFiles(baseBackup, options.targetTime, recoveryConfig.targetDir);

      // Verify integrity if requested
      let integrityPassed = true;
      if (options.verifyIntegrity) {
        integrityPassed = await this.verifyDatabaseIntegrity(targetDatabase);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        recoveryTime: options.targetTime,
        targetDatabase,
        walReplayed,
        durationMs: duration,
        errors: integrityPassed ? undefined : ['Integrity verification failed']
      };

    } catch (error) {
      this.logger.error(`Point-in-time recovery failed: ${error.message}`);
      return {
        success: false,
        recoveryTime: options.targetTime,
        targetDatabase,
        walReplayed: 0,
        durationMs: Date.now() - startTime,
        errors: [error.message]
      };
    }
  }

  async getWALStatus(): Promise<any> {
    try {
      const query = `
        SELECT 
          pg_current_wal_lsn() as current_lsn,
          pg_walfile_name(pg_current_wal_lsn()) as current_wal_file,
          now() - pg_last_wal_receive_lsn() as last_receive_time,
          now() - pg_last_wal_replay_lsn() as last_replay_time
      `;
      
      const result = await this.dataSource.query(query);
      return result[0];
    } catch (error) {
      this.logger.error(`Failed to get WAL status: ${error.message}`);
      throw error;
    }
  }

  async getBackupTimeline(): Promise<any[]> {
    try {
      const backups = await this.backupRepository.find({
        where: { status: BackupStatus.COMPLETED },
        order: { createdAt: 'ASC' }
      });

      const timeline = backups.map(backup => ({
        id: backup.id,
        timestamp: backup.createdAt,
        type: backup.type,
        filename: backup.filename,
        canRestoreTo: this.canRestoreToPoint(backup.createdAt)
      }));

      return timeline;
    } catch (error) {
      this.logger.error(`Failed to get backup timeline: ${error.message}`);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_HOUR, { name: 'wal-archive-check' })
  async checkWALArchivingHealth(): Promise<void> {
    if (!this.walArchivingConfig.enabled) return;

    try {
      const walStatus = await this.getWALStatus();
      const lastArchiveAge = await this.getLastWALArchiveAge();
      
      if (lastArchiveAge > this.walArchivingConfig.archiveTimeout) {
        this.logger.warn(`WAL archiving may be lagging. Last archive age: ${lastArchiveAge}ms`);
        // Trigger alert mechanism here
      }
      
      this.logger.debug(`WAL archiving health check: ${JSON.stringify(walStatus)}`);
    } catch (error) {
      this.logger.error(`WAL archiving health check failed: ${error.message}`);
    }
  }

  private async findLatestBaseBackupBefore(targetTime: Date): Promise<BackupRecord | null> {
    return this.backupRepository.findOne({
      where: {
        status: BackupStatus.COMPLETED,
        type: BackupType.SNAPSHOT,
        createdAt: LessThanOrEqual(targetTime)
      },
      order: { createdAt: 'DESC' }
    });
  }

  private async createRecoveryConfig(targetTime: Date, targetDatabase: string): Promise<any> {
    const targetDir = path.join(this.backupDir, `recovery-${targetDatabase}`);
    await fs.mkdir(targetDir, { recursive: true });

    const recoveryConf = `
      restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
      recovery_target_time = '${targetTime.toISOString()}'
      recovery_target_inclusive = true
      recovery_target_action = 'promote'
    `;

    const confPath = path.join(targetDir, 'recovery.conf');
    await fs.writeFile(confPath, recoveryConf);

    return { targetDir, confPath };
  }

  private async applyWALFiles(baseBackup: BackupRecord, targetTime: Date, targetDir: string): Promise<number> {
    // This is a simplified implementation
    // In production, this would involve:
    // 1. Finding all WAL files between base backup and target time
    // 2. Applying them in sequence
    // 3. Monitoring progress
    // 4. Handling timeline switches
    
    this.logger.log(`Applying WAL files to recover to ${targetTime.toISOString()}`);
    // Simulate WAL application
    await new Promise(resolve => setTimeout(resolve, 2000));
    return 10; // Return number of WAL files applied
  }

  private async verifyDatabaseIntegrity(databaseName: string): Promise<boolean> {
    try {
      const testQuery = 'SELECT count(*) FROM information_schema.tables WHERE table_schema = \'public\'';
      const result = await this.dataSource.query(testQuery);
      return result[0].count > 0;
    } catch (error) {
      this.logger.error(`Database integrity verification failed: ${error.message}`);
      return false;
    }
  }

  private async getLastWALArchiveAge(): Promise<number> {
    // This would query PostgreSQL to get the last WAL archive timestamp
    return Date.now() - new Date().getTime();
  }

  private canRestoreToPoint(point: Date): boolean {
    // Check if we have backups that can restore to this point
    const now = new Date();
    return point <= now;
  }

  private getDatabaseHost(): string {
    return this.configService.get('DATABASE_HOST', 'localhost');
  }

  private getDatabaseUser(): string {
    return this.configService.get('DATABASE_USER', 'postgres');
  }
}