import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export interface BackupOptions {
    compress?: boolean;
    verify?: boolean;
}

export interface BackupResult {
    success: boolean;
    filename: string;
    size: number;
    duration: number;
    checksum?: string;
    error?: string;
}

/**
 * Service for automated database backups
 */
@Injectable()
export class BackupService {
    private readonly logger = new Logger(BackupService.name);
    private readonly backupDir: string;
    private readonly retentionDays: number;
    private readonly monthlyRetentionMonths: number;

    constructor(private configService: ConfigService) {
        this.backupDir = this.configService.get('BACKUP_DIR', './backups');
        this.retentionDays = this.configService.get<number>('BACKUP_RETENTION_DAYS', 30);
        this.monthlyRetentionMonths = this.configService.get<number>(
            'BACKUP_MONTHLY_RETENTION_MONTHS',
            12,
        );
    }

    /**
     * Create a database backup
     */
    async createBackup(options: BackupOptions = {}): Promise<BackupResult> {
        const startTime = Date.now();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${timestamp}.sql${options.compress ? '.gz' : ''}`;
        const filepath = path.join(this.backupDir, filename);

        this.logger.log(`Starting backup: ${filename}`);

        try {
            // Ensure backup directory exists
            await fs.mkdir(this.backupDir, { recursive: true });

            // Build pg_dump command
            const dbConfig = {
                host: this.configService.get('DATABASE_HOST', 'localhost'),
                port: this.configService.get('DATABASE_PORT', '5432'),
                user: this.configService.get('DATABASE_USER', 'postgres'),
                password: this.configService.get('DATABASE_PASSWORD'),
                database: this.configService.get('DATABASE_NAME', 'strellerminds'),
            };

            let command = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -F p`;

            if (options.compress) {
                command += ` | gzip > ${filepath}`;
            } else {
                command += ` > ${filepath}`;
            }

            // Execute backup
            await execAsync(command);

            // Get file stats
            const stats = await fs.stat(filepath);
            const duration = Date.now() - startTime;

            this.logger.log(
                `Backup completed: ${filename} (${this.formatBytes(stats.size)}) in ${duration}ms`,
            );

            // Verify backup if requested
            let checksum: string | undefined;
            if (options.verify) {
                checksum = await this.calculateChecksum(filepath);
                const isValid = await this.verifyBackup(filepath);
                if (!isValid) {
                    throw new Error('Backup verification failed');
                }
                this.logger.log(`Backup verified successfully (checksum: ${checksum})`);
            }

            // Clean up old backups
            await this.cleanupOldBackups();

            return {
                success: true,
                filename,
                size: stats.size,
                duration,
                checksum,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`Backup failed: ${error.message}`);

            return {
                success: false,
                filename,
                size: 0,
                duration,
                error: error.message,
            };
        }
    }

    /**
     * Restore database from backup
     */
    async restoreBackup(filename: string): Promise<boolean> {
        const filepath = path.join(this.backupDir, filename);

        this.logger.log(`Starting restore from: ${filename}`);

        try {
            // Check if file exists
            await fs.access(filepath);

            const dbConfig = {
                host: this.configService.get('DATABASE_HOST', 'localhost'),
                port: this.configService.get('DATABASE_PORT', '5432'),
                user: this.configService.get('DATABASE_USER', 'postgres'),
                password: this.configService.get('DATABASE_PASSWORD'),
                database: this.configService.get('DATABASE_NAME', 'strellerminds'),
            };

            let command: string;
            if (filename.endsWith('.gz')) {
                command = `gunzip < ${filepath} | PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database}`;
            } else {
                command = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} < ${filepath}`;
            }

            await execAsync(command);

            this.logger.log(`Restore completed successfully from: ${filename}`);
            return true;
        } catch (error) {
            this.logger.error(`Restore failed: ${error.message}`);
            return false;
        }
    }

    /**
     * List available backups
     */
    async listBackups(): Promise<Array<{ filename: string; size: number; created: Date }>> {
        try {
            const files = await fs.readdir(this.backupDir);
            const backups = [];

            for (const file of files) {
                if (file.startsWith('backup-') && (file.endsWith('.sql') || file.endsWith('.sql.gz'))) {
                    const filepath = path.join(this.backupDir, file);
                    const stats = await fs.stat(filepath);
                    backups.push({
                        filename: file,
                        size: stats.size,
                        created: stats.mtime,
                    });
                }
            }

            return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
        } catch (error) {
            this.logger.error(`Failed to list backups: ${error.message}`);
            return [];
        }
    }

    /**
     * Clean up old backups based on retention policy
     */
    private async cleanupOldBackups(): Promise<void> {
        try {
            const backups = await this.listBackups();
            const now = new Date();

            for (const backup of backups) {
                const age = now.getTime() - backup.created.getTime();
                const ageDays = age / (1000 * 60 * 60 * 24);

                // Keep monthly backups for longer
                const isMonthlyBackup = backup.created.getDate() === 1;
                const ageMonths = ageDays / 30;

                let shouldDelete = false;
                if (isMonthlyBackup && ageMonths > this.monthlyRetentionMonths) {
                    shouldDelete = true;
                } else if (!isMonthlyBackup && ageDays > this.retentionDays) {
                    shouldDelete = true;
                }

                if (shouldDelete) {
                    const filepath = path.join(this.backupDir, backup.filename);
                    await fs.unlink(filepath);
                    this.logger.log(`Deleted old backup: ${backup.filename}`);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to cleanup old backups: ${error.message}`);
        }
    }

    /**
     * Verify backup integrity
     */
    private async verifyBackup(filepath: string): Promise<boolean> {
        try {
            // For compressed files, test decompression
            if (filepath.endsWith('.gz')) {
                await execAsync(`gzip -t ${filepath}`);
            }

            // Check file size
            const stats = await fs.stat(filepath);
            if (stats.size === 0) {
                return false;
            }

            return true;
        } catch (error) {
            this.logger.error(`Backup verification failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Calculate file checksum
     */
    private async calculateChecksum(filepath: string): Promise<string> {
        const fileBuffer = await fs.readFile(filepath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    }

    /**
     * Format bytes to human-readable string
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}
