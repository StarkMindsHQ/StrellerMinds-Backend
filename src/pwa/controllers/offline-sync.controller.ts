import { Controller, Post, Get, Put, Param, Query, ValidationPipe, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import type { OfflineSyncService, CreateSyncJobDto } from '../services/offline-sync.service';
import type { BackgroundSyncService } from '../services/background-sync.service';

@ApiTags('Offline Sync')
@Controller('pwa/sync')
export class OfflineSyncController {
  constructor(
    private readonly offlineSyncService: OfflineSyncService,
    private readonly backgroundSyncService: BackgroundSyncService,
  ) {}

  @Post('job')
  @ApiOperation({ summary: 'Create offline sync job' })
  @ApiResponse({ status: 201, description: 'Sync job created successfully' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createSyncJob(dto: CreateSyncJobDto) {
    const job = await this.offlineSyncService.createSyncJob(dto);
    return {
      success: true,
      data: job,
      message: 'Sync job created successfully',
    };
  }

  @Post('jobs/batch')
  @ApiOperation({ summary: 'Create multiple offline sync jobs' })
  @ApiResponse({ status: 201, description: 'Sync jobs created successfully' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createBatchSyncJobs(jobs: CreateSyncJobDto[]) {
    const createdJobs = await this.offlineSyncService.batchCreateSyncJobs(jobs);
    return {
      success: true,
      data: createdJobs,
      message: `${createdJobs.length} sync jobs created successfully`,
    };
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get offline sync jobs' })
  @ApiResponse({ status: 200, description: 'Sync jobs retrieved successfully' })
  async getSyncJobs(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const filters = {
      userId,
      status: status as any,
      entityType,
      limit: limit ? Number.parseInt(limit.toString()) : undefined,
      offset: offset ? Number.parseInt(offset.toString()) : undefined,
    };

    const result = await this.offlineSyncService.getSyncJobs(filters);
    return {
      success: true,
      data: result,
    };
  }

  @Get('jobs/pending')
  @ApiOperation({ summary: 'Get pending sync jobs' })
  @ApiResponse({ status: 200, description: 'Pending sync jobs retrieved successfully' })
  async getPendingSyncJobs(@Query('limit') limit?: number) {
    const jobs = await this.offlineSyncService.getPendingSyncJobs(
      limit ? Number.parseInt(limit.toString()) : undefined,
    );
    return {
      success: true,
      data: jobs,
    };
  }

  @Put('job/:id/status')
  @ApiOperation({ summary: 'Update sync job status' })
  @ApiResponse({ status: 200, description: 'Sync job status updated successfully' })
  async updateSyncJobStatus(
    @Param('id') id: string,
    body: { status: string; result?: any; errorMessage?: string },
  ) {
    await this.offlineSyncService.updateSyncJobStatus(
      id,
      body.status as any,
      body.result,
      body.errorMessage,
    );
    return {
      success: true,
      message: 'Sync job status updated successfully',
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get offline sync statistics' })
  @ApiResponse({ status: 200, description: 'Sync statistics retrieved successfully' })
  async getSyncStats() {
    const stats = await this.offlineSyncService.getSyncStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('background/stats')
  @ApiOperation({ summary: 'Get background sync statistics' })
  @ApiResponse({ status: 200, description: 'Background sync statistics retrieved successfully' })
  async getBackgroundSyncStats() {
    const stats = await this.backgroundSyncService.getBackgroundSyncStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Cleanup old sync jobs' })
  @ApiResponse({ status: 200, description: 'Old sync jobs cleaned up successfully' })
  async cleanupOldJobs(body: { olderThanDays?: number }) {
    const cleaned = await this.offlineSyncService.cleanupOldJobs(body.olderThanDays || 30);
    return {
      success: true,
      data: { cleaned },
      message: `${cleaned} old sync jobs cleaned up successfully`,
    };
  }
}
