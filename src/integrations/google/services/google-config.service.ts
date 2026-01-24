import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConfig } from '../../common/entities/integration-config.entity';
import { SyncLog, SyncStatus, SyncDirection } from '../../common/entities/sync-log.entity';
import { IntegrationMapping } from '../../common/entities/integration-mapping.entity';
import { GoogleService } from './google.service';

@Injectable()
export class GoogleConfigService {
  private readonly logger = new Logger(GoogleConfigService.name);

  constructor(
    @InjectRepository(IntegrationConfig)
    private configRepository: Repository<IntegrationConfig>,
    @InjectRepository(SyncLog)
    private syncLogRepository: Repository<SyncLog>,
    @InjectRepository(IntegrationMapping)
    private mappingRepository: Repository<IntegrationMapping>,
    private googleService: GoogleService,
  ) {}

  /**
   * Create Google integration config
   */
  async createGoogleConfig(
    userId: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    refreshToken?: string,
  ): Promise<IntegrationConfig> {
    const config = this.configRepository.create({
      userId,
      integrationType: 'google' as any,
      status: 'pending' as any,
      credentials: {
        clientId,
        clientSecret,
        redirectUri,
        refreshToken,
      },
      displayName: 'Google Classroom Integration',
    });

    return this.configRepository.save(config);
  }

  /**
   * Get Google config
   */
  async getGoogleConfig(configId: string, userId: string): Promise<IntegrationConfig> {
    return this.configRepository.findOne({
      where: { id: configId, userId },
    });
  }

  /**
   * Sync courses from Google Classroom
   */
  async syncCourses(
    configId: string,
    userId: string,
  ): Promise<SyncLog> {
    const startTime = Date.now();
    const syncLog = this.syncLogRepository.create({
      integrationConfigId: configId,
      status: SyncStatus.IN_PROGRESS,
      direction: SyncDirection.PULL,
      resourceType: 'course',
    });

    try {
      const config = await this.getGoogleConfig(configId, userId);
      const accessToken = await this.googleService.getAccessToken(
        config.credentials.clientId,
        config.credentials.clientSecret,
        config.credentials.refreshToken,
      );

      const savedLog = await this.syncLogRepository.save(syncLog);

      // Fetch courses
      const courses = await this.googleService.getCourses(accessToken);

      // Map courses
      let processedCount = 0;
      for (const course of courses) {
        try {
          await this.mappingRepository.upsert(
            {
              integrationConfigId: configId,
              localResourceId: course.id,
              localResourceType: 'course',
              externalResourceId: course.id,
              externalResourceType: 'course',
              externalPlatform: 'google_classroom',
              mappingData: {
                name: course.name,
                section: course.section,
                description: course.description,
              },
            },
            ['integrationConfigId', 'localResourceId'],
          );
          processedCount++;
        } catch (error) {
          this.logger.error(`Failed to process course: ${error.message}`);
        }
      }

      savedLog.status = SyncStatus.SUCCESS;
      savedLog.itemsProcessed = processedCount;
      savedLog.completedAt = new Date();
      savedLog.durationMs = Date.now() - startTime;
      return this.syncLogRepository.save(savedLog);
    } catch (error) {
      this.logger.error(`Course sync failed: ${error.message}`);
      syncLog.status = SyncStatus.FAILED;
      syncLog.errorMessage = error.message;
      syncLog.completedAt = new Date();
      syncLog.durationMs = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Sync assignments from Google Classroom
   */
  async syncAssignments(
    configId: string,
    userId: string,
    courseId: string,
  ): Promise<SyncLog> {
    const startTime = Date.now();
    const syncLog = this.syncLogRepository.create({
      integrationConfigId: configId,
      status: SyncStatus.IN_PROGRESS,
      direction: SyncDirection.PULL,
      resourceType: 'assignment',
    });

    try {
      const config = await this.getGoogleConfig(configId, userId);
      const accessToken = await this.googleService.getAccessToken(
        config.credentials.clientId,
        config.credentials.clientSecret,
        config.credentials.refreshToken,
      );

      const savedLog = await this.syncLogRepository.save(syncLog);

      // Fetch assignments
      const assignments = await this.googleService.getCourseWork(accessToken, courseId);

      let processedCount = 0;
      for (const assignment of assignments) {
        try {
          await this.mappingRepository.upsert(
            {
              integrationConfigId: configId,
              localResourceId: assignment.id,
              localResourceType: 'assignment',
              externalResourceId: assignment.id,
              externalResourceType: 'assignment',
              externalPlatform: 'google_classroom',
              mappingData: {
                courseId,
                title: assignment.title,
                description: assignment.description,
                maxPoints: assignment.maxPoints,
              },
            },
            ['integrationConfigId', 'localResourceId'],
          );
          processedCount++;
        } catch (error) {
          this.logger.error(`Failed to process assignment: ${error.message}`);
        }
      }

      savedLog.status = SyncStatus.SUCCESS;
      savedLog.itemsProcessed = processedCount;
      savedLog.completedAt = new Date();
      savedLog.durationMs = Date.now() - startTime;
      return this.syncLogRepository.save(savedLog);
    } catch (error) {
      this.logger.error(`Assignment sync failed: ${error.message}`);
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
