import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConfig } from '../../common/entities/integration-config.entity';
import { SyncLog, SyncStatus, SyncDirection } from '../../common/entities/sync-log.entity';
import { IntegrationMapping } from '../../common/entities/integration-mapping.entity';
import { ZoomService } from './zoom.service';

@Injectable()
export class ZoomConfigService {
  private readonly logger = new Logger(ZoomConfigService.name);

  constructor(
    @InjectRepository(IntegrationConfig)
    private configRepository: Repository<IntegrationConfig>,
    @InjectRepository(SyncLog)
    private syncLogRepository: Repository<SyncLog>,
    @InjectRepository(IntegrationMapping)
    private mappingRepository: Repository<IntegrationMapping>,
    private zoomService: ZoomService,
  ) {}

  /**
   * Create Zoom integration config
   */
  async createZoomConfig(
    userId: string,
    accountId: string,
    clientId: string,
    clientSecret: string,
    webhookSecret?: string,
    webhookUrl?: string,
  ): Promise<IntegrationConfig> {
    const config = this.configRepository.create({
      userId,
      integrationType: 'zoom' as any,
      status: 'pending' as any,
      credentials: {
        accountId,
        clientId,
        clientSecret,
        webhookSecret,
        webhookUrl,
      },
      externalId: accountId,
      displayName: `Zoom Integration - ${accountId}`,
    });

    return this.configRepository.save(config);
  }

  /**
   * Get Zoom config
   */
  async getZoomConfig(configId: string, userId: string): Promise<IntegrationConfig> {
    return this.configRepository.findOne({
      where: { id: configId, userId },
    });
  }

  /**
   * Sync recordings from Zoom
   */
  async syncRecordings(
    configId: string,
    userId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<SyncLog> {
    const startTime = Date.now();
    const syncLog = this.syncLogRepository.create({
      integrationConfigId: configId,
      status: SyncStatus.IN_PROGRESS,
      direction: SyncDirection.PULL,
      resourceType: 'recording',
    });

    try {
      const config = await this.getZoomConfig(configId, userId);
      const accessToken = await this.zoomService.getAccessToken(
        config.credentials.accountId,
        config.credentials.clientId,
        config.credentials.clientSecret,
      );

      const savedLog = await this.syncLogRepository.save(syncLog);

      // Get recordings
      const recordings = await this.zoomService.getRecordings(
        accessToken,
        userId,
        fromDate,
        toDate,
      );

      // Map recordings
      let processedCount = 0;
      for (const recording of recordings) {
        try {
          await this.mappingRepository.upsert(
            {
              integrationConfigId: configId,
              localResourceId: recording.meeting_id,
              localResourceType: 'recording',
              externalResourceId: recording.recording_id,
              externalResourceType: 'recording',
              externalPlatform: 'zoom',
              mappingData: {
                recordingName: recording.recording_name,
                recordingUrl: recording.download_url,
                duration: recording.duration,
              },
            },
            ['integrationConfigId', 'localResourceId'],
          );
          processedCount++;
        } catch (error) {
          this.logger.error(`Failed to process recording: ${error.message}`);
        }
      }

      savedLog.status = SyncStatus.SUCCESS;
      savedLog.itemsProcessed = processedCount;
      savedLog.completedAt = new Date();
      savedLog.durationMs = Date.now() - startTime;
      return this.syncLogRepository.save(savedLog);
    } catch (error) {
      this.logger.error(`Recording sync failed: ${error.message}`);
      syncLog.status = SyncStatus.FAILED;
      syncLog.errorMessage = error.message;
      syncLog.completedAt = new Date();
      syncLog.durationMs = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Get sync history
   */
  async getSyncHistory(configId: string, limit: number = 20): Promise<SyncLog[]> {
    return this.syncLogRepository.find({
      where: { integrationConfigId: configId },
      order: { startedAt: 'DESC' },
      take: limit,
    });
  }
}
