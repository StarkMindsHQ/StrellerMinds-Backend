import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { BackupRecord, BackupType, BackupStatus, StorageLocation, RetentionTier } from './entities';
import {
  BackupOptions,
  BackupResult,
  EnhancedBackupOptions,
  EnhancedBackupResult,
  BackupStats,
  determineRetentionTier,
  calculateExpirationDate,
} from './interfaces';
import { BackupEncryptionService } from './backup-encryption.service';
import { BackupCloudStorageService } from './backup-cloud-storage.service';
import { BackupMetricsService } from './backup-metrics.service';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private readonly retentionDays: number;
  private readonly monthlyRetentionMonths: number;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(BackupRecord)
    private readonly backupRecordRepository: Repository<BackupRecord>,
    private readonly encryptionService: BackupEncryptionService,
    private readonly cloudStorageService: BackupCloudStorageService,
    private readonly metricsService: BackupMetricsService,
  ) {
    this.backupDir = this.configService.get('BACKUP_DIR', './backups');
    this.retentionDays = this.configService.get<number>('BACKUP_RETENTION_DAYS', 30);
    this.monthlyRetentionMonths = this.configService.get<number>(
      'BACKUP_MONTHLY_RETENTION_MONTHS',
      12,
    );
  }

  async createEnhancedBackup(options: EnhancedBackupOptions = {}): Promise<EnhancedBackupResult> {
    const startTime = Date.now();
    const backupType = options.backupType || BackupType.FULL;

    // Create backup record
    const backupRecord = this.backupRecordRepository.create({
      filename: '',
      type: backupType,
      status: BackupStatus.PENDING,
      isCompressed: options.compress !== false,
      isEncrypted: options.encrypt !== false && this.encryptionService.isEncryptionEnabled(),
      retentionTier: options.retentionTier || determineRetentionTier(new Date()),
      scheduleId: options.scheduleId,
    });

    await this.backupRecordRepository.save(backupRecord);
    this.metricsService.recordBackupStart(backupType);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let filename = `backup-${backupRecord.id}-${timestamp}.sql`;
    const compress = options.compress !== false;
    const encrypt = options.encrypt !== false && this.encryptionService.isEncryptionEnabled();
    const uploadToS3 =
      options.uploadToS3 !== false && this.cloudStorageService.isCloudUploadEnabled();
    const replicate =
      options.replicateCrossRegion !== false && this.cloudStorageService.isCrossRegionEnabled();

    if (compress) filename += '.gz';
    if (encrypt) filename += '.enc';

    const localPath = path.join(this.backupDir, filename);
    backupRecord.filename = filename;
    backupRecord.localPath = localPath;
    backupRecord.status = BackupStatus.IN_PROGRESS;
    await this.backupRecordRepository.save(backupRecord);

    this.logger.log(`Starting enhanced backup: ${filename}`);

    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      // Step 1: Create raw backup
      const rawBackupPath = await this.createRawBackup(backupRecord.id, compress);

      // Step 2: Calculate checksum of raw backup
      const checksum = await this.calculateChecksum(rawBackupPath);
      backupRecord.checksumSha256 = checksum;

      // Get raw backup size
      const rawStats = await fs.stat(rawBackupPath);
      backupRecord.sizeBytes = rawStats.size;
      backupRecord.compressedSizeBytes = compress ? rawStats.size : null;

      // Step 3: Encrypt if enabled
      let finalPath = rawBackupPath;
      if (encrypt) {
        const encryptResult = await this.encryptionService.encryptFile(rawBackupPath, localPath);
        backupRecord.encryptionKeyId = encryptResult.keyId;
        finalPath = encryptResult.encryptedPath;

        // Delete unencrypted file
        await fs.unlink(rawBackupPath);

        // Update size with encrypted file size
        const encStats = await fs.stat(finalPath);
        backupRecord.compressedSizeBytes = encStats.size;
      } else if (rawBackupPath !== localPath) {
        await fs.rename(rawBackupPath, localPath);
        finalPath = localPath;
      }

      backupRecord.storageLocations = [StorageLocation.LOCAL];

      // Step 4: Upload to S3 if enabled
      if (uploadToS3) {
        const uploadResult = await this.cloudStorageService.uploadBackup(
          finalPath,
          backupRecord.id,
          backupRecord.retentionTier,
          {
            checksum,
            type: backupType,
            encrypted: String(encrypt),
          },
        );
        backupRecord.s3PrimaryKey = uploadResult.key;
        backupRecord.s3PrimaryBucket = uploadResult.bucket;
        backupRecord.storageLocations.push(StorageLocation.S3_PRIMARY);

        // Step 5: Replicate cross-region if enabled
        if (replicate) {
          try {
            const replicaResult = await this.cloudStorageService.replicateCrossRegion(
              uploadResult.key,
            );
            backupRecord.s3ReplicaKey = replicaResult.key;
            backupRecord.s3ReplicaBucket = replicaResult.bucket;
            backupRecord.storageLocations.push(StorageLocation.S3_REPLICA);
            backupRecord.replicatedAt = new Date();
            backupRecord.status = BackupStatus.REPLICATED;
          } catch (replicaError) {
            this.logger.error(`Replication failed: ${replicaError.message}`);
            // Continue without replication
          }
        }
      }

      // Verify backup if requested
      if (options.verify !== false) {
        const isValid = await this.verifyBackup(finalPath);
        if (isValid) {
          backupRecord.verifiedAt = new Date();
          if (backupRecord.status !== BackupStatus.REPLICATED) {
            backupRecord.status = BackupStatus.VERIFIED;
          }
        }
      }

      if (backupRecord.status === BackupStatus.IN_PROGRESS) {
        backupRecord.status = BackupStatus.COMPLETED;
      }

      // Calculate expiration
      backupRecord.expiresAt = calculateExpirationDate(new Date(), backupRecord.retentionTier);

      // Get PostgreSQL version
      try {
        const { stdout } = await execAsync('psql --version');
        backupRecord.postgresVersion = stdout.trim();
      } catch {
        // Ignore version detection errors
      }

      const duration = Date.now() - startTime;
      backupRecord.durationMs = duration;

      await this.backupRecordRepository.save(backupRecord);

      this.metricsService.recordBackupComplete(
        backupType,
        duration,
        Number(backupRecord.sizeBytes),
        compress,
      );

      this.logger.log(
        `Enhanced backup completed: ${filename} (${this.formatBytes(Number(backupRecord.sizeBytes))}) in ${duration}ms`,
      );

      return {
        success: true,
        id: backupRecord.id,
        filename,
        size: Number(backupRecord.sizeBytes),
        duration,
        checksum,
        encrypted: encrypt,
        s3Uploaded: uploadToS3 && !!backupRecord.s3PrimaryKey,
        replicated: !!backupRecord.s3ReplicaKey,
        storageLocations: backupRecord.storageLocations,
        s3PrimaryKey: backupRecord.s3PrimaryKey,
        s3ReplicaKey: backupRecord.s3ReplicaKey,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      backupRecord.status = BackupStatus.FAILED;
      backupRecord.errorMessage = error.message;
      backupRecord.durationMs = duration;
      backupRecord.retryCount += 1;

      await this.backupRecordRepository.save(backupRecord);

      this.metricsService.recordBackupFailure(backupType, error.message);
      this.logger.error(`Enhanced backup failed: ${error.message}`);

      return {
        success: false,
        id: backupRecord.id,
        filename,
        size: 0,
        duration,
        error: error.message,
        encrypted: false,
        s3Uploaded: false,
        replicated: false,
        storageLocations: [],
      };
    }
  }

  // Keep original method for backward compatibility
  async createBackup(options: BackupOptions = {}): Promise<BackupResult> {
    const result = await this.createEnhancedBackup({
      ...options,
      uploadToS3: false,
      encrypt: false,
      replicateCrossRegion: false,
    });

    return {
      success: result.success,
      filename: result.filename,
      size: result.size,
      duration: result.duration,
      checksum: result.checksum,
      error: result.error,
    };
  }

  private async createRawBackup(backupId: string, compress: boolean): Promise<string> {
    const tempFilename = `backup-${backupId}-temp.sql${compress ? '.gz' : ''}`;
    const tempPath = path.join(this.backupDir, tempFilename);

    const dbConfig = {
      host: this.configService.get('DATABASE_HOST', 'localhost'),
      port: this.configService.get('DATABASE_PORT', '5432'),
      user: this.configService.get('DATABASE_USER', 'postgres'),
      password: this.configService.get('DATABASE_PASSWORD'),
      database: this.configService.get('DATABASE_NAME', 'strellerminds'),
    };

    let command = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -F p`;

    if (compress) {
      command += ` | gzip > "${tempPath}"`;
    } else {
      command += ` > "${tempPath}"`;
    }

    await execAsync(command);
    return tempPath;
  }

  async restoreBackup(filename: string): Promise<boolean> {
    const filepath = path.join(this.backupDir, filename);

    this.logger.log(`Starting restore from: ${filename}`);

    try {
      await fs.access(filepath);

      let restorePath = filepath;

      // Decrypt if encrypted
      if (filename.endsWith('.enc')) {
        const decryptedPath = filepath.replace('.enc', '');
        await this.encryptionService.decryptFile(filepath, decryptedPath);
        restorePath = decryptedPath;
      }

      const dbConfig = {
        host: this.configService.get('DATABASE_HOST', 'localhost'),
        port: this.configService.get('DATABASE_PORT', '5432'),
        user: this.configService.get('DATABASE_USER', 'postgres'),
        password: this.configService.get('DATABASE_PASSWORD'),
        database: this.configService.get('DATABASE_NAME', 'strellerminds'),
      };

      let command: string;
      if (restorePath.endsWith('.gz')) {
        command = `gunzip < "${restorePath}" | PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database}`;
      } else {
        command = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} < "${restorePath}"`;
      }

      await execAsync(command);

      // Clean up decrypted file
      if (restorePath !== filepath) {
        await fs.unlink(restorePath);
      }

      this.logger.log(`Restore completed successfully from: ${filename}`);
      return true;
    } catch (error) {
      this.logger.error(`Restore failed: ${error.message}`);
      return false;
    }
  }

  async getBackupById(id: string): Promise<BackupRecord | null> {
    return this.backupRecordRepository.findOne({ where: { id } });
  }

  async listBackupRecords(
    options: {
      type?: BackupType;
      status?: BackupStatus;
      tier?: RetentionTier;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ records: BackupRecord[]; total: number }> {
    const where: any = {};
    if (options.type) where.type = options.type;
    if (options.status) where.status = options.status;
    if (options.tier) where.retentionTier = options.tier;

    const [records, total] = await this.backupRecordRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: options.limit || 50,
      skip: options.offset || 0,
    });

    return { records, total };
  }

  async listBackups(): Promise<Array<{ filename: string; size: number; created: Date }>> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (
          file.startsWith('backup-') &&
          (file.endsWith('.sql') || file.endsWith('.sql.gz') || file.endsWith('.enc'))
        ) {
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

  async deleteBackup(id: string): Promise<boolean> {
    const backup = await this.backupRecordRepository.findOne({ where: { id } });
    if (!backup) {
      return false;
    }

    try {
      // Delete local file
      if (backup.localPath) {
        try {
          await fs.unlink(backup.localPath);
        } catch (err) {
          this.logger.warn(`Local file not found: ${backup.localPath}`);
        }
      }

      // Delete from S3
      if (backup.s3PrimaryKey) {
        await this.cloudStorageService.deleteBackup(backup.s3PrimaryKey, !!backup.s3ReplicaKey);
      }

      backup.status = BackupStatus.DELETED;
      await this.backupRecordRepository.save(backup);

      this.logger.log(`Backup deleted: ${backup.filename}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete backup: ${error.message}`);
      return false;
    }
  }

  async getBackupStats(): Promise<BackupStats> {
    const records = await this.backupRecordRepository.find();

    const stats: BackupStats = {
      totalBackups: records.length,
      totalSizeBytes: 0,
      backupsByType: {
        [BackupType.FULL]: 0,
        [BackupType.INCREMENTAL]: 0,
        [BackupType.WAL]: 0,
        [BackupType.SNAPSHOT]: 0,
      },
      backupsByStatus: {
        [BackupStatus.PENDING]: 0,
        [BackupStatus.IN_PROGRESS]: 0,
        [BackupStatus.COMPLETED]: 0,
        [BackupStatus.FAILED]: 0,
        [BackupStatus.VERIFIED]: 0,
        [BackupStatus.REPLICATED]: 0,
        [BackupStatus.DELETED]: 0,
      },
      backupsByTier: {
        [RetentionTier.DAILY]: 0,
        [RetentionTier.WEEKLY]: 0,
        [RetentionTier.MONTHLY]: 0,
        [RetentionTier.YEARLY]: 0,
      },
      lastBackupAt: null,
      lastSuccessfulBackupAt: null,
      averageDurationMs: 0,
      storageByLocation: {
        [StorageLocation.LOCAL]: 0,
        [StorageLocation.S3_PRIMARY]: 0,
        [StorageLocation.S3_REPLICA]: 0,
      },
    };

    let totalDuration = 0;
    let durationCount = 0;

    for (const record of records) {
      stats.totalSizeBytes += Number(record.sizeBytes) || 0;
      stats.backupsByType[record.type]++;
      stats.backupsByStatus[record.status]++;
      if (record.retentionTier) {
        stats.backupsByTier[record.retentionTier]++;
      }

      if (record.durationMs > 0) {
        totalDuration += record.durationMs;
        durationCount++;
      }

      if (!stats.lastBackupAt || record.createdAt > stats.lastBackupAt) {
        stats.lastBackupAt = record.createdAt;
      }

      if (
        [BackupStatus.COMPLETED, BackupStatus.VERIFIED, BackupStatus.REPLICATED].includes(
          record.status,
        ) &&
        (!stats.lastSuccessfulBackupAt || record.createdAt > stats.lastSuccessfulBackupAt)
      ) {
        stats.lastSuccessfulBackupAt = record.createdAt;
      }

      for (const location of record.storageLocations || []) {
        stats.storageByLocation[location] += Number(record.sizeBytes) || 0;
      }
    }

    stats.averageDurationMs = durationCount > 0 ? totalDuration / durationCount : 0;

    return stats;
  }

  async cleanupExpiredBackups(): Promise<{ deleted: number; freedBytes: number }> {
    const now = new Date();
    const expired = await this.backupRecordRepository.find({
      where: {
        expiresAt: LessThan(now),
        status: BackupStatus.COMPLETED,
      },
    });

    let deleted = 0;
    let freedBytes = 0;

    for (const backup of expired) {
      const size = Number(backup.sizeBytes);
      if (await this.deleteBackup(backup.id)) {
        deleted++;
        freedBytes += size;
      }
    }

    this.logger.log(
      `Cleanup completed: ${deleted} backups deleted, ${this.formatBytes(freedBytes)} freed`,
    );

    return { deleted, freedBytes };
  }

  async verifyBackupIntegrity(id: string): Promise<boolean> {
    const backup = await this.backupRecordRepository.findOne({ where: { id } });
    if (!backup || !backup.localPath) {
      return false;
    }

    try {
      const isValid = await this.verifyBackup(backup.localPath);

      if (isValid && backup.checksumSha256) {
        // For encrypted files, we can't verify checksum directly
        if (!backup.isEncrypted) {
          const currentChecksum = await this.calculateChecksum(backup.localPath);
          if (currentChecksum !== backup.checksumSha256) {
            this.logger.error(`Checksum mismatch for backup ${id}`);
            this.metricsService.recordVerification(false);
            return false;
          }
        }
      }

      if (isValid) {
        backup.verifiedAt = new Date();
        await this.backupRecordRepository.save(backup);
        this.metricsService.recordVerification(true);
      }

      return isValid;
    } catch (error) {
      this.logger.error(`Verification failed for ${id}: ${error.message}`);
      this.metricsService.recordVerification(false);
      return false;
    }
  }

  private async verifyBackup(filepath: string): Promise<boolean> {
    try {
      // Check file exists and has content
      const stats = await fs.stat(filepath);
      if (stats.size === 0) {
        return false;
      }

      // For compressed files, test decompression
      if (filepath.endsWith('.gz') && !filepath.endsWith('.enc')) {
        await execAsync(`gzip -t "${filepath}"`);
      }

      return true;
    } catch (error) {
      this.logger.error(`Backup verification failed: ${error.message}`);
      return false;
    }
  }

  async calculateChecksum(filepath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fsSync.createReadStream(filepath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}
