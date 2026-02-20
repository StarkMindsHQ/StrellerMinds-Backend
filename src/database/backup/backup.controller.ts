import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles } from '../../auth/guards/auth.guard';
import { UserRole } from '../../auth/entities/user.entity';
import { BackupService } from './backup.service';
import { BackupSchedulerService } from './backup-scheduler.service';
import { BackupRecoveryService } from './backup-recovery.service';
import { BackupMetricsService } from './backup-metrics.service';
import { BackupMonitoringService } from './backup-monitoring.service';
import { RecoveryVerificationService } from './recovery-verification.service';
import {
  CreateBackupDto,
  RestoreBackupDto,
  CreateBackupScheduleDto,
  UpdateBackupScheduleDto,
} from './dto';
import { BackupRecord, BackupType, BackupStatus, RetentionTier } from './entities';

@ApiTags('Backup & Recovery')
@Controller('api/backups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class BackupController {
  constructor(
    private readonly backupService: BackupService,
    private readonly schedulerService: BackupSchedulerService,
    private readonly recoveryService: BackupRecoveryService,
    private readonly metricsService: BackupMetricsService,
    private readonly monitoringService: BackupMonitoringService,
    private readonly verificationService: RecoveryVerificationService,
  ) {}

  // === Backup Operations ===

  @Post()
  @ApiOperation({ summary: 'Create a new backup' })
  @ApiResponse({ status: 201, description: 'Backup initiated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async createBackup(@Body() dto: CreateBackupDto) {
    return this.backupService.createEnhancedBackup({
      backupType: dto.type,
      compress: dto.compress,
      encrypt: dto.encrypt,
      verify: dto.verify,
      uploadToS3: dto.uploadToCloud,
      replicateCrossRegion: dto.replicateCrossRegion,
      retentionTier: dto.retentionTier,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List all backups' })
  @ApiQuery({ name: 'type', required: false, enum: BackupType })
  @ApiQuery({ name: 'status', required: false, enum: BackupStatus })
  @ApiQuery({ name: 'tier', required: false, enum: RetentionTier })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Backups retrieved successfully' })
  async listBackups(
    @Query('type') type?: BackupType,
    @Query('status') status?: BackupStatus,
    @Query('tier') tier?: RetentionTier,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.backupService.listBackupRecords({
      type,
      status,
      tier,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get backup statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getBackupStats() {
    return this.backupService.getBackupStats();
  }

  @Get('recoverable')
  @ApiOperation({ summary: 'List backups available for recovery' })
  @ApiResponse({ status: 200, description: 'Recoverable backups retrieved' })
  async listRecoverableBackups() {
    return this.recoveryService.listRecoverableBackups();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get backup details by ID' })
  @ApiParam({ name: 'id', description: 'Backup ID' })
  @ApiResponse({ status: 200, description: 'Backup details retrieved' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async getBackup(@Param('id', ParseUUIDPipe) id: string) {
    const backup = await this.backupService.getBackupById(id);
    if (!backup) {
      return { error: 'Backup not found' };
    }
    return backup;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a backup' })
  @ApiParam({ name: 'id', description: 'Backup ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Backup deleted successfully' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async deleteBackup(@Param('id', ParseUUIDPipe) id: string) {
    const success = await this.backupService.deleteBackup(id);
    if (!success) {
      return { error: 'Backup not found or could not be deleted' };
    }
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify backup integrity' })
  @ApiParam({ name: 'id', description: 'Backup ID' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifyBackup(@Param('id', ParseUUIDPipe) id: string) {
    const isValid = await this.backupService.verifyBackupIntegrity(id);
    return { valid: isValid, backupId: id };
  }

  // === Recovery Operations ===

  @Post('restore')
  @ApiOperation({ summary: 'Restore database from backup' })
  @ApiResponse({ status: 200, description: 'Restore initiated' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async restoreBackup(@Body() dto: RestoreBackupDto) {
    return this.recoveryService.restoreFromBackup({
      backupId: dto.backupId,
      targetDatabase: dto.targetDatabase,
      verifyAfterRestore: dto.verifyAfterRestore,
      fromReplica: dto.fromReplica,
    });
  }

  // === Recovery Testing ===

  @Post('recovery-test')
  @ApiOperation({ summary: 'Run recovery test on latest backup' })
  @ApiResponse({ status: 200, description: 'Recovery test result' })
  async runRecoveryTest() {
    return this.recoveryService.runRecoveryTest();
  }

  @Post(':id/recovery-test')
  @ApiOperation({ summary: 'Run recovery test on specific backup' })
  @ApiParam({ name: 'id', description: 'Backup ID' })
  @ApiResponse({ status: 200, description: 'Recovery test result' })
  async runRecoveryTestForBackup(@Param('id', ParseUUIDPipe) id: string) {
    return this.recoveryService.runRecoveryTest(id);
  }

  @Get('recovery-tests/history')
  @ApiOperation({ summary: 'Get recovery test history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Test history retrieved' })
  async getRecoveryTestHistory(@Query('limit') limit?: number) {
    return this.recoveryService.getRecoveryTestHistory(limit ? Number(limit) : undefined);
  }

  // === Schedules ===

  @Get('schedules')
  @ApiOperation({ summary: 'List all backup schedules' })
  @ApiResponse({ status: 200, description: 'Schedules retrieved' })
  async listSchedules() {
    return this.schedulerService.getSchedules();
  }

  @Post('schedules')
  @ApiOperation({ summary: 'Create a new backup schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created' })
  async createSchedule(@Body() dto: CreateBackupScheduleDto) {
    return this.schedulerService.createSchedule(dto);
  }

  @Get('schedules/:id')
  @ApiOperation({ summary: 'Get schedule by ID' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({ status: 200, description: 'Schedule retrieved' })
  async getSchedule(@Param('id', ParseUUIDPipe) id: string) {
    return this.schedulerService.getScheduleById(id);
  }

  @Put('schedules/:id')
  @ApiOperation({ summary: 'Update a backup schedule' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({ status: 200, description: 'Schedule updated' })
  async updateSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBackupScheduleDto,
  ) {
    return this.schedulerService.updateSchedule(id, dto);
  }

  @Delete('schedules/:id')
  @ApiOperation({ summary: 'Delete a backup schedule' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Schedule deleted' })
  async deleteSchedule(@Param('id', ParseUUIDPipe) id: string) {
    await this.schedulerService.deleteSchedule(id);
  }

  @Post('schedules/:id/trigger')
  @ApiOperation({ summary: 'Manually trigger a scheduled backup' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({ status: 200, description: 'Backup triggered' })
  async triggerSchedule(@Param('id', ParseUUIDPipe) id: string) {
    return this.schedulerService.triggerManualBackup({ scheduleId: id });
  }

  @Post('schedules/:id/toggle')
  @ApiOperation({ summary: 'Enable or disable a schedule' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiQuery({ name: 'enabled', required: true, type: Boolean })
  @ApiResponse({ status: 200, description: 'Schedule toggled' })
  async toggleSchedule(@Param('id', ParseUUIDPipe) id: string, @Query('enabled') enabled: boolean) {
    return this.schedulerService.toggleSchedule(
      id,
      enabled === true || enabled === ('true' as any),
    );
  }

  // === Metrics ===

  @Get('metrics')
  @ApiOperation({ summary: 'Get backup metrics in Prometheus format' })
  @ApiResponse({
    status: 200,
    description: 'Metrics in Prometheus format',
    content: { 'text/plain': {} },
  })
  @Header('Content-Type', 'text/plain')
  async getMetrics() {
    return this.metricsService.getMetrics();
  }

  // === Cleanup ===

  @Post('cleanup')
  @ApiOperation({ summary: 'Manually trigger cleanup of expired backups' })
  @ApiResponse({ status: 200, description: 'Cleanup result' })
  async triggerCleanup() {
    return this.backupService.cleanupExpiredBackups();
  }

  // === Monitoring & Health ===

  @Get('health')
  @ApiOperation({ summary: 'Get backup system health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved' })
  async getHealthStatus() {
    return this.monitoringService.checkBackupHealth();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get active backup alerts' })
  @ApiResponse({ status: 200, description: 'Active alerts retrieved' })
  async getActiveAlerts() {
    return this.monitoringService.getActiveAlerts();
  }

  @Post('alerts/:id/resolve')
  @ApiOperation({ summary: 'Resolve a backup alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  async resolveAlert(@Param('id') id: string) {
    await this.monitoringService.resolveAlert(id);
    return { message: 'Alert resolved successfully' };
  }

  @Get('metrics/system')
  @ApiOperation({ summary: 'Get comprehensive system metrics' })
  @ApiResponse({ status: 200, description: 'System metrics retrieved' })
  async getSystemMetrics() {
    return this.monitoringService.getSystemMetrics();
  }

  @Get('performance/history')
  @ApiOperation({ summary: 'Get backup performance history' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Performance history retrieved' })
  async getPerformanceHistory(@Query('hours') hours?: number) {
    return this.monitoringService.getPerformanceHistory(
      hours ? Number(hours) : 24,
    );
  }

  // === Recovery Verification ===

  @Post('verification/run')
  @ApiOperation({ summary: 'Run comprehensive recovery verification' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async runRecoveryVerification() {
    return this.verificationService.runRecoveryVerification();
  }

  @Get('verification/history')
  @ApiOperation({ summary: 'Get recovery verification history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Verification history retrieved' })
  async getVerificationHistory(@Query('limit') limit?: number) {
    return this.verificationService.getRecoveryTestHistory(
      limit ? Number(limit) : 50,
    );
  }

  @Get('verification/stats')
  @ApiOperation({ summary: 'Get recovery verification statistics' })
  @ApiResponse({ status: 200, description: 'Verification statistics retrieved' })
  async getVerificationStats() {
    return this.verificationService.getRecoveryTestStats();
  }

  @Post('verification/integrity/:id')
  @ApiOperation({ summary: 'Verify backup integrity' })
  @ApiParam({ name: 'id', description: 'Backup ID' })
  @ApiResponse({ status: 200, description: 'Integrity verification result' })
  async verifyBackupIntegrity(@Param('id', ParseUUIDPipe) id: string) {
    const isValid = await this.verificationService.verifyBackupIntegrity(id);
    return { valid: isValid, backupId: id };
  }

  @Post('verification/pitr')
  @ApiOperation({ summary: 'Verify point-in-time recovery capability' })
  @ApiResponse({ status: 200, description: 'PITR verification result' })
  async verifyPointInTimeRecovery() {
    const isValid = await this.verificationService.verifyPointInTimeRecovery();
    return { valid: isValid };
  }
}
