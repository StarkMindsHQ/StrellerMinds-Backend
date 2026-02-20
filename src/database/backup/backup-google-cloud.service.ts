import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage, Bucket, File } from '@google-cloud/storage';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { CloudUploadResult } from './interfaces';
import { RetentionTier } from './entities';

@Injectable()
export class BackupGoogleCloudService {
  private readonly logger = new Logger(BackupGoogleCloudService.name);
  private readonly storage: Storage;
  private readonly primaryBucket: Bucket;
  private readonly replicaBucket: Bucket | null;
  private readonly cloudUploadEnabled: boolean;
  private readonly crossRegionEnabled: boolean;
  private readonly projectId: string;
  private readonly primaryLocation: string;
  private readonly replicaLocation: string;

  constructor(private readonly configService: ConfigService) {
    this.cloudUploadEnabled = this.configService.get<boolean>(
      'BACKUP_GOOGLE_CLOUD_UPLOAD_ENABLED',
      false,
    );
    this.crossRegionEnabled = this.configService.get<boolean>(
      'BACKUP_GOOGLE_CLOUD_CROSS_REGION_REPLICATION',
      false,
    );

    this.projectId = this.configService.get('GOOGLE_CLOUD_PROJECT_ID', '');
    this.primaryLocation = this.configService.get(
      'GOOGLE_CLOUD_BACKUP_LOCATION',
      'us-central1',
    );
    this.replicaLocation = this.configService.get(
      'GOOGLE_CLOUD_BACKUP_REPLICA_LOCATION',
      'us-west1',
    );

    // Initialize Google Cloud Storage client
    const credentialsPath = this.configService.get('GOOGLE_APPLICATION_CREDENTIALS');
    const credentials = credentialsPath ? require(credentialsPath) : undefined;

    this.storage = new Storage({
      projectId: this.projectId,
      credentials,
      keyFilename: credentialsPath,
    });

    // Initialize buckets
    const primaryBucketName = this.configService.get(
      'GOOGLE_CLOUD_BACKUP_BUCKET',
      'strellerminds-backups',
    );
    this.primaryBucket = this.storage.bucket(primaryBucketName);

    if (this.crossRegionEnabled) {
      const replicaBucketName = this.configService.get(
        'GOOGLE_CLOUD_BACKUP_REPLICA_BUCKET',
        'strellerminds-backups-replica',
      );
      this.replicaBucket = this.storage.bucket(replicaBucketName);
    } else {
      this.replicaBucket = null;
    }

    this.logger.log(
      `Google Cloud Storage initialized: primary=${this.primaryLocation}/${primaryBucketName}, ` +
        `replica=${this.crossRegionEnabled ? `${this.replicaLocation}/${this.replicaBucket?.name}` : 'disabled'}`,
    );
  }

  isCloudUploadEnabled(): boolean {
    return this.cloudUploadEnabled;
  }

  isCrossRegionEnabled(): boolean {
    return this.crossRegionEnabled && this.replicaBucket !== null;
  }

