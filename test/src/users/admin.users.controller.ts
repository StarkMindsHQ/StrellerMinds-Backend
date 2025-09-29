import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { UsersService } from './services/users.service';
import { CreateUsersDto } from './dtos/create.users.dto';
import { updateUsersDto } from './dtos/update.users.dto';
import { Roles } from '../role/roles.decorator';
import { RolesGuard } from '../role/roles.guard';
import { Role } from '../role/roles.enum';
import { AuditLogService } from '../audit/services/audit.log.service';
import { UserRole } from './enums/userRole.enum';
import { AccountStatus } from './enums/accountStatus.enum';

/**
 * AdminUsersController handles admin-level user management operations.
 */
@ApiTags('Admin Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(RolesGuard)
@Roles(Role.Admin)
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Create a new user (admin only)
   * @param dto User creation data
   * @param adminId ID of the admin performing the action
   * @returns Created user data
   */
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  @ApiBody({ type: CreateUsersDto })
  @ApiResponse({ status: 201, description: 'User created.' })
  @Post()
  async create(@Body() dto: CreateUsersDto, @Body('adminId') adminId: string) {
    const user = await this.usersService.create(dto);
    await this.auditLogService.createLog({
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.id,
      performedBy: adminId,
      details: { created: true },
    });
    return user;
  }

  /**
   * Get all users
   * @returns List of users
   */
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users.' })
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  /**
   * Get user by ID
   * @param id User ID
   * @returns User data
   */
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found.' })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * Update user by ID
   * @param id User ID
   * @param dto User update data
   * @param adminId ID of the admin performing the action
   * @returns Updated user data
   */
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiBody({ type: updateUsersDto })
  @ApiResponse({ status: 200, description: 'User updated.' })
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: updateUsersDto, @Body('adminId') adminId: string) {
    const user = await this.usersService.update(id, dto);
    await this.auditLogService.createLog({
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: id,
      performedBy: adminId,
      details: { updated: true },
    });
    return user;
  }

  /**
   * Delete user by ID
   * @param id User ID
   * @param adminId ID of the admin performing the action
   */
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User deleted.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string, @Body('adminId') adminId: string) {
    await this.usersService.delete(id);
    await this.auditLogService.createLog({
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: id,
      performedBy: adminId,
      details: { deleted: true },
    });
    return;
  }

  /**
   * Update user role
   * @param id User ID
   * @param role New role for the user
   * @param adminId ID of the admin performing the action
   * @returns Updated user data
   */
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiBody({ schema: { properties: { role: { type: 'string', enum: UserRole }, adminId: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'User role updated.' })
  @Patch(':id/role')
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('role') role: UserRole,
    @Body('adminId') adminId: string
  ) {
    const user = await this.usersService.update(id, { role });
    await this.auditLogService.createLog({
      action: 'UPDATE_ROLE',
      entityType: 'User',
      entityId: id,
      performedBy: adminId,
      details: { newRole: role },
    });
    return user;
  }

  /**
   * Update user account status
   * @param id User ID
   * @param status New status for the user
   * @param adminId ID of the admin performing the action
   * @returns Updated user data
   */
  @ApiOperation({ summary: 'Update user account status' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiBody({ schema: { properties: { status: { type: 'string', enum: AccountStatus }, adminId: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'User status updated.' })
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: AccountStatus,
    @Body('adminId') adminId: string
  ) {
    const user = await this.usersService.update(id, { status });
    await this.auditLogService.createLog({
      action: 'UPDATE_STATUS',
      entityType: 'User',
      entityId: id,
      performedBy: adminId,
      details: { newStatus: status },
    });
    return user;
  }

  /**
   * Get user analytics
   * @param id User ID
   * @returns User analytics data
   */
  @ApiOperation({ summary: 'Get user analytics' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User analytics.' })
  @Get(':id/analytics')
  async getUserAnalytics(@Param('id', ParseUUIDPipe) id: string) {
    // This should call analyticsService for user-specific analytics
    // Placeholder: return basic info for now
    return { message: 'User analytics endpoint (to be implemented)' };
  }
}
