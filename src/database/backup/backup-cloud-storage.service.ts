import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { CloudUploadResult, CrossRegionReplicationResult } from './interfaces';
import { RetentionTier } from './entities';

@Injectable()
export class BackupCloudStorageService {
  private readonly logger = new Logger(BackupCloudStorageService.name);
  private readonly s3Primary: S3Client;
  private readonly s3Replica: S3Client | null;
  private readonly primaryBucket: string;
  private readonly replicaBucket: string;
  private readonly primaryRegion: string;
  private readonly replicaRegion: string;
  private readonly cloudUploadEnabled: boolean;
  private readonly crossRegionEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.cloudUploadEnabled = this.configService.get<boolean>('BACKUP_CLOUD_UPLOAD_ENABLED', false);
    this.crossRegionEnabled = this.configService.get<boolean>(
      'BACKUP_CROSS_REGION_REPLICATION',
      false,
    );

    this.primaryRegion = this.configService.get('AWS_REGION', 'us-east-1');
    this.replicaRegion = this.configService.get('AWS_BACKUP_REPLICA_REGION', 'us-west-2');
    this.primaryBucket = this.configService.get('AWS_BACKUP_BUCKET', 'strellerminds-backups');
    this.replicaBucket = this.configService.get(
      'AWS_BACKUP_REPLICA_BUCKET',
      'strellerminds-backups-replica',
    );

