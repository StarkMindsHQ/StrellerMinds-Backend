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
  Logger 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EnhancedConfigService } from './enhanced-config.service';
import { ConfigAuditService } from './config-audit.service';
import { ConfigVersioningService } from './config-versioning.service';
import { ConfigEncryptionService } from './config-encryption.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Configuration Management')
@Controller('config')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConfigController {
  private readonly logger = new Logger(ConfigController.name);

  constructor(
    private readonly configService: EnhancedConfigService,
    private readonly auditService: ConfigAuditService,
    private readonly versioningService: ConfigVersioningService,
    private readonly encryptionService: ConfigEncryptionService,
  ) {}

  @Get('status')
  @Roles('admin', 'devops')
  @ApiOperation({ summary: 'Get configuration management status' })
  @ApiResponse({ status: 200, description: 'Configuration status retrieved successfully' })
  async getConfigStatus() {
    return this.configService.getConfigurationStatus();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check configuration health' })
  @ApiResponse({ status: 200, description: 'Configuration health check' })
  async healthCheck() {
    return {
      healthy: this.configService.isHealthy(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @Roles('admin', 'devops')
  @ApiOperation({ summary: 'Get all configuration values' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  async getAllConfig(@Query('includeSecrets') includeSecrets?: string) {
    const includeSecretsBool = includeSecrets === 'true';
    return this.configService.getAll({ auditAccess: true });
  }

  @Get(':key')
  @Roles('admin', 'devops')
  @ApiOperation({ summary: 'Get specific configuration value' })
  @ApiResponse({ status: 200, description: 'Configuration value retrieved successfully' })
  async getConfig(@Param('key') key: string) {
    const value = this.configService.get(key, null, { auditAccess: true });
    return { key, value };
  }

  @Put(':key')
  @Roles('admin')
  @ApiOperation({ summary: 'Update configuration value' })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully' })
  async updateConfig(
    @Param('key') key: string,
    @Body('value') value: any,
    @Body('encrypt') encrypt?: boolean,
  ) {
    await this.configService.set(key, value, { 
      encryptSensitive: encrypt,
      versionOnLoad: true 
    });
    return { message: `Configuration key '${key}' updated successfully` };
  }

  @Post('version')
  @Roles('admin', 'devops')
  @ApiOperation({ summary: 'Create configuration version' })
  @ApiResponse({ status: 201, description: 'Configuration version created successfully' })
  async createVersion(
    @Body('description') description?: string,
    @Body('tags') tags?: string[],
  ) {
    const version = await this.configService.createVersion(description, tags);
    return { version, message: 'Configuration version created successfully' };
  }

  @Get('versions')
  @Roles('admin', 'devops')
  @ApiOperation({ summary: 'List configuration versions' })
  @ApiResponse({ status: 200, description: 'Configuration versions retrieved successfully' })
  async getVersions(
    @Query('environment') environment?: string,
    @Query('author') author?: string,
    @Query('tags') tags?: string,
  ) {
    const filter: any = {};
    if (environment) filter.environment = environment;
    if (author) filter.author = author;
    if (tags) filter.tags = tags.split(',');

    return this.versioningService.listVersions(filter);
  }

  @Get('versions/:version')
  @Roles('admin', 'devops')
  @ApiOperation({ summary: 'Get specific configuration version' })
  @ApiResponse({ status: 200, description: 'Configuration version retrieved successfully' })
  async getVersion(@Param('version') version: string) {
    return this.versioningService.getVersion(version);
  }

  @Post('rollback/:version')
  @Roles('admin')
  @ApiOperation({ summary: 'Rollback to specific configuration version' })
  @ApiResponse({ status: 200, description: 'Configuration rollback successful' })
  async rollbackToVersion(@Param('version') version: string) {
    await this.configService.rollbackToVersion(version);
    return { message: `Successfully rolled back to version ${version}` };
  }

  @Get('versions/:version/compare/:otherVersion')
  @Roles('admin', 'devops')
  @ApiOperation({ summary: 'Compare two configuration versions' })
  @ApiResponse({ status: 200, description: 'Configuration comparison completed' })
  async compareVersions(
    @Param('version') version: string,
    @Param('otherVersion') otherVersion: string,
  ) {
    return this.versioningService.compareVersions(version, otherVersion);
  }

  @Delete('versions/:version')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete configuration version' })
  @ApiResponse({ status: 200, description: 'Configuration version deleted successfully' })
  async deleteVersion(@Param('version') version: string) {
    const success = await this.versioningService.deleteVersion(version);
    return { 
      success, 
      message: success ? `Version ${version} deleted successfully` : `Failed to delete version ${version}` 
    };
  }

  @Get('audit')
  @Roles('admin', 'devops')
  @ApiOperation({ summary: 'Get configuration audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  async getAuditLogs(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('action') action?: string,
    @Query('configKey') configKey?: string,
    @Query('userId') userId?: string,
    @Query('success') success?: string,
  ) {
    const filter: any = {};
    if (startDate) filter.startDate = new Date(startDate);
    if (endDate) filter.endDate = new Date(endDate);
    if (action) filter.action = action;
    if (configKey) filter.configKey = configKey;
    if (userId) filter.userId = userId;
    if (success) filter.success = success === 'true';

    return this.auditService.getAuditLogs(filter);
  }

  @Get('audit/statistics')
  @Roles('admin', 'devops')
  @ApiOperation({ summary: 'Get configuration audit statistics' })
  @ApiResponse({ status: 200, description: 'Audit statistics retrieved successfully' })
  async getAuditStatistics() {
    return this.auditService.getAuditStatistics();
  }

  @Get('audit/config/:configKey/history')
  @Roles('admin', 'devops')
  @ApiOperation({ summary: 'Get configuration change history' })
  @ApiResponse({ status: 200, description: 'Configuration history retrieved successfully' })
  async getConfigHistory(
    @Param('configKey') configKey: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.auditService.getConfigHistory(configKey, limitNum);
  }

  @Post('export')
  @Roles('admin')
  @ApiOperation({ summary: 'Export configuration' })
  @ApiResponse({ status: 200, description: 'Configuration exported successfully' })
  async exportConfig(
    @Body('includeSecrets') includeSecrets?: boolean,
    @Body('outputPath') outputPath?: string,
  ) {
    const path = outputPath || `./config-export-${Date.now()}.json`;
    await this.configService.exportConfiguration(path, includeSecrets);
    return { message: 'Configuration exported successfully', path };
  }

  @Post('import')
  @Roles('admin')
  @ApiOperation({ summary: 'Import configuration' })
  @ApiResponse({ status: 200, description: 'Configuration imported successfully' })
  async importConfig(
    @Body('inputPath') inputPath: string,
    @Body('includeSecrets') includeSecrets?: boolean,
  ) {
    await this.configService.importConfiguration(inputPath, includeSecrets);
    return { message: 'Configuration imported successfully' };
  }

  @Post('encryption/rotate-key')
  @Roles('admin')
  @ApiOperation({ summary: 'Rotate encryption key' })
  @ApiResponse({ status: 200, description: 'Encryption key rotated successfully' })
  async rotateEncryptionKey(@Body('newKeyId') newKeyId: string) {
    await this.configService.rotateEncryptionKey(newKeyId);
    return { message: `Encryption key rotated to ${newKeyId} successfully` };
  }

  @Get('encryption/keys')
  @Roles('admin', 'devops')
  @ApiOperation({ summary: 'List encryption keys' })
  @ApiResponse({ status: 200, description: 'Encryption keys retrieved successfully' })
  async listEncryptionKeys() {
    return this.encryptionService.listKeys();
  }

  @Get('encryption/keys/:keyId/metadata')
  @Roles('admin', 'devops')
  @ApiOperation({ summary: 'Get encryption key metadata' })
  @ApiResponse({ status: 200, description: 'Key metadata retrieved successfully' })
  async getKeyMetadata(@Param('keyId') keyId: string) {
    return this.encryptionService.getKeyMetadata(keyId);
  }

  @Post('encryption/keys/:keyId/validate')
  @Roles('admin', 'devops')
  @ApiOperation({ summary: 'Validate encryption key integrity' })
  @ApiResponse({ status: 200, description: 'Key validation completed' })
  async validateKey(@Param('keyId') keyId: string) {
    const isValid = this.encryptionService.validateKeyIntegrity(keyId);
    return { keyId, isValid };
  }

  @Delete('encryption/keys/:keyId')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete encryption key' })
  @ApiResponse({ status: 200, description: 'Encryption key deleted successfully' })
  async deleteKey(@Param('keyId') keyId: string) {
    const success = this.encryptionService.deleteKey(keyId);
    return { 
      success, 
      message: success ? `Key ${keyId} deleted successfully` : `Failed to delete key ${keyId}` 
    };
  }

  @Post('audit/cleanup')
  @Roles('admin')
  @ApiOperation({ summary: 'Cleanup old audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs cleanup completed' })
  async cleanupAuditLogs(@Body('retentionDays') retentionDays?: number) {
    const days = retentionDays || 90;
    const deletedCount = await this.auditService.cleanupOldLogs(days);
    return { 
      message: `Cleanup completed successfully`, 
      deletedCount,
      retentionDays: days 
    };
  }

  @Post('audit/export')
  @Roles('admin', 'devops')
  @ApiOperation({ summary: 'Export audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs exported successfully' })
  async exportAuditLogs(
    @Body('outputPath') outputPath?: string,
    @Body('filter') filter?: any,
  ) {
    const path = outputPath || `./audit-export-${Date.now()}.json`;
    await this.auditService.exportAuditLogs(path, filter);
    return { message: 'Audit logs exported successfully', path };
  }

  @Post('validate')
  @Roles('admin', 'devops')
  @ApiOperation({ summary: 'Validate configuration' })
  @ApiResponse({ status: 200, description: 'Configuration validation completed' })
  async validateConfiguration() {
    try {
      await this.configService['validateConfiguration']();
      return { valid: true, message: 'Configuration is valid' };
    } catch (error) {
      return { valid: false, message: error.message };
    }
  }
}
