import { Controller, Post, Delete, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { RolePermissionService } from '../services/role-permission.service';
import { AuditLogService } from '../services/audit-log.service';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';

@UseGuards(PermissionsGuard)
@Controller('rbac/role-permissions')
export class RolePermissionController {
  constructor(
    private readonly rolePermService: RolePermissionService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  @Permissions('role:assign-permission')
  async assign(@Body() body: any, @Req() req: any) {
    const rp = await this.rolePermService.assignPermission(body.roleId, body.permissionId);
    await this.auditLogService.log(req.user.id, 'assign-permission', 'role', { roleId: body.roleId, permissionId: body.permissionId });
    return rp;
  }

  @Delete()
  @Permissions('role:remove-permission')
  async remove(@Body() body: any, @Req() req: any) {
    await this.rolePermService.removePermission(body.roleId, body.permissionId);
    await this.auditLogService.log(req.user.id, 'remove-permission', 'role', { roleId: body.roleId, permissionId: body.permissionId });
    return { success: true };
  }

  @Get(':roleId')
  @Permissions('role:read-permissions')
  async getPermissions(@Param('roleId') roleId: string) {
    return this.rolePermService.getPermissionsForRole(roleId);
  }
} 