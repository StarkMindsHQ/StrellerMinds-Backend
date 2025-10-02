import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PermissionService } from '../services/permission.service';
import { AuditLogService } from '../services/audit-log.service';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';

@UseGuards(PermissionsGuard)
@Controller('rbac/permissions')
export class PermissionController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  @Permissions('permission:create')
  async create(@Body() body: any, @Req() req: any) {
    const perm = await this.permissionService.createPermission(body.name, body.description);
    await this.auditLogService.log(req.user.id, 'create', 'permission', {
      perm,
    });
    return perm;
  }

  @Get()
  @Permissions('permission:read')
  async findAll() {
    return this.permissionService.getAllPermissions();
  }

  @Get(':id')
  @Permissions('permission:read')
  async findOne(@Param('id') id: string) {
    return this.permissionService.getPermissionById(id);
  }

  @Patch(':id')
  @Permissions('permission:update')
  async update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const updated = await this.permissionService.updatePermission(id, body);
    await this.auditLogService.log(req.user.id, 'update', 'permission', {
      id,
      body,
    });
    return updated;
  }

  @Delete(':id')
  @Permissions('permission:delete')
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.permissionService.deletePermission(id);
    await this.auditLogService.log(req.user.id, 'delete', 'permission', { id });
    return { success: true };
  }
}
