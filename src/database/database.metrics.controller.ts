import { Controller, Get, Post, Query, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { DatabaseMonitorService } from './database.monitor.service';
import { DynamicPoolSizingService } from './dynamic-pool-sizing.service';
import { BackupService } from './backup/backup.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@ApiTags('Database Management')
@Controller('api/database')
@UseGuards(JwtAuthGuard)
export class DatabaseMetricsController {
  constructor(
    private readonly monitorService: DatabaseMonitorService,
    private readonly dynamicPoolSizingService: DynamicPoolSizingService,
    private readonly backupService: BackupService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get database metrics' })
  @ApiResponse({ status: 200, description: 'Database metrics retrieved successfully' })
  async getMetrics() {
    return this.monitorService.getMetrics();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check database health' })
  @ApiResponse({ status: 200, description: 'Database health check completed' })
  async checkHealth() {
    return this.monitorService.checkHealth();
  }

  @Get('slow-queries')
  @ApiOperation({ summary: 'Get slow queries' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Slow queries retrieved successfully' })
  async getSlowQueries(@Query('limit') limit?: number) {
    return {
      queries: this.monitorService.getSlowQueries(limit ? parseInt(limit.toString()) : 20),
    };
  }

  @Get('index-usage')
  @ApiOperation({ summary: 'Get index usage statistics' })
  @ApiResponse({ status: 200, description: 'Index usage statistics retrieved successfully' })
  async getIndexUsage() {
    return this.monitorService.getIndexUsage();
  }

  @Get('unused-indexes')
  @ApiOperation({ summary: 'Get unused indexes' })
  @ApiResponse({ status: 200, description: 'Unused indexes retrieved successfully' })
  async getUnusedIndexes() {
    return this.monitorService.getUnusedIndexes();
  }

  @Get('health/history')
  @ApiOperation({ summary: 'Get health check history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Health check history retrieved successfully' })
  async getHealthHistory(@Query('limit') limit?: number) {
    return {
      history: this.monitorService.getHealthCheckHistory(limit ? parseInt(limit.toString()) : 50),
    };
  }

  @Get('pool/recommendations')
  @ApiOperation({ summary: 'Get pool optimization recommendations' })
  @ApiResponse({ status: 200, description: 'Pool recommendations retrieved successfully' })
  async getPoolRecommendations() {
    return {
      recommendations: this.monitorService.getPoolRecommendations(),
    };
  }

  @Get('pool/sizing')
  @ApiOperation({ summary: 'Get dynamic pool sizing analysis' })
  @ApiResponse({ status: 200, description: 'Pool sizing analysis completed' })
  async getPoolSizing() {
    return this.dynamicPoolSizingService.analyzePoolSizing();
  }

  @Get('pool/sizing/history')
  @ApiOperation({ summary: 'Get pool sizing history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Pool sizing history retrieved successfully' })
  async getPoolSizingHistory(@Query('limit') limit?: number) {
    return {
      history: this.dynamicPoolSizingService.getSizingHistory(limit ? parseInt(limit.toString()) : 20),
    };
  }

  @Get('pool/sizing/statistics')
  @ApiOperation({ summary: 'Get pool sizing statistics' })
  @ApiResponse({ status: 200, description: 'Pool sizing statistics retrieved successfully' })
  async getPoolSizingStatistics() {
    return this.dynamicPoolSizingService.getSizingStatistics();
  }

  @Post('pool/adjust')
  @ApiOperation({ summary: 'Apply automatic pool size adjustment' })
  @ApiResponse({ status: 200, description: 'Pool adjustment processed' })
  async applyPoolAdjustment() {
    return this.dynamicPoolSizingService.applyPoolAdjustment();
  }

  @Post('pool/override')
  @ApiOperation({ summary: 'Manually override pool size' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        min: { type: 'number', minimum: 1, description: 'Minimum pool size' },
        max: { type: 'number', minimum: 1, maximum: 100, description: 'Maximum pool size' },
        reason: { type: 'string', description: 'Reason for override' },
      },
      required: ['min', 'max', 'reason'],
    },
  })
  @ApiResponse({ status: 200, description: 'Pool override processed' })
  async overridePoolSize(@Body() body: { min: number; max: number; reason: string }) {
    return this.dynamicPoolSizingService.overridePoolSize(body.min, body.max, body.reason);
  }

  @Post('metrics/reset')
  @ApiOperation({ summary: 'Reset database metrics' })
  @ApiResponse({ status: 200, description: 'Metrics reset successfully' })
  async resetMetrics() {
    this.monitorService.resetMetrics();
    return {
      message: 'Database metrics reset successfully',
    };
  }

  @Get('backups')
  @ApiOperation({ summary: 'List available backups' })
  @ApiResponse({ status: 200, description: 'Backups listed successfully' })
  async listBackups() {
    return this.backupService.listBackups();
  }

  @Post('backup')
  @ApiOperation({ summary: 'Create database backup' })
  @ApiQuery({ name: 'compress', required: false, type: Boolean })
  @ApiQuery({ name: 'verify', required: false, type: Boolean })
  @ApiResponse({ status: 201, description: 'Backup created successfully' })
  async createBackup(@Query('compress') compress?: boolean, @Query('verify') verify?: boolean) {
    return this.backupService.createBackup({
      compress: compress === true || compress === ('true' as any),
      verify: verify === true || verify === ('true' as any),
    });
  }

  @Post('restore')
  @ApiOperation({ summary: 'Restore database from backup' })
  @ApiQuery({ name: 'filename', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Database restored successfully' })
  async restoreBackup(@Query('filename') filename: string) {
    const success = await this.backupService.restoreBackup(filename);
    return {
      success,
      message: success ? 'Database restored successfully' : 'Restore failed',
    };
  }
}
