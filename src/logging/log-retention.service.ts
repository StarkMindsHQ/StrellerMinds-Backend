import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Client } from '@elastic/elasticsearch';
import { CorrelationLoggerService } from './correlation-logger.service';

/**
 * Log retention policy configuration
 */
export interface RetentionPolicy {
  maxAgeDays: number;
  maxSizeGB: number;
  compressAfterDays: number;
  archiveAfterDays: number;
}

/**
 * Service for managing log retention policies
 */
@Injectable()
export class LogRetentionService {
  private readonly logger = new Logger(LogRetentionService.name);
  private readonly logDir: string;
  private readonly retentionPolicy: RetentionPolicy;
  private elasticsearchClient?: Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly correlationLogger: CorrelationLoggerService,
  ) {
    this.logDir = this.configService.get<string>('LOG_DIR', 'logs');
    
    // Configure retention policy based on environment
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    this.retentionPolicy = this.getRetentionPolicy(nodeEnv);

    // Initialize Elasticsearch if configured
    const esNode = this.configService.get<string>('ELASTICSEARCH_NODE');
    if (esNode) {
      this.elasticsearchClient = new Client({
        node: esNode,
        auth: this.configService.get<string>('ELASTICSEARCH_AUTH')
          ? {
              username: this.configService.get<string>('ELASTICSEARCH_USERNAME'),
              password: this.configService.get<string>('ELASTICSEARCH_PASSWORD'),
            }
          : undefined,
      });
    }

    this.correlationLogger.log('Log retention service initialized', {
      policy: this.retentionPolicy,
      environment: nodeEnv,
    });
  }

  /**
   * Get retention policy based on environment
   */
  private getRetentionPolicy(environment: string): RetentionPolicy {
    switch (environment) {
      case 'production':
        return {
          maxAgeDays: this.configService.get<number>('LOG_RETENTION_MAX_AGE_DAYS', 90),
          maxSizeGB: this.configService.get<number>('LOG_RETENTION_MAX_SIZE_GB', 50),
          compressAfterDays: this.configService.get<number>('LOG_COMPRESS_AFTER_DAYS', 7),
          archiveAfterDays: this.configService.get<number>('LOG_ARCHIVE_AFTER_DAYS', 30),
        };
      case 'staging':
        return {
          maxAgeDays: this.configService.get<number>('LOG_RETENTION_MAX_AGE_DAYS', 30),
          maxSizeGB: this.configService.get<number>('LOG_RETENTION_MAX_SIZE_GB', 20),
          compressAfterDays: this.configService.get<number>('LOG_COMPRESS_AFTER_DAYS', 3),
          archiveAfterDays: this.configService.get<number>('LOG_ARCHIVE_AFTER_DAYS', 14),
        };
      case 'development':
      default:
        return {
          maxAgeDays: this.configService.get<number>('LOG_RETENTION_MAX_AGE_DAYS', 7),
          maxSizeGB: this.configService.get<number>('LOG_RETENTION_MAX_SIZE_GB', 5),
          compressAfterDays: this.configService.get<number>('LOG_COMPRESS_AFTER_DAYS', 1),
          archiveAfterDays: this.configService.get<number>('LOG_ARCHIVE_AFTER_DAYS', 7),
        };
    }
  }

  /**
   * Scheduled cleanup of old logs (daily at 2 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'log-cleanup' })
  async cleanupOldLogs(): Promise<void> {
    try {
      this.correlationLogger.log('Starting log cleanup job');
      
      const deletedCount = await this.cleanupLocalLogs();
      const esDeletedCount = await this.cleanupElasticsearchLogs();
      
      this.correlationLogger.log('Log cleanup completed', {
        localLogsDeleted: deletedCount,
        elasticsearchLogsDeleted: esDeletedCount,
      });
    } catch (error) {
      this.correlationLogger.error('Log cleanup failed', error.stack);
    }
  }

  /**
   * Clean up old local log files
   */
  private async cleanupLocalLogs(): Promise<number> {
    let deletedCount = 0;
    const cutoffDate = Date.now() - this.retentionPolicy.maxAgeDays * 24 * 60 * 60 * 1000;

    try {
      const files = await fs.readdir(this.logDir);
      
      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = await fs.stat(filePath);
        
        // Delete old log files
        if (stats.mtimeMs < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
          this.logger.debug(`Deleted old log file: ${file}`);
        }
      }

      // Check total size and delete oldest if over limit
      await this.enforceSizeLimit();
    } catch (error) {
      this.correlationLogger.error('Failed to cleanup local logs', error.stack);
    }

    return deletedCount;
  }

  /**
   * Enforce size limit by deleting oldest logs
   */
  private async enforceSizeLimit(): Promise<void> {
    const maxSizeBytes = this.retentionPolicy.maxSizeGB * 1024 * 1024 * 1024;
    
    try {
      const files = await fs.readdir(this.logDir);
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(this.logDir, file);
          const stats = await fs.stat(filePath);
          return { file, stats, path: filePath };
        }),
      );

      let totalSize = fileStats.reduce((sum, f) => sum + f.stats.size, 0);

      // Delete oldest files until under size limit
      while (totalSize > maxSizeBytes && fileStats.length > 0) {
        fileStats.sort((a, b) => a.stats.mtimeMs - b.stats.mtimeMs);
        const oldest = fileStats.shift()!;
        
        await fs.unlink(oldest.path);
        totalSize -= oldest.stats.size;
        
        this.logger.debug(`Deleted oldest log file to enforce size limit: ${oldest.file}`);
      }
    } catch (error) {
      this.correlationLogger.error('Failed to enforce size limit', error.stack);
    }
  }

  /**
   * Clean up old logs from Elasticsearch
   */
  private async cleanupElasticsearchLogs(): Promise<number> {
    if (!this.elasticsearchClient) {
      return 0;
    }

    try {
      const indexPrefix = this.configService.get<string>(
        'ELASTICSEARCH_LOG_INDEX',
        'strellerminds-logs',
      );
      
      // Get all indices matching pattern
      const indicesResponse = await this.elasticsearchClient.cat.indices({
        index: `${indexPrefix}*`,
        format: 'json',
      });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicy.maxAgeDays);

      let deletedCount = 0;

      for (const index of indicesResponse.body as any[]) {
        const indexName = index.index;
        const indexDate = this.extractDateFromIndex(indexName);
        
        if (indexDate && indexDate < cutoffDate) {
          await this.elasticsearchClient.indices.delete({ index: indexName });
          deletedCount++;
          this.logger.debug(`Deleted old Elasticsearch index: ${indexName}`);
        }
      }

      return deletedCount;
    } catch (error) {
      this.correlationLogger.error('Failed to cleanup Elasticsearch logs', error.stack);
      return 0;
    }
  }

  /**
   * Extract date from index name (e.g., "strellerminds-logs-2024-01-15")
   */
  private extractDateFromIndex(indexName: string): Date | null {
    const match = indexName.match(/(\d{4}-\d{2}-\d{2})$/);
    if (match) {
      return new Date(match[1]);
    }
    return null;
  }

  /**
   * Compress old log files
   */
  async compressOldLogs(): Promise<void> {
    const compressAfterDays = this.retentionPolicy.compressAfterDays;
    const cutoffDate = Date.now() - compressAfterDays * 24 * 60 * 60 * 1000;

    try {
      const files = await fs.readdir(this.logDir);
      
      for (const file of files) {
        if (!file.endsWith('.log') || file.endsWith('.gz')) continue;
        
        const filePath = path.join(this.logDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtimeMs < cutoffDate) {
          // Compress using gzip
          const zlib = require('zlib');
          const util = require('util');
          const pipeline = util.promisify(require('stream').pipeline);
          
          const inputStream = fs.createReadStream(filePath);
          const outputStream = fs.createWriteStream(`${filePath}.gz`);
          
          await pipeline(inputStream, zlib.createGzip(), outputStream);
          await fs.unlink(filePath);
          
          this.logger.debug(`Compressed log file: ${file}`);
        }
      }
    } catch (error) {
      this.correlationLogger.error('Failed to compress old logs', error.stack);
    }
  }

  /**
   * Archive old logs to cold storage
   */
  async archiveOldLogs(): Promise<void> {
    const archiveAfterDays = this.retentionPolicy.archiveAfterDays;
    const cutoffDate = Date.now() - archiveAfterDays * 24 * 60 * 60 * 1000;
    const archiveDir = path.join(this.logDir, 'archive');

    try {
      await fs.mkdir(archiveDir, { recursive: true });
      
      const files = await fs.readdir(this.logDir);
      
      for (const file of files) {
        if (file === 'archive' || !file.endsWith('.gz')) continue;
        
        const filePath = path.join(this.logDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtimeMs < cutoffDate) {
          const archivePath = path.join(archiveDir, file);
          await fs.rename(filePath, archivePath);
          this.logger.debug(`Archived log file: ${file}`);
        }
      }
    } catch (error) {
      this.correlationLogger.error('Failed to archive old logs', error.stack);
    }
  }

  /**
   * Get current log storage statistics
   */
  async getStorageStats(): Promise<{
    totalSizeGB: number;
    fileCount: number;
    oldestFile: string | null;
    newestFile: string | null;
    byExtension: Record<string, number>;
  }> {
    try {
      const files = await fs.readdir(this.logDir);
      const fileStats = await Promise.all(
        files
          .filter((f) => f !== 'archive')
          .map(async (file) => {
            const filePath = path.join(this.logDir, file);
            return { file, ...(await fs.stat(filePath)) };
          }),
      );

      const totalSize = fileStats.reduce((sum, f) => sum + f.size, 0);
      const sortedByTime = [...fileStats].sort((a, b) => a.mtimeMs - b.mtimeMs);

      const byExtension: Record<string, number> = {};
      fileStats.forEach((f) => {
        const ext = path.extname(f.file);
        byExtension[ext] = (byExtension[ext] || 0) + f.size;
      });

      return {
        totalSizeGB: totalSize / (1024 * 1024 * 1024),
        fileCount: fileStats.length,
        oldestFile: sortedByTime[0]?.file || null,
        newestFile: sortedByTime[sortedByTime.length - 1]?.file || null,
        byExtension,
      };
    } catch (error) {
      this.correlationLogger.error('Failed to get storage stats', error.stack);
      throw error;
    }
  }
}