    const credentials = {
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID', ''),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY', ''),
    };

    // Initialize primary S3 client
    this.s3Primary = new S3Client({
      region: this.primaryRegion,
      credentials,
      endpoint: this.configService.get('S3_ENDPOINT'),
      forcePathStyle: !!this.configService.get('S3_ENDPOINT'),
    });

    // Initialize replica S3 client if cross-region is enabled
    if (this.crossRegionEnabled) {
      this.s3Replica = new S3Client({
        region: this.replicaRegion,
        credentials,
      });
    } else {
      this.s3Replica = null;
    }

    this.logger.log(
      `Cloud storage initialized: primary=${this.primaryRegion}/${this.primaryBucket}, ` +
        `replica=${this.crossRegionEnabled ? `${this.replicaRegion}/${this.replicaBucket}` : 'disabled'}`,
    );
  }

  isCloudUploadEnabled(): boolean {
    return this.cloudUploadEnabled;
  }

  isCrossRegionEnabled(): boolean {
    return this.crossRegionEnabled && this.s3Replica !== null;
  }

  async uploadBackup(
    filePath: string,
    backupId: string,
    tier: RetentionTier = RetentionTier.DAILY,
    metadata?: Record<string, string>,
  ): Promise<CloudUploadResult> {
    const startTime = Date.now();
    const key = this.generateS3Key(backupId, tier);

    this.logger.log(`Uploading backup to S3: ${key}`);

    try {
      const fileStream = fsSync.createReadStream(filePath);
      const stats = await fs.stat(filePath);

      const command = new PutObjectCommand({
        Bucket: this.primaryBucket,
        Key: key,
        Body: fileStream,
        ContentLength: stats.size,
        Metadata: {
          ...metadata,
          backupId,
          tier,
          uploadedAt: new Date().toISOString(),
        },
        ServerSideEncryption: 'AES256',
      });

      const response = await this.s3Primary.send(command);

      const duration = Date.now() - startTime;
      this.logger.log(`Backup uploaded to S3 in ${duration}ms: ${this.primaryBucket}/${key}`);

      return {
        bucket: this.primaryBucket,
        key,
        region: this.primaryRegion,
        etag: response.ETag || '',
        versionId: response.VersionId,
      };
    } catch (error) {
      this.logger.error(`Failed to upload backup to S3: ${error.message}`);
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
    const key = this.generateS3Key(backupId, tier);

    this.logger.log(`Uploading backup stream to S3: ${key}`);

    try {
      const command = new PutObjectCommand({
        Bucket: this.primaryBucket,
        Key: key,
        Body: stream,
        ContentLength: size,
        Metadata: {
          ...metadata,
          backupId,
          tier,
          uploadedAt: new Date().toISOString(),
        },
        ServerSideEncryption: 'AES256',
      });

      const response = await this.s3Primary.send(command);

      return {
        bucket: this.primaryBucket,
        key,
        region: this.primaryRegion,
        etag: response.ETag || '',
        versionId: response.VersionId,
      };
    } catch (error) {
      this.logger.error(`Failed to upload backup stream to S3: ${error.message}`);
      throw error;
    }
  }

  async replicateCrossRegion(sourceKey: string): Promise<CloudUploadResult> {
    if (!this.s3Replica) {
      throw new Error('Cross-region replication is not enabled');
    }

    const startTime = Date.now();
    this.logger.log(`Replicating backup to cross-region: ${sourceKey}`);

    try {
      // Copy from primary to replica bucket
      const command = new CopyObjectCommand({
        Bucket: this.replicaBucket,
        Key: sourceKey,
        CopySource: `${this.primaryBucket}/${sourceKey}`,
        ServerSideEncryption: 'AES256',
      });

      const response = await this.s3Replica.send(command);

      const duration = Date.now() - startTime;
      this.logger.log(`Backup replicated to ${this.replicaRegion} in ${duration}ms`);

      return {
        bucket: this.replicaBucket,
        key: sourceKey,
        region: this.replicaRegion,
        etag: response.CopyObjectResult?.ETag || '',
        versionId: response.VersionId,
      };
    } catch (error) {
      this.logger.error(`Failed to replicate backup: ${error.message}`);
      throw error;
    }
  }

  async uploadWithReplication(
    filePath: string,
    backupId: string,
    tier: RetentionTier = RetentionTier.DAILY,
    metadata?: Record<string, string>,
  ): Promise<CrossRegionReplicationResult> {
    // Upload to primary
    const primaryUpload = await this.uploadBackup(filePath, backupId, tier, metadata);

    // Replicate to secondary region if enabled
    let replicaUpload: CloudUploadResult;
    if (this.isCrossRegionEnabled()) {
      replicaUpload = await this.replicateCrossRegion(primaryUpload.key);
    } else {
      replicaUpload = { ...primaryUpload, region: 'not-replicated' };
    }

    return {
      primaryUpload,
      replicaUpload,
    };
  }

  async downloadBackup(
    key: string,
    outputPath: string,
    fromReplica: boolean = false,
  ): Promise<string> {
    const startTime = Date.now();
    const bucket = fromReplica ? this.replicaBucket : this.primaryBucket;
    const client = fromReplica && this.s3Replica ? this.s3Replica : this.s3Primary;

    this.logger.log(`Downloading backup from S3: ${bucket}/${key}`);

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await client.send(command);

      if (!response.Body) {
        throw new Error('Empty response body from S3');
      }

      const outputStream = fsSync.createWriteStream(outputPath);
      await pipeline(response.Body as Readable, outputStream);

      const duration = Date.now() - startTime;
      this.logger.log(`Backup downloaded in ${duration}ms: ${outputPath}`);

      return outputPath;
    } catch (error) {
      this.logger.error(`Failed to download backup: ${error.message}`);
      throw error;
    }
  }

  async downloadBackupStream(key: string, fromReplica: boolean = false): Promise<Readable> {
    const bucket = fromReplica ? this.replicaBucket : this.primaryBucket;
    const client = fromReplica && this.s3Replica ? this.s3Replica : this.s3Primary;

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await client.send(command);

      if (!response.Body) {
        throw new Error('Empty response body from S3');
      }

      return response.Body as Readable;
    } catch (error) {
      this.logger.error(`Failed to get backup stream: ${error.message}`);
      throw error;
    }
  }

  async deleteBackup(key: string, deleteReplica: boolean = true): Promise<void> {
    this.logger.log(`Deleting backup from S3: ${key}`);

    try {
      // Delete from primary
      await this.s3Primary.send(
        new DeleteObjectCommand({
          Bucket: this.primaryBucket,
          Key: key,
        }),
      );

      // Delete from replica if enabled
      if (deleteReplica && this.s3Replica) {
        try {
          await this.s3Replica.send(
            new DeleteObjectCommand({
              Bucket: this.replicaBucket,
              Key: key,
            }),
          );
        } catch (error) {
          this.logger.warn(`Failed to delete replica backup (may not exist): ${error.message}`);
        }
      }

      this.logger.log(`Backup deleted from S3: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete backup: ${error.message}`);
      throw error;
    }
  }

  async listBackups(
    prefix?: string,
    tier?: RetentionTier,
  ): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
    const listPrefix = tier ? `${tier}/` : prefix || '';

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.primaryBucket,
        Prefix: listPrefix,
        MaxKeys: 1000,
      });

      const response = await this.s3Primary.send(command);

      return (response.Contents || []).map((obj) => ({
        key: obj.Key || '',
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
      }));
    } catch (error) {
      this.logger.error(`Failed to list backups: ${error.message}`);
      throw error;
    }
  }

  async verifyBackupExists(key: string, checkReplica: boolean = false): Promise<boolean> {
    try {
      await this.s3Primary.send(
        new HeadObjectCommand({
          Bucket: this.primaryBucket,
          Key: key,
        }),
      );

      if (checkReplica && this.s3Replica) {
        await this.s3Replica.send(
          new HeadObjectCommand({
            Bucket: this.replicaBucket,
            Key: key,
          }),
        );
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async getBackupMetadata(key: string): Promise<Record<string, string>> {
    try {
      const response = await this.s3Primary.send(
        new HeadObjectCommand({
          Bucket: this.primaryBucket,
          Key: key,
        }),
      );

      return response.Metadata || {};
    } catch (error) {
      this.logger.error(`Failed to get backup metadata: ${error.message}`);
      throw error;
    }
  }

  async getStorageUsage(): Promise<{
    primary: { count: number; totalBytes: number };
    replica: { count: number; totalBytes: number };
  }> {
    const calculateUsage = async (
      client: S3Client,
      bucket: string,
    ): Promise<{ count: number; totalBytes: number }> => {
      let count = 0;
      let totalBytes = 0;
      let continuationToken: string | undefined;

      do {
        const response = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            ContinuationToken: continuationToken,
          }),
        );

        for (const obj of response.Contents || []) {
          count++;
          totalBytes += obj.Size || 0;
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return { count, totalBytes };
    };

    const primary = await calculateUsage(this.s3Primary, this.primaryBucket);
    let replica = { count: 0, totalBytes: 0 };

    if (this.s3Replica) {
      try {
        replica = await calculateUsage(this.s3Replica, this.replicaBucket);
      } catch (error) {
        this.logger.warn(`Failed to get replica storage usage: ${error.message}`);
      }
    }

    return { primary, replica };
  }

  private generateS3Key(backupId: string, tier: RetentionTier): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${tier}/${year}/${month}/${day}/backup-${backupId}.sql.gz.enc`;
  }
}
