import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConfig } from '../../common/entities/integration-config.entity';
import { SyncLog, SyncStatus, SyncDirection } from '../../common/entities/sync-log.entity';
import { IntegrationMapping } from '../../common/entities/integration-mapping.entity';
import { MicrosoftService } from './microsoft.service';

@Injectable()
export class MicrosoftConfigService {
  private readonly logger = new Logger(MicrosoftConfigService.name);

  constructor(
    @InjectRepository(IntegrationConfig)
    private configRepository: Repository<IntegrationConfig>,
    @InjectRepository(SyncLog)
    private syncLogRepository: Repository<SyncLog>,
    @InjectRepository(IntegrationMapping)
    private mappingRepository: Repository<IntegrationMapping>,
    private microsoftService: MicrosoftService,
  ) {}

  /**
   * Create Microsoft integration config
   */
  async createMicrosoftConfig(
    userId: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    redirectUri: string,
    refreshToken?: string,
  ): Promise<IntegrationConfig> {
    const config = this.configRepository.create({
      userId,
      integrationType: 'microsoft' as any,
      status: 'pending' as any,
      credentials: {
        clientId,
        clientSecret,
        tenantId,
        redirectUri,
        refreshToken,
      },
      displayName: 'Microsoft Teams Integration',
    });

    return this.configRepository.save(config);
  }

  /**
   * Get Microsoft config
   */
  async getMicrosoftConfig(configId: string, userId: string): Promise<IntegrationConfig> {
    return this.configRepository.findOne({
      where: { id: configId, userId },
    });
  }

  /**
   * Sync teams from Microsoft Graph
   */
  async syncTeams(
    configId: string,
    userId: string,
  ): Promise<SyncLog> {
    const startTime = Date.now();
    const syncLog = this.syncLogRepository.create({
      integrationConfigId: configId,
      status: SyncStatus.IN_PROGRESS,
      direction: SyncDirection.PULL,
      resourceType: 'team',
    });

    try {
      const config = await this.getMicrosoftConfig(configId, userId);
      const accessToken = await this.microsoftService.getAccessToken(
        config.credentials.clientId,
        config.credentials.clientSecret,
        config.credentials.tenantId,
        config.credentials.refreshToken,
      );

      const savedLog = await this.syncLogRepository.save(syncLog);

      // Fetch teams
      const teams = await this.microsoftService.getTeams(accessToken);

      let processedCount = 0;
      for (const team of teams) {
        try {
          await this.mappingRepository.upsert(
            {
              integrationConfigId: configId,
              localResourceId: team.id,
              localResourceType: 'team',
              externalResourceId: team.id,
              externalResourceType: 'team',
              externalPlatform: 'microsoft_teams',
              mappingData: {
                displayName: team.displayName,
                description: team.description,
              },
            },
            ['integrationConfigId', 'localResourceId'],
          );
          processedCount++;
        } catch (error) {
          this.logger.error(`Failed to process team: ${error.message}`);
        }
      }

      savedLog.status = SyncStatus.SUCCESS;
      savedLog.itemsProcessed = processedCount;
      savedLog.completedAt = new Date();
      savedLog.durationMs = Date.now() - startTime;
      return this.syncLogRepository.save(savedLog);
    } catch (error) {
      this.logger.error(`Team sync failed: ${error.message}`);
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
