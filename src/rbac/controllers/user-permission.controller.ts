import { Controller, Post, Delete, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { UserPermissionService } from '../services/user-permission.service';
import { AuditLogService } from '../services/audit-log.service';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';

@UseGuards(PermissionsGuard)
@Controller('rbac/user-permissions')
export class UserPermissionController {
  constructor(
    private readonly userPermService: UserPermissionService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  @Permissions('user:assign-permission')
  async assign(@Body() body: any, @Req() req: any) {
    const up = await this.userPermService.assignPermission(body.userId, body.permissionId);
    await this.auditLogService.log(req.user.id, 'assign-permission', 'user', {
      userId: body.userId,
      permissionId: body.permissionId,
    });
    return up;
  }

  @Delete()
  @Permissions('user:remove-permission')
  async remove(@Body() body: any, @Req() req: any) {
    await this.userPermService.removePermission(body.userId, body.permissionId);
    await this.auditLogService.log(req.user.id, 'remove-permission', 'user', {
      userId: body.userId,
      permissionId: body.permissionId,
    });
    return { success: true };
  }

  @Get(':userId')
  @Permissions('user:read-permissions')
  async getPermissions(@Param('userId') userId: string) {
    return this.userPermService.getPermissionsForUser(userId);
  }
}
