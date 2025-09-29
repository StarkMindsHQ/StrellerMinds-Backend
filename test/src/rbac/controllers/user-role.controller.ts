import { Controller, Post, Delete, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { UserRoleService } from '../services/user-role.service';
import { AuditLogService } from '../services/audit-log.service';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';

@UseGuards(PermissionsGuard)
@Controller('rbac/user-roles')
export class UserRoleController {
  constructor(
    private readonly userRoleService: UserRoleService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  @Permissions('user:assign-role')
  async assign(@Body() body: any, @Req() req: any) {
    const ur = await this.userRoleService.assignRole(body.userId, body.roleId);
    await this.auditLogService.log(req.user.id, 'assign-role', 'user', { userId: body.userId, roleId: body.roleId });
    return ur;
  }

  @Delete()
  @Permissions('user:remove-role')
  async remove(@Body() body: any, @Req() req: any) {
    await this.userRoleService.removeRole(body.userId, body.roleId);
    await this.auditLogService.log(req.user.id, 'remove-role', 'user', { userId: body.userId, roleId: body.roleId });
    return { success: true };
  }

  @Get(':userId')
  @Permissions('user:read-roles')
  async getRoles(@Param('userId') userId: string) {
    return this.userRoleService.getRolesForUser(userId);
  }
} 