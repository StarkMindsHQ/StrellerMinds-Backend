import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConfig } from '../../common/entities/integration-config.entity';
import { SyncLog, SyncStatus, SyncDirection } from '../../common/entities/sync-log.entity';
import { IntegrationMapping } from '../../common/entities/integration-mapping.entity';
import { LtiService } from './lti.service';

@Injectable()
export class LtiConfigService {
  private readonly logger = new Logger(LtiConfigService.name);

  constructor(
    @InjectRepository(IntegrationConfig)
    private configRepository: Repository<IntegrationConfig>,
    @InjectRepository(SyncLog)
    private syncLogRepository: Repository<SyncLog>,
    @InjectRepository(IntegrationMapping)
    private mappingRepository: Repository<IntegrationMapping>,
    private ltiService: LtiService,
  ) {}

  /**
   * Create LTI integration config
   */
  async createLtiConfig(
    userId: string,
    platformUrl: string,
    clientId: string,
    clientSecret: string,
    kid: string,
    publicKey: string,
    metadata?: Record<string, any>,
  ): Promise<IntegrationConfig> {
    const config = this.configRepository.create({
      userId,
      integrationType: 'lti' as any,
      status: 'pending' as any,
      credentials: {
        platformUrl,
        clientId,
        clientSecret,
        kid,
        publicKey,
      },
      metadata,
      displayName: `LTI Integration - ${clientId}`,
    });

    return this.configRepository.save(config);
  }

  /**
   * Get LTI config by ID
   */
  async getLtiConfig(configId: string, userId: string): Promise<IntegrationConfig> {
    return this.configRepository.findOne({
      where: { id: configId, userId },
    });
  }

  /**
   * Update LTI config
   */
  async updateLtiConfig(
    configId: string,
    userId: string,
    updates: Partial<IntegrationConfig>,
  ): Promise<IntegrationConfig> {
    await this.configRepository.update({ id: configId, userId }, updates);
    return this.getLtiConfig(configId, userId);
  }

  /**
   * Activate LTI config
   */
  async activateLtiConfig(configId: string, userId: string): Promise<IntegrationConfig> {
    return this.updateLtiConfig(configId, userId, {
      status: 'active' as any,
      isActive: true,
    });
  }

  /**
   * Deactivate LTI config
   */
  async deactivateLtiConfig(configId: string, userId: string): Promise<IntegrationConfig> {
    return this.updateLtiConfig(configId, userId, {
      status: 'inactive' as any,
      isActive: false,
    });
  }

  /**
   * Sync LTI memberships
   */
  async syncMemberships(configId: string, contextId: string, accessToken: string): Promise<any> {
    const startTime = Date.now();
    const syncLog = this.syncLogRepository.create({
      integrationConfigId: configId,
      status: SyncStatus.IN_PROGRESS,
      direction: SyncDirection.PULL,
      resourceType: 'membership',
    });

    try {
      const savedLog = await this.syncLogRepository.save(syncLog);

      // Fetch members from LTI platform
      const members = await this.ltiService.getMembers(accessToken, contextId);

      // Process and map members
      let processedCount = 0;
      for (const member of members) {
        try {
          const mappedUser = this.ltiService.mapLtiUser(member.user_id);

          // Create mapping
          await this.mappingRepository.upsert(
            {
              integrationConfigId: configId,
              localResourceId: mappedUser.externalId,
              localResourceType: 'user',
              externalResourceId: member.user_id,
              externalResourceType: 'user',
              externalPlatform: 'lti',
              mappingData: mappedUser,
            },
            ['integrationConfigId', 'localResourceId'],
          );
          processedCount++;
        } catch (error) {
          this.logger.error(`Failed to process member: ${error.message}`);
        }
      }

      // Update sync log
      savedLog.status = SyncStatus.SUCCESS;
      savedLog.itemsProcessed = processedCount;
      savedLog.completedAt = new Date();
      savedLog.durationMs = Date.now() - startTime;
      await this.syncLogRepository.save(savedLog);

      return savedLog;
    } catch (error) {
      this.logger.error(`Membership sync failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync grades from LTI platform
   */
  async syncGrades(configId: string, lineItemId: string, accessToken: string): Promise<any> {
    const startTime = Date.now();
    const syncLog = this.syncLogRepository.create({
      integrationConfigId: configId,
      status: SyncStatus.IN_PROGRESS,
      direction: SyncDirection.PULL,
      resourceType: 'grade',
    });

    try {
      const savedLog = await this.syncLogRepository.save(syncLog);

      // Fetch results from LTI
      const results = await this.ltiService.fetchResults(accessToken, lineItemId);

      savedLog.status = SyncStatus.SUCCESS;
      savedLog.itemsProcessed = results.length || 0;
      savedLog.completedAt = new Date();
      savedLog.durationMs = Date.now() - startTime;
      await this.syncLogRepository.save(savedLog);

      return savedLog;
    } catch (error) {
      this.logger.error(`Grade sync failed: ${error.message}`);
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
