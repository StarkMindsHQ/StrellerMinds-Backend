/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class BackupRetentionService {
  private readonly logger = new Logger(BackupRetentionService.name);
  private readonly backupDir: string;
  private readonly retentionDays: number;
  private readonly monthlyRetentionMonths: number;

  constructor(private readonly configService: ConfigService) {
    this.backupDir = this.configService.get<string>('BACKUP_DIR', './backups');
    this.retentionDays = this.configService.get<number>(
      'BACKUP_RETENTION_DAYS',
      30,
    );
    this.monthlyRetentionMonths = this.configService.get<number>(
      'BACKUP_MONTHLY_RETENTION_MONTHS',
      12,
    );
  }

  async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(
        (file) => file.endsWith('.sql') || file.endsWith('.tar.gz'),
      );

      const now = new Date();
      const cutoffDate = new Date(
        now.getTime() - this.retentionDays * 24 * 60 * 60 * 1000,
      );
      const monthlyCutoffDate = new Date(
        now.getTime() - this.monthlyRetentionMonths * 30 * 24 * 60 * 60 * 1000,
      );

      let deletedCount = 0;
      let preservedCount = 0;

      for (const file of backupFiles) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        const fileDate = stats.birthtime;

        // Keep monthly backups (first backup of each month) for longer
        const isMonthlyBackup = this.isFirstBackupOfMonth(file, backupFiles);

        if (isMonthlyBackup && fileDate > monthlyCutoffDate) {
          preservedCount++;
          continue;
        }

        if (fileDate < cutoffDate) {
          await fs.unlink(filePath);
          this.logger.log(`Deleted old backup: ${file}`);
          deletedCount++;
        } else {
          preservedCount++;
        }
      }

      this.logger.log(
        `Backup cleanup completed: ${deletedCount} deleted, ${preservedCount} preserved`,
      );
    } catch (error) {
      this.logger.error(`Backup cleanup failed: ${error.message}`, error.stack);
    }
  }

  private isFirstBackupOfMonth(filename: string, allFiles: string[]): boolean {
    // Extract date from filename (assuming format: db-backup-YYYY-MM-DDTHH-MM-SS.sql)
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) return false;

    const fileDate = dateMatch[1];
    const yearMonth = fileDate.substring(0, 7); // YYYY-MM

    // Check if this is the first backup file for this month
    const monthFiles = allFiles.filter((f) => f.includes(yearMonth)).sort();

    return monthFiles[0] === filename;
  }
}
