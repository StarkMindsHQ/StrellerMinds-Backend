import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuditLogService } from '../services/audit-log.service';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';

@UseGuards(PermissionsGuard)
@Controller('rbac/audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Permissions('audit:read')
  async getAll() {
    return this.auditLogService.getAllLogs();
  }

  @Get('user/:userId')
  @Permissions('audit:read')
  async getForUser(@Param('userId') userId: string) {
    return this.auditLogService.getLogsForUser(userId);
  }
}
