import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { UserPermission } from './entities/user-permission.entity';
import { AuditLog } from './entities/audit-log.entity';
import { PermissionsGuard } from './guards/permissions.guard';
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';
import { RolePermissionService } from './services/role-permission.service';
import { UserRoleService } from './services/user-role.service';
import { UserPermissionService } from './services/user-permission.service';
import { AuditLogService } from './services/audit-log.service';
import { RoleController } from './controllers/role.controller';
import { PermissionController } from './controllers/permission.controller';
import { RolePermissionController } from './controllers/role-permission.controller';
import { UserRoleController } from './controllers/user-role.controller';
import { UserPermissionController } from './controllers/user-permission.controller';
import { AuditLogController } from './controllers/audit-log.controller';
import { ApiTags } from '@nestjs/swagger';

/**
 * RBAC module for managing roles, permissions, and access control.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Permission,
      RolePermission,
      UserRole,
      UserPermission,
      AuditLog,
    ]),
  ],
  controllers: [
    RoleController,
    PermissionController,
    RolePermissionController,
    UserRoleController,
    UserPermissionController,
    AuditLogController,
  ],
  providers: [
    RoleService,
    PermissionService,
    RolePermissionService,
    UserRoleService,
    UserPermissionService,
    AuditLogService,
    PermissionsGuard,
  ],
  exports: [
    RoleService,
    PermissionService,
    RolePermissionService,
    UserRoleService,
    UserPermissionService,
    AuditLogService,
  ],
})
export class RbacModule {}
