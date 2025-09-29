/**
 * AuditLogController handles endpoints for retrieving audit logs.
 */
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/enums/userRole.enum';
import { AuditLogService } from '../services/audit.log.service';
import { AuditLog } from '../entities/audit.log.entity';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN) // Only admins can access audit logs
@ApiBearerAuth()
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('user-deletions')
  @ApiOperation({ summary: 'Get all user deletion audit logs' })
  @ApiResponse({
    status: 200,
    description: 'Returns all user deletion audit logs',
    type: [AuditLog],
  })
  async getUserDeletionLogs(): Promise<AuditLog[]> {
    return this.auditLogService.getUserDeletionLogs();
  }

  @Get('entity/:type/:id')
  @ApiOperation({ summary: 'Get audit logs for a specific entity' })
  @ApiResponse({
    status: 200,
    description: 'Returns audit logs for the specified entity',
    type: [AuditLog],
  })
  async getEntityLogs(
    @Param('type') entityType: string,
    @Param('id', ParseUUIDPipe) entityId: string,
  ): Promise<AuditLog[]> {
    return this.auditLogService.getLogsForEntity(entityType, entityId);
  }
}
