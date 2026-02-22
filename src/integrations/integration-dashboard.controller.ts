import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConfig } from './common/entities/integration-config.entity';
import { SyncLog } from './common/entities/sync-log.entity';
import { IntegrationMapping } from './common/entities/integration-mapping.entity';
import { SyncEngineService } from './sync/services/sync-engine.service';
import { RequestUser } from '../common/types/request.types';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationDashboardController {
  constructor(
    @InjectRepository(IntegrationConfig)
    private configRepository: Repository<IntegrationConfig>,
    @InjectRepository(SyncLog)
    private syncLogRepository: Repository<SyncLog>,
    @InjectRepository(IntegrationMapping)
    private mappingRepository: Repository<IntegrationMapping>,
    private syncEngineService: SyncEngineService,
  ) {}

  /**
   * Get all integrations for current user
   */
  @Get()
  async listIntegrations(
    @CurrentUser() user: RequestUser,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    const query = this.configRepository
      .createQueryBuilder('ic')
      .where('ic.userId = :userId', { userId: user.sub });

    if (type) {
      query.andWhere('ic.integrationType = :type', { type });
    }

    if (status) {
      query.andWhere('ic.status = :status', { status });
    }

    const integrations = await query.orderBy('ic.createdAt', 'DESC').getMany();

    return {
      success: true,
      data: integrations.map((i) => this.sanitizeCredentials(i)),
    };
  }

  /**
   * Get integration details
   */
  @Get(':configId')
  async getIntegration(@CurrentUser() user: RequestUser, @Param('configId') configId: string) {
    const config = await this.configRepository.findOne({
      where: { id: configId, userId: user.sub },
    });

    if (!config) {
      throw new NotFoundException('Integration not found');
    }

    return {
      success: true,
      data: this.sanitizeCredentials(config),
    };
  }

  /**
   * Get integration statistics
   */
  @Get(':configId/stats')
  async getIntegrationStats(
    @CurrentUser() user: RequestUser,
    @Param('configId') configId: string,
    @Query('days') days: number = 30,
  ) {
    const config = await this.configRepository.findOne({
      where: { id: configId, userId: user.sub },
    });

    if (!config) {
      throw new NotFoundException('Integration not found');
    }

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [syncLogs, mappingCount] = await Promise.all([
      this.syncLogRepository.find({
        where: {
          integrationConfigId: configId,
          startedAt: startDate,
        },
        order: { startedAt: 'DESC' },
      }),
      this.mappingRepository.count({
        where: { integrationConfigId: configId },
      }),
    ]);

    const successCount = syncLogs.filter((l) => l.status === 'success').length;
    const failureCount = syncLogs.filter((l) => l.status === 'failed').length;
    const totalItems = syncLogs.reduce((sum, l) => sum + l.itemsProcessed, 0);
    const totalErrors = syncLogs.reduce((sum, l) => sum + l.itemsFailed, 0);
    const avgDuration =
      syncLogs.length > 0
        ? syncLogs.reduce((sum, l) => sum + (l.durationMs || 0), 0) / syncLogs.length
        : 0;

    return {
      success: true,
      data: {
        integrationId: configId,
        period: `Last ${days} days`,
        syncStatistics: {
          totalSyncs: syncLogs.length,
          successfulSyncs: successCount,
          failedSyncs: failureCount,
          successRate: syncLogs.length > 0 ? (successCount / syncLogs.length) * 100 : 0,
          totalItemsProcessed: totalItems,
          totalErrors,
          averageDurationMs: Math.round(avgDuration),
        },
        resourceStatistics: {
          totalMappings: mappingCount,
          resourceTypes: await this.getResourceTypeCounts(configId),
        },
        lastSync: syncLogs.length > 0 ? syncLogs[0] : null,
      },
    };
  }

  /**
   * Update integration config
   */
  @Put(':configId')
  async updateIntegration(
    @CurrentUser() user: RequestUser,
    @Param('configId') configId: string,
    @Body() updates: any,
  ) {
    const config = await this.configRepository.findOne({
      where: { id: configId, userId: user.sub },
    });

    if (!config) {
      throw new NotFoundException('Integration not found');
    }

    Object.assign(config, {
      ...updates,
      updatedAt: new Date(),
    });

    const updated = await this.configRepository.save(config);

    return {
      success: true,
      data: this.sanitizeCredentials(updated),
      message: 'Integration updated successfully',
    };
  }

  /**
   * Activate integration
   */
  @Post(':configId/activate')
  async activateIntegration(@CurrentUser() user: RequestUser, @Param('configId') configId: string) {
    const config = await this.configRepository.findOne({
      where: { id: configId, userId: user.sub },
    });

    if (!config) {
      throw new NotFoundException('Integration not found');
    }

    config.isActive = true;
    config.status = 'active' as any;
    const updated = await this.configRepository.save(config);

    return {
      success: true,
      data: this.sanitizeCredentials(updated),
      message: 'Integration activated',
    };
  }

  /**
   * Deactivate integration
   */
  @Post(':configId/deactivate')
  async deactivateIntegration(@CurrentUser() user: RequestUser, @Param('configId') configId: string) {
    const config = await this.configRepository.findOne({
      where: { id: configId, userId: user.sub },
    });

    if (!config) {
      throw new NotFoundException('Integration not found');
    }

    config.isActive = false;
    config.status = 'inactive' as any;
    const updated = await this.configRepository.save(config);

    return {
      success: true,
      data: this.sanitizeCredentials(updated),
      message: 'Integration deactivated',
    };
  }

  /**
   * Delete integration
   */
  @Delete(':configId')
  async deleteIntegration(@CurrentUser() user: RequestUser, @Param('configId') configId: string) {
    const config = await this.configRepository.findOne({
      where: { id: configId, userId: user.sub },
    });

    if (!config) {
      throw new NotFoundException('Integration not found');
    }

    await this.configRepository.remove(config);

    return {
      success: true,
      message: 'Integration deleted successfully',
    };
  }

  /**
   * Get integration health/status
   */
  @Get(':configId/health')
  async getIntegrationHealth(@CurrentUser() user: RequestUser, @Param('configId') configId: string) {
    const config = await this.configRepository.findOne({
      where: { id: configId, userId: user.sub },
    });

    if (!config) {
      throw new NotFoundException('Integration not found');
    }

    const health = await this.syncEngineService.checkSyncHealth(configId);

    return {
      success: true,
      data: health,
    };
  }

  /**
   * Get dashboard overview
   */
  @Get('dashboard/overview')
  async getDashboardOverview(@CurrentUser() user: RequestUser) {
    const configs = await this.configRepository.find({
      where: { userId: user.sub },
    });

    const activeCount = configs.filter((c) => c.isActive).length;
    const inactiveCount = configs.filter((c) => !c.isActive).length;
    const configIds = configs.map((c) => c.id);
    const totalMappings = await this.mappingRepository.count({
      where: {
        integrationConfigId: configIds.length > 0 ? ({ $in: configIds } as any) : '',
      },
    });

    const recentSyncs = await this.syncLogRepository
      .createQueryBuilder('sync')
      .where('sync.integrationConfigId IN (:...configIds)', {
        configIds: configIds.length > 0 ? configIds : [''],
      })
      .orderBy('sync.startedAt', 'DESC')
      .take(10)
      .getMany();

    const integrationsByType = {};
    for (const config of configs) {
      if (!integrationsByType[config.integrationType]) {
        integrationsByType[config.integrationType] = 0;
      }
      integrationsByType[config.integrationType]++;
    }

    return {
      success: true,
      data: {
        totalIntegrations: configs.length,
        activeIntegrations: activeCount,
        inactiveIntegrations: inactiveCount,
        totalMappings,
        recentSyncs: recentSyncs.slice(0, 5),
        integrationsByType,
      },
    };
  }

  // Helper methods

  private sanitizeCredentials(config: IntegrationConfig): any {
    const sanitized = { ...config };
    if (sanitized.credentials) {
      const sensitiveFields = [
        'password',
        'secret',
        'token',
        'apiKey',
        'refreshToken',
        'clientSecret',
        'webhookSecret',
      ];
      const creds = { ...sanitized.credentials };
      for (const field of sensitiveFields) {
        if (creds[field]) {
          creds[field] = '***';
        }
      }
      sanitized.credentials = creds;
    }
    return sanitized;
  }

  private async getResourceTypeCounts(configId: string): Promise<any> {
    const query = await this.mappingRepository
      .createQueryBuilder('m')
      .select('m.localResourceType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('m.integrationConfigId = :configId', { configId })
      .groupBy('m.localResourceType')
      .getRawMany();

    return query.reduce((acc, row) => {
      acc[row.type] = parseInt(row.count);
      return acc;
    }, {});
  }
}
