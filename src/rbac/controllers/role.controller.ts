import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { RoleService } from '../services/role.service';
import { AuditLogService } from '../services/audit-log.service';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

/**
 * Controller for managing roles in the RBAC system.
 */
@ApiTags('RBAC Roles')
@UseGuards(PermissionsGuard)
@Controller('rbac/roles')
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Create a new role.
   */
  @Post()
  @Permissions('role:create')
  @ApiOperation({ summary: 'Create role', description: 'Creates a new role.' })
  @ApiBody({
    schema: {
      properties: {
        name: { type: 'string' },
        description: { type: 'string', required: false },
        parentRoleId: { type: 'string', required: false },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Role created.' })
  async create(@Body() body: any, @Req() req: any) {
    const role = await this.roleService.createRole(body.name, body.description, body.parentRoleId);
    await this.auditLogService.log(req.user.id, 'create', 'role', { role });
    return role;
  }

  /**
   * Get all roles.
   */
  @Get()
  @Permissions('role:read')
  @ApiOperation({ summary: 'Get all roles', description: 'Returns all roles.' })
  @ApiResponse({ status: 200, description: 'List of roles.' })
  async findAll() {
    return this.roleService.getAllRoles();
  }

  /**
   * Get a role by ID.
   */
  @Get(':id')
  @Permissions('role:read')
  @ApiOperation({ summary: 'Get role by ID', description: 'Returns a role by its ID.' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role details.' })
  async findOne(@Param('id') id: string) {
    return this.roleService.getRoleById(id);
  }

  /**
   * Update a role by ID.
   */
  @Patch(':id')
  @Permissions('role:update')
  @ApiOperation({ summary: 'Update role', description: 'Updates a role by its ID.' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiBody({
    schema: {
      properties: {
        name: { type: 'string', required: false },
        description: { type: 'string', required: false },
        parentRoleId: { type: 'string', required: false },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Role updated.' })
  async update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const updated = await this.roleService.updateRole(id, body);
    await this.auditLogService.log(req.user.id, 'update', 'role', { id, body });
    return updated;
  }

  /**
   * Delete a role by ID.
   */
  @Delete(':id')
  @Permissions('role:delete')
  @ApiOperation({ summary: 'Delete role', description: 'Deletes a role by its ID.' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role deleted.' })
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.roleService.deleteRole(id);
    await this.auditLogService.log(req.user.id, 'delete', 'role', { id });
    return { message: 'Role deleted' };
  }
}