  async uploadBackup(
    filePath: string,
    backupId: string,
    tier: RetentionTier = RetentionTier.DAILY,
    metadata?: Record<string, string>,
  ): Promise<CloudUploadResult> {
    const startTime = Date.now();
    const key = this.generateGCSKey(backupId, tier);

    this.logger.log(`Uploading backup to Google Cloud Storage: ${key}`);

    try {
      const [file] = await this.primaryBucket.upload(filePath, {
        destination: key,
        metadata: {
          contentType: 'application/octet-stream',
          metadata: {
            ...metadata,
            backupId,
            tier,
            uploadedAt: new Date().toISOString(),
          },
        },
        resumable: false,
        gzip: true,
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `Backup uploaded to Google Cloud Storage in ${duration}ms: ${this.primaryBucket.name}/${key}`,
      );

      return {
        bucket: this.primaryBucket.name,
        key,
        region: this.primaryLocation,
        etag: file.metadata.etag || '',
        versionId: file.metadata.generation?.toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to upload backup to Google Cloud Storage: ${error.message}`);
      throw error;
    }
  }

  async uploadBackupStream(
    stream: Readable,
    backupId: string,
    size: number,
    tier: RetentionTier = RetentionTier.DAILY,
    metadata?: Record<string, string>,
  ): Promise<CloudUploadResult> {
    const key = this.generateGCSKey(backupId, tier);

    this.logger.log(`Uploading backup stream to Google Cloud Storage: ${key}`);

    try {
      const file = this.primaryBucket.file(key);
      
      const writeStream = file.createWriteStream({
        metadata: {
          contentType: 'application/octet-stream',
          metadata: {
            ...metadata,
            backupId,
            tier,
            uploadedAt: new Date().toISOString(),
          },
        },
        resumable: false,
        gzip: true,
      });

      await pipeline(stream, writeStream);

      return {
        bucket: this.primaryBucket.name,
        key,
        region: this.primaryLocation,
        etag: file.metadata.etag || '',
        versionId: file.metadata.generation?.toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to upload backup stream to Google Cloud Storage: ${error.message}`);
      throw error;
    }
  }

  async downloadBackup(
    key: string,
    localPath: string,
    fromReplica: boolean = false,
  ): Promise<void> {
    const bucket = fromReplica && this.replicaBucket ? this.replicaBucket : this.primaryBucket;
    
    this.logger.log(`Downloading backup from Google Cloud Storage: ${key} to ${localPath}`);

    try {
      const file = bucket.file(key);
      const writeStream = fsSync.createWriteStream(localPath);
      
      await pipeline(
        file.createReadStream(),
        writeStream
      );

      this.logger.log(`Backup downloaded successfully: ${localPath}`);
    } catch (error) {
      this.logger.error(`Failed to download backup from Google Cloud Storage: ${error.message}`);
      throw error;
    }
  }

  async deleteBackup(key: string, fromReplica: boolean = false): Promise<void> {
    const bucket = fromReplica && this.replicaBucket ? this.replicaBucket : this.primaryBucket;
    
    this.logger.log(`Deleting backup from Google Cloud Storage: ${key}`);

    try {
      await bucket.file(key).delete();
      this.logger.log(`Backup deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete backup from Google Cloud Storage: ${error.message}`);
      throw error;
    }
  }

  async getBackupMetadata(key: string, fromReplica: boolean = false): Promise<any> {
    const bucket = fromReplica && this.replicaBucket ? this.replicaBucket : this.primaryBucket;
    
    try {
      const [metadata] = await bucket.file(key).getMetadata();
      return metadata;
    } catch (error) {
      this.logger.error(`Failed to get backup metadata from Google Cloud Storage: ${error.message}`);
      throw error;
    }
  }

  async listBackups(
    prefix?: string,
    fromReplica: boolean = false,
  ): Promise<Array<{ key: string; size: number; modified: Date }>> {
    const bucket = fromReplica && this.replicaBucket ? this.replicaBucket : this.primaryBucket;
    
    try {
      const [files] = await bucket.getFiles({
        prefix,
      });

      return files.map((file: File) => ({
        key: file.name,
        size: Number(file.metadata.size || '0'),
        modified: new Date(file.metadata.updated || ''),
      }));
    } catch (error) {
      this.logger.error(`Failed to list backups from Google Cloud Storage: ${error.message}`);
      throw error;
    }
  }

  async replicateCrossRegion(sourceKey: string): Promise<CloudUploadResult> {
    if (!this.replicaBucket) {
      throw new Error('Cross-region replication is not enabled');
    }

    const startTime = Date.now();
    this.logger.log(`Replicating backup to cross-region: ${sourceKey}`);

    try {
      const sourceFile = this.primaryBucket.file(sourceKey);
      const destinationFile = this.replicaBucket.file(sourceKey);

      // Copy file from primary to replica bucket
      await sourceFile.copy(destinationFile);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Backup replicated to cross-region in ${duration}ms: ${this.replicaBucket.name}/${sourceKey}`,
      );

      const [metadata] = await destinationFile.getMetadata();

      return {
        bucket: this.replicaBucket.name,
        key: sourceKey,
        region: this.replicaLocation,
        etag: metadata.etag || '',
        versionId: metadata.generation?.toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to replicate backup to cross-region: ${error.message}`);
      throw error;
    }
  }

  async verifyBackupIntegrity(key: string, expectedChecksum: string): Promise<boolean> {
    try {
      const file = this.primaryBucket.file(key);
      const [metadata] = await file.getMetadata();
      
      // Compare with stored checksum
      const storedChecksum = metadata.metadata?.checksum;
      return storedChecksum === expectedChecksum;
    } catch (error) {
      this.logger.error(`Failed to verify backup integrity: ${error.message}`);
      return false;
    }
  }

  async getStorageUsage(): Promise<{ totalBytes: number; fileCount: number }> {
    try {
      const [files] = await this.primaryBucket.getFiles();
      
      let totalBytes = 0;
      const fileCount = files.length;

      for (const file of files) {
        totalBytes += Number(file.metadata.size || '0');
      }

      return { totalBytes, fileCount };
    } catch (error) {
      this.logger.error(`Failed to get storage usage: ${error.message}`);
      throw error;
    }
  }

  private generateGCSKey(backupId: string, tier: RetentionTier): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = date.toISOString().replace(/[:.]/g, '-');

    return `${tier}/${year}/${month}/${day}/${backupId}-${timestamp}.sql.gz`;
  }
}