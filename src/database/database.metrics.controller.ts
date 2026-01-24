import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DatabaseMonitorService } from './database.monitor.service';
import { BackupService } from './backup/backup.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@ApiTags('Database Management')
@Controller('api/database')
@UseGuards(JwtAuthGuard)
export class DatabaseMetricsController {
    constructor(
        private readonly monitorService: DatabaseMonitorService,
        private readonly backupService: BackupService,
    ) { }

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
    async createBackup(
        @Query('compress') compress?: boolean,
        @Query('verify') verify?: boolean,
    ) {
        return this.backupService.createBackup({
            compress: compress === true || compress === 'true' as any,
            verify: verify === true || verify === 'true' as any,
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
