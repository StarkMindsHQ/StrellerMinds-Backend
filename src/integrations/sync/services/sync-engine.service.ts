import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncLog, SyncStatus, SyncDirection } from '../../common/entities/sync-log.entity';
import { IntegrationMapping } from '../../common/entities/integration-mapping.entity';
import { IntegrationConfig } from '../../common/entities/integration-config.entity';
import { INTEGRATION_CONSTANTS } from '../../common/constants/integration.constants';

@Injectable()
export class SyncEngineService {
  private readonly logger = new Logger(SyncEngineService.name);

  constructor(
    @InjectRepository(SyncLog)
    private syncLogRepository: Repository<SyncLog>,
    @InjectRepository(IntegrationMapping)
    private mappingRepository: Repository<IntegrationMapping>,
    @InjectRepository(IntegrationConfig)
    private configRepository: Repository<IntegrationConfig>,
  ) {}

  /**
   * Create sync log
   */
  async createSyncLog(
    integrationConfigId: string,
    direction: SyncDirection,
    resourceType: string,
  ): Promise<SyncLog> {
    const syncLog = this.syncLogRepository.create({
      integrationConfigId,
      status: SyncStatus.IN_PROGRESS,
      direction,
      resourceType,
    });

    return this.syncLogRepository.save(syncLog);
  }

  /**
   * Update sync log
   */
  async updateSyncLog(
    syncLogId: string,
    updates: Partial<SyncLog>,
  ): Promise<SyncLog> {
    await this.syncLogRepository.update(syncLogId, updates);
    return this.syncLogRepository.findOne({ where: { id: syncLogId } });
  }

  /**
   * Complete sync log
   */
  async completeSyncLog(
    syncLogId: string,
    status: SyncStatus,
    itemsProcessed: number,
    itemsFailed: number,
    duration: number,
    errorMessage?: string,
  ): Promise<SyncLog> {
    const syncLog = await this.syncLogRepository.findOne({ where: { id: syncLogId } });
    syncLog.status = status;
    syncLog.itemsProcessed = itemsProcessed;
    syncLog.itemsFailed = itemsFailed;
    syncLog.durationMs = duration;
    syncLog.completedAt = new Date();
    if (errorMessage) {
      syncLog.errorMessage = errorMessage;
    }

    return this.syncLogRepository.save(syncLog);
  }

  /**
   * Get sync logs with pagination
   */
  async getSyncLogs(
    integrationConfigId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ data: SyncLog[]; total: number }> {
    const [data, total] = await this.syncLogRepository.findAndCount({
      where: { integrationConfigId },
      order: { startedAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    return { data, total };
  }

  /**
   * Create or update mapping
   */
  async upsertMapping(
    integrationConfigId: string,
    localResourceId: string,
    localResourceType: string,
    externalResourceId: string,
    externalResourceType: string,
    externalPlatform: string,
    mappingData?: any,
  ): Promise<IntegrationMapping> {
    const existing = await this.mappingRepository.findOne({
      where: {
        integrationConfigId,
        localResourceId,
      },
    });

    if (existing) {
      existing.externalResourceId = externalResourceId;
      existing.externalResourceType = externalResourceType;
      existing.mappingData = mappingData;
      existing.lastSyncAt = new Date();
      return this.mappingRepository.save(existing);
    }

    const mapping = this.mappingRepository.create({
      integrationConfigId,
      localResourceId,
      localResourceType,
      externalResourceId,
      externalResourceType,
      externalPlatform,
      mappingData,
    });

    return this.mappingRepository.save(mapping);
  }

  /**
   * Get mapping by local resource
   */
  async getMappingByLocalResource(
    integrationConfigId: string,
    localResourceId: string,
  ): Promise<IntegrationMapping> {
    return this.mappingRepository.findOne({
      where: { integrationConfigId, localResourceId },
    });
  }

  /**
   * Get mapping by external resource
   */
  async getMappingByExternalResource(
    integrationConfigId: string,
    externalResourceId: string,
  ): Promise<IntegrationMapping> {
    return this.mappingRepository.findOne({
      where: { integrationConfigId, externalResourceId },
    });
  }

  /**
   * Get all mappings for integration
   */
  async getMappings(
    integrationConfigId: string,
    resourceType?: string,
  ): Promise<IntegrationMapping[]> {
    const query = this.mappingRepository.createQueryBuilder('m')
      .where('m.integrationConfigId = :configId', { configId: integrationConfigId });

    if (resourceType) {
      query.andWhere('m.localResourceType = :resourceType', { resourceType });
    }

    return query.getMany();
  }

  /**
   * Delete mapping
   */
  async deleteMapping(mappingId: string): Promise<void> {
    await this.mappingRepository.delete(mappingId);
  }

  /**
   * Batch sync process
   */
  async batchSync(
    items: any[],
    processFn: (item: any) => Promise<any>,
    batchSize: number = INTEGRATION_CONSTANTS.SYNC.BATCH_SIZE,
  ): Promise<{ processed: number; failed: number; errors: any[] }> {
    let processed = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      for (const item of batch) {
        try {
          await processFn(item);
          processed++;
        } catch (error) {
          failed++;
          errors.push({
            item,
            error: error.message,
          });
          this.logger.error(`Failed to process item: ${error.message}`);
        }
      }
    }

    return { processed, failed, errors };
  }

  /**
   * Retry sync with exponential backoff
   */
  async retrySync(
    syncFn: () => Promise<any>,
    maxRetries: number = INTEGRATION_CONSTANTS.SYNC.MAX_RETRY_ATTEMPTS,
  ): Promise<any> {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await syncFn();
      } catch (error) {
        lastError = error;
        const delay = INTEGRATION_CONSTANTS.SYNC.RETRY_DELAY * Math.pow(2, attempt);
        this.logger.warn(
          `Sync attempt ${attempt + 1} failed, retrying in ${delay}ms: ${error.message}`,
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Check sync health
   */
  async checkSyncHealth(integrationConfigId: string): Promise<any> {
    const config = await this.configRepository.findOne({
      where: { id: integrationConfigId },
    });

    const logs = await this.syncLogRepository.find({
      where: { integrationConfigId },
      order: { startedAt: 'DESC' },
      take: 5,
    });

    const successCount = logs.filter(log => log.status === SyncStatus.SUCCESS).length;
    const failureCount = logs.filter(log => log.status === SyncStatus.FAILED).length;
    const totalItems = logs.reduce((sum, log) => sum + log.itemsProcessed, 0);
    const avgDuration = logs.length > 0
      ? logs.reduce((sum, log) => sum + (log.durationMs || 0), 0) / logs.length
      : 0;

    return {
      integrationId: integrationConfigId,
      status: config.status,
      isActive: config.isActive,
      lastSyncAt: config.lastSyncAt,
      lastSyncStatus: config.lastSyncStatus,
      recentSyncs: {
        total: logs.length,
        successful: successCount,
        failed: failureCount,
        successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 0,
      },
      statistics: {
        totalItemsProcessed: totalItems,
        averageDurationMs: Math.round(avgDuration),
      },
    };
  }

  /**
   * Trigger scheduled sync for integration
   */
  async triggerScheduledSync(integrationConfigId: string): Promise<any> {
    const config = await this.configRepository.findOne({
      where: { id: integrationConfigId },
    });

    if (!config || !config.isActive) {
      throw new Error('Integration not active');
    }

    // Update config
    config.lastSyncStatus = 'in_progress';
    await this.configRepository.save(config);

    return {
      integrationId: integrationConfigId,
      status: 'triggered',
      message: 'Sync scheduled for execution',
    };
  }
}
