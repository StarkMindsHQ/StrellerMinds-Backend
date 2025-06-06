import { Controller, Get, Query, Param, UseGuards, HttpStatus, HttpCode } from "@nestjs/common"
import type { AuditLogService } from "../services/audit-log.service"
import type { AuditLogRetentionService } from "../services/audit-log-retention.service"
import type { AuditLogFilterDto } from "../dto/audit-log-filter.dto"
import { AuditLogAccessGuard } from "../guards/audit-log-access.guard"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"

@ApiTags("Audit Logs")
@ApiBearerAuth()
@Controller("audit-logs")
@UseGuards(AuditLogAccessGuard)
export class AuditLogController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly retentionService: AuditLogRetentionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() filterDto: AuditLogFilterDto) {
    return this.auditLogService.findAll(filterDto);
  }

  @Get("statistics")
  @ApiOperation({ summary: "Get audit log statistics" })
  @ApiResponse({ status: 200, description: "Statistics retrieved successfully" })
  @HttpCode(HttpStatus.OK)
  async getStatistics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    return this.auditLogService.getStatistics(start, end)
  }

  @Get("retention-policy")
  @ApiOperation({ summary: "Get current retention policy" })
  @ApiResponse({ status: 200, description: "Retention policy retrieved successfully" })
  @HttpCode(HttpStatus.OK)
  async getRetentionPolicy() {
    return this.retentionService.getRetentionPolicy()
  }

  @Get('expiring-logs')
  @ApiOperation({ summary: 'Get logs that are near expiration' })
  @ApiResponse({ status: 200, description: 'Expiring logs retrieved successfully' })
  @HttpCode(HttpStatus.OK)
  async getExpiringLogs(@Query('days') days?: number) {
    return this.retentionService.getLogsNearExpiration(days);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiResponse({ status: 200, description: 'Audit log retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.auditLogService.findById(id);
  }

  @Get(':id/verify')
  @ApiOperation({ summary: 'Verify audit log integrity' })
  @ApiResponse({ status: 200, description: 'Integrity verification completed' })
  @HttpCode(HttpStatus.OK)
  async verifyIntegrity(@Param('id') id: string) {
    const isValid = await this.auditLogService.verifyIntegrity(id);
    return {
      id,
      isValid,
      message: isValid ? 'Log integrity verified' : 'Log integrity compromised',
    };
  }
}
