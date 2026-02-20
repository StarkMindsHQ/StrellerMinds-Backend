import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SyncEngineService } from '../services/sync-engine.service';

@Controller('integrations/sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private syncEngineService: SyncEngineService) {}

  /**
   * Get sync history
   */
  @Get('history/:configId')
  async getSyncHistory(
    @Param('configId') configId: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    const result = await this.syncEngineService.getSyncLogs(configId, limit, offset);

    return {
      success: true,
      data: result.data,
      pagination: {
        limit,
        offset,
        total: result.total,
      },
    };
  }

  /**
   * Get sync log detail
   */
  @Get('log/:logId')
  async getSyncLogDetail(@Param('logId') logId: string) {
    // Implementation would fetch from database
    return {
      success: true,
      data: { id: logId },
    };
  }

  /**
   * Get integration mappings
   */
  @Get('mappings/:configId')
  async getMappings(
    @Param('configId') configId: string,
    @Query('resourceType') resourceType?: string,
  ) {
    const mappings = await this.syncEngineService.getMappings(configId, resourceType);

    return {
      success: true,
      data: mappings,
    };
  }

  /**
   * Get mapping detail
   */
  @Get('mappings/:configId/:localResourceId')
  async getMappingDetail(
    @Param('configId') configId: string,
    @Param('localResourceId') localResourceId: string,
  ) {
    const mapping = await this.syncEngineService.getMappingByLocalResource(
      configId,
      localResourceId,
    );

    if (!mapping) {
      throw new NotFoundException('Mapping not found');
    }

    return {
      success: true,
      data: mapping,
    };
  }

  /**
   * Check sync health
   */
  @Get('health/:configId')
  async checkSyncHealth(@Param('configId') configId: string) {
    const health = await this.syncEngineService.checkSyncHealth(configId);

    return {
      success: true,
      data: health,
    };
  }

  /**
   * Trigger manual sync
   */
  @Post('trigger/:configId')
  async triggerSync(@CurrentUser() user: any, @Param('configId') configId: string) {
    try {
      const result = await this.syncEngineService.triggerScheduledSync(configId);

      return {
        success: true,
        data: result,
        message: 'Sync triggered successfully',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to trigger sync: ${error.message}`);
    }
  }

  /**
   * Get sync statistics
   */
  @Get('stats/:configId')
  async getSyncStats(@Param('configId') configId: string, @Query('days') days: number = 7) {
    // Would fetch sync logs and calculate statistics
    const health = await this.syncEngineService.checkSyncHealth(configId);

    return {
      success: true,
      data: {
        ...health.statistics,
        ...health.recentSyncs,
        period: `Last ${days} days`,
      },
    };
  }
}
