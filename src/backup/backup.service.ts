/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BackupVerificationService } from './backup-verification.service';
import { BackupRetentionService } from './backup-retention.service';
import { EmailService } from '../email/email.service';

const execAsync = promisify(exec);

export interface BackupResult {
  success: boolean;
  backupPath?: string;
  size?: number;
  duration?: number;
  error?: string;
}

/**
 * BackupService provides logic for creating, listing, and verifying backups.
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private readonly dbConfig: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly verificationService: BackupVerificationService,
    private readonly retentionService: BackupRetentionService,
    private readonly emailService: EmailService,
  ) {
    this.backupDir = this.configService.get<string>('BACKUP_DIR', './backups');
    this.dbConfig = {
      host: this.configService.get<string>('database.host'),
      port: this.configService.get<number>('database.port'),
      username: this.configService.get<string>('database.user'),
      password: this.configService.get<string>('database.password'),
      database: this.configService.get<string>('database.name'),
    };
    this.ensureBackupDirectory();
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
      this.logger.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledDatabaseBackup(): Promise<void> {
    this.logger.log('Starting scheduled database backup');
    try {
      const result = await this.createDatabaseBackup();
      if (result.success) {
        this.logger.log(`Scheduled backup completed successfully: ${result.backupPath}`);
        await this.retentionService.cleanupOldBackups();
      } else {
        this.logger.error(`Scheduled backup failed: ${result.error}`);
        await this.sendBackupFailureAlert(result.error);
      }
    } catch (error) {
      this.logger.error(`Scheduled backup error: ${error.message}`, error.stack);
      await this.sendBackupFailureAlert(error.message);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async scheduledApplicationDataBackup(): Promise<void> {
    this.logger.log('Starting scheduled application data backup');
    try {
      const result = await this.createApplicationDataBackup();
      if (result.success) {
        this.logger.log(`Application data backup completed: ${result.backupPath}`);
      } else {
        this.logger.error(`Application data backup failed: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(`Application data backup error: ${error.message}`, error.stack);
    }
  }

  /**
   * Create a manual database backup.
   */
  async createDatabaseBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `db-backup-${timestamp}.sql`;
    const backupPath = path.join(this.backupDir, backupFileName);

    try {
      // Set PGPASSWORD environment variable for pg_dump
      const env = { ...process.env, PGPASSWORD: this.dbConfig.password };

      const command = `pg_dump -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.username} -d ${this.dbConfig.database} -f "${backupPath}" --verbose --no-password`;

      this.logger.log(`Executing backup command for database: ${this.dbConfig.database}`);
      await execAsync(command, { env });

      // Get backup file size
      const stats = await fs.stat(backupPath);
      const duration = Date.now() - startTime;

      this.logger.log(
        `Database backup created: ${backupPath} (${stats.size} bytes, ${duration}ms)`,
      );

      // Verify backup
      const isValid = await this.verificationService.verifyDatabaseBackup(backupPath);
      if (!isValid) {
        await this.sendBackupFailureAlert('Backup verification failed');
        throw new Error('Backup verification failed');
      }

      return {
        success: true,
        backupPath,
        size: stats.size,
        duration,
      };
    } catch (error) {
      this.logger.error(`Database backup failed: ${error.message}`, error.stack);
      await this.sendBackupFailureAlert(error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a manual application data backup.
   */
  async createApplicationDataBackup(): Promise<BackupResult> {
    const startTime = Date.now(); // Add missing startTime variable
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `app-data-backup-${timestamp}.tar.gz`;
    const backupPath = path.join(this.backupDir, backupFileName);

    try {
      // Use the variables in the tar command or remove them if not needed
      const uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
      const logsDir = './logs';

      // Create tar.gz archive of application data using the variables
      const command = `tar -czf "${backupPath}" -C . "${uploadDir.replace('./', '')}", "${logsDir.replace('./', '')}", .env.production`;

      this.logger.log('Creating application data backup');
      await execAsync(command);

      const stats = await fs.stat(backupPath);
      const duration = Date.now() - startTime;

      this.logger.log(
        `Application data backup created: ${backupPath} (${stats.size} bytes, ${duration}ms)`,
      );

      return {
        success: true,
        backupPath,
        size: stats.size,
        duration,
      };
    } catch (error) {
      this.logger.error(`Application data backup failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * List all backup files.
   */
  async listBackups(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      return files.filter((file) => file.endsWith('.sql') || file.endsWith('.tar.gz'));
    } catch (error) {
      this.logger.error(`Failed to list backups: ${error.message}`);
      return [];
    }
  }

  /**
   * Get information about a specific backup file.
   */
  async getBackupInfo(filename: string): Promise<any> {
    try {
      const backupPath = path.join(this.backupDir, filename);
      const stats = await fs.stat(backupPath);
      return {
        filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    } catch (error) {
      this.logger.error(`Failed to get backup info: ${error.message}`);
      return null;
    }
  }

  private async sendBackupFailureAlert(error: string): Promise<void> {
    const adminEmail = this.configService.get<string>('BACKUP_ADMIN_EMAIL');
    if (!adminEmail) {
      this.logger.warn('No BACKUP_ADMIN_EMAIL configured, cannot send alert.');
      return;
    }
    await this.emailService.sendImmediate({
      to: adminEmail,
      subject: 'Backup Failure Alert',
      templateName: 'backup-failure',
      context: {
        error,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
