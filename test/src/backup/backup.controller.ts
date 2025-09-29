/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

/**
 * BackupController handles endpoints for managing and retrieving backups.
 */
@ApiTags('backup')
@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('database')
  @ApiOperation({ summary: 'Create manual database backup' })
  @ApiResponse({ status: 201, description: 'Backup created successfully' })
  async createDatabaseBackup() {
    return await this.backupService.createDatabaseBackup();
  }

  @Post('application-data')
  @ApiOperation({ summary: 'Create manual application data backup' })
  @ApiResponse({
    status: 201,
    description: 'Application data backup created successfully',
  })
  async createApplicationDataBackup() {
    return await this.backupService.createApplicationDataBackup();
  }

  @Get('list')
  @ApiOperation({ summary: 'List all backups' })
  @ApiResponse({ status: 200, description: 'List of backup files' })
  async listBackups() {
    return await this.backupService.listBackups();
  }

  @Get('info/:filename')
  @ApiOperation({ summary: 'Get backup file info' })
  @ApiResponse({ status: 200, description: 'Backup file info' })
  async getBackupInfo(@Param('filename') filename: string) {
    return await this.backupService.getBackupInfo(filename);
  }
}
