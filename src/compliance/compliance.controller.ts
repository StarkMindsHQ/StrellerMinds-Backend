import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { UserRole } from '../auth/entities/user.entity';
import { ComplianceMonitoringService } from './services/compliance-monitoring.service';

@ApiTags('Compliance Monitoring')
@Controller('compliance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class ComplianceController {
  constructor(private readonly complianceMonitoringService: ComplianceMonitoringService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get the compliance monitoring dashboard' })
  @ApiResponse({ status: 200, description: 'Compliance dashboard returned' })
  getDashboard() {
    return this.complianceMonitoringService.getDashboard();
  }

  @Post('data-access/log')
  @ApiOperation({ summary: 'Record a data access event' })
  @ApiResponse({ status: 201, description: 'Data access event recorded' })
  logDataAccess(
    @Body()
    body: {
      actorId: string;
      resource: string;
      action: string;
      lawfulBasis?: string;
      containsPersonalData?: boolean;
      outcome?: 'allowed' | 'denied';
    },
  ) {
    return this.complianceMonitoringService.logDataAccess(
      body.actorId,
      body.resource,
      body.action,
      body.lawfulBasis,
      body.containsPersonalData ?? true,
      body.outcome,
    );
  }

  @Get('data-access/logs')
  @ApiOperation({ summary: 'Get data access logs' })
  @ApiResponse({ status: 200, description: 'Data access logs returned' })
  getDataAccessLogs() {
    return this.complianceMonitoringService.getAccessLogs();
  }

  @Get('gdpr')
  @ApiOperation({ summary: 'Get GDPR compliance status' })
  @ApiResponse({ status: 200, description: 'GDPR compliance status returned' })
  getGdprComplianceStatus() {
    return this.complianceMonitoringService.getGdprComplianceStatus();
  }

  @Get('security-checks')
  @ApiOperation({ summary: 'Run security compliance checks' })
  @ApiResponse({ status: 200, description: 'Security compliance checks returned' })
  runSecurityChecks() {
    return this.complianceMonitoringService.runSecurityComplianceChecks();
  }

  @Get('audit-trail')
  @ApiOperation({ summary: 'Get automated audit trail entries' })
  @ApiResponse({ status: 200, description: 'Audit trail returned' })
  getAuditTrail() {
    return this.complianceMonitoringService.getAuditTrail();
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate a compliance report' })
  @ApiResponse({ status: 201, description: 'Compliance report generated' })
  generateReport(@Body('trigger') trigger?: string) {
    return this.complianceMonitoringService.generateComplianceReport(trigger);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get compliance reports' })
  @ApiResponse({ status: 200, description: 'Compliance reports returned' })
  getReports() {
    return this.complianceMonitoringService.getReports();
  }
}
