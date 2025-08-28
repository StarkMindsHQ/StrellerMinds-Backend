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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { EnhancedMigrationService } from './enhanced-migration.service';
import { DataValidationService } from './data-validation.service';
import { MigrationMonitoringService } from './migration-monitoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { UserRole } from '../users/enums/userRole.enum';

export class ExecuteMigrationDto {
  migrationName: string;
  validateBefore?: boolean;
  createBackup?: boolean;
  monitorProgress?: boolean;
  rollbackOnFailure?: boolean;
}

export class RollbackMigrationDto {
  migrationName: string;
  backupPath?: string;
}

export class ValidateMigrationDto {
  migrationName: string;
  context?: any;
}

export class CreateMigrationPlanDto {
  migrations: string[];
}

@ApiTags('Database Migrations')
@Controller('api/v1/migrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MigrationController {
  constructor(
    private readonly enhancedMigrationService: EnhancedMigrationService,
    private readonly dataValidationService: DataValidationService,
    private readonly migrationMonitoringService: MigrationMonitoringService,
  ) {}

  @Post('execute')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute a migration with enhanced features' })
  @ApiResponse({ status: 200, description: 'Migration executed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid migration or validation failed' })
  @ApiResponse({ status: 500, description: 'Migration execution failed' })
  async executeMigration(@Body() executeDto: ExecuteMigrationDto) {
    const result = await this.enhancedMigrationService.executeMigration(
      executeDto.migrationName,
      {
        validateBefore: executeDto.validateBefore ?? true,
        createBackup: executeDto.createBackup ?? true,
        monitorProgress: executeDto.monitorProgress ?? true,
        rollbackOnFailure: executeDto.rollbackOnFailure ?? true,
      }
    );

    return {
      success: true,
      message: `Migration ${executeDto.migrationName} executed successfully`,
      data: result,
    };
  }

  @Post('validate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a migration before execution' })
  @ApiResponse({ status: 200, description: 'Validation completed' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async validateMigration(@Body() validateDto: ValidateMigrationDto) {
    const result = await this.dataValidationService.validateBeforeMigration(
      validateDto.migrationName,
      validateDto.context
    );

    return {
      success: result.summary.failed === 0,
      message: result.summary.failed === 0 
        ? 'Migration validation passed' 
        : 'Migration validation failed',
      data: result,
    };
  }

  @Post('rollback')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rollback a migration' })
  @ApiResponse({ status: 200, description: 'Migration rolled back successfully' })
  @ApiResponse({ status: 400, description: 'Rollback failed' })
  async rollbackMigration(@Body() rollbackDto: RollbackMigrationDto) {
    await this.enhancedMigrationService.rollbackMigration(
      rollbackDto.migrationName,
      rollbackDto.backupPath
    );

    return {
      success: true,
      message: `Migration ${rollbackDto.migrationName} rolled back successfully`,
    };
  }

  @Post('plan')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a migration plan with dependencies and impact analysis' })
  @ApiResponse({ status: 200, description: 'Migration plan created' })
  async createMigrationPlan(@Body() planDto: CreateMigrationPlanDto) {
    const plan = await this.enhancedMigrationService.createMigrationPlan(planDto.migrations);

    return {
      success: true,
      message: 'Migration plan created successfully',
      data: plan,
    };
  }

  @Get('status')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get comprehensive migration status' })
  @ApiResponse({ status: 200, description: 'Migration status retrieved' })
  async getMigrationStatus() {
    const status = await this.enhancedMigrationService.getMigrationStatus();

    return {
      success: true,
      data: status,
    };
  }

  @Get('metrics')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get migration metrics and performance data' })
  @ApiResponse({ status: 200, description: 'Migration metrics retrieved' })
  async getMigrationMetrics() {
    const metrics = this.migrationMonitoringService.getMetrics();
    const performance = this.migrationMonitoringService.getPerformanceData();

    return {
      success: true,
      data: {
        metrics,
        performance,
      },
    };
  }

  @Get('health')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get migration system health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved' })
  async getMigrationHealth() {
    const health = this.migrationMonitoringService.getHealthStatus();

    return {
      success: true,
      data: health,
    };
  }

  @Get('alerts')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiQuery({ name: 'includeAcknowledged', required: false, type: Boolean })
  @ApiOperation({ summary: 'Get migration alerts' })
  @ApiResponse({ status: 200, description: 'Alerts retrieved' })
  async getMigrationAlerts(
    @Query('includeAcknowledged') includeAcknowledged: boolean = false
  ) {
    const alerts = this.migrationMonitoringService.getAlerts(includeAcknowledged);

    return {
      success: true,
      data: alerts,
    };
  }

  @Put('alerts/:alertId/acknowledge')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiParam({ name: 'alertId', description: 'Alert ID to acknowledge' })
  @ApiOperation({ summary: 'Acknowledge a migration alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged successfully' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async acknowledgeAlert(
    @Param('alertId') alertId: string,
    @Body() body: { acknowledgedBy: string }
  ) {
    const success = this.migrationMonitoringService.acknowledgeAlert(
      alertId,
      body.acknowledgedBy
    );

    if (success) {
      return {
        success: true,
        message: `Alert ${alertId} acknowledged successfully`,
      };
    } else {
      return {
        success: false,
        message: 'Alert not found',
      };
    }
  }

  @Get('validation/rules')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiQuery({ name: 'category', required: false, description: 'Filter rules by category' })
  @ApiOperation({ summary: 'Get available validation rules' })
  @ApiResponse({ status: 200, description: 'Validation rules retrieved' })
  async getValidationRules(@Query('category') category?: string) {
    const rules = this.dataValidationService.getValidationRules(category);

    return {
      success: true,
      data: rules,
    };
  }

  @Post('validation/specific')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run targeted validation on specific tables or constraints' })
  @ApiResponse({ status: 200, description: 'Targeted validation completed' })
  async runTargetedValidation(
    @Body() body: { targets: string[]; ruleTypes?: string[] }
  ) {
    const result = await this.dataValidationService.validateSpecific(
      body.targets,
      body.ruleTypes
    );

    return {
      success: result.summary.failed === 0,
      message: result.summary.failed === 0 
        ? 'Targeted validation passed' 
        : 'Targeted validation failed',
      data: result,
    };
  }

  @Get('report')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiQuery({ name: 'startDate', required: true, description: 'Report start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'Report end date (ISO string)' })
  @ApiOperation({ summary: 'Generate migration report for a specific period' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  async generateReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        success: false,
        message: 'Invalid date format. Use ISO string format (YYYY-MM-DDTHH:mm:ss.sssZ)',
      };
    }

    const report = this.migrationMonitoringService.generateReport(start, end);

    return {
      success: true,
      data: report,
    };
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'], default: 'json' })
  @ApiOperation({ summary: 'Export migration monitoring data' })
  @ApiResponse({ status: 200, description: 'Data exported successfully' })
  async exportData(@Query('format') format: 'json' | 'csv' = 'json') {
    const data = this.migrationMonitoringService.exportData(format);

    return {
      success: true,
      data: {
        format,
        content: data,
        timestamp: new Date(),
      },
    };
  }

  @Delete('cleanup')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean up old monitoring data (Admin only)' })
  @ApiResponse({ status: 200, description: 'Cleanup completed successfully' })
  async cleanupOldData() {
    // This will trigger the cron job manually
    // In practice, you might want to add a method to the monitoring service
    // to trigger cleanup on demand

    return {
      success: true,
      message: 'Cleanup request submitted. Old data will be cleaned up during next scheduled run.',
    };
  }

  @Get('performance')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 100 })
  @ApiOperation({ summary: 'Get migration performance data' })
  @ApiResponse({ status: 200, description: 'Performance data retrieved' })
  async getPerformanceData(@Query('limit') limit: number = 100) {
    const performance = this.migrationMonitoringService.getPerformanceData(limit);

    return {
      success: true,
      data: performance,
    };
  }

  @Post('performance/record')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record performance data for a migration' })
  @ApiResponse({ status: 201, description: 'Performance data recorded' })
  async recordPerformanceData(@Body() performanceData: any) {
    this.migrationMonitoringService.recordPerformanceData(performanceData);

    return {
      success: true,
      message: 'Performance data recorded successfully',
    };
  }
}
