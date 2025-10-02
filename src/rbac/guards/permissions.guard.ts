import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../entities/user-role.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { UserPermission } from '../entities/user-permission.entity';
import { Role } from '../entities/role.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(UserRole)
    private userRoleRepo: Repository<UserRole>,
    @InjectRepository(RolePermission)
    private rolePermRepo: Repository<RolePermission>,
    @InjectRepository(UserPermission)
    private userPermRepo: Repository<UserPermission>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get user permissions
    const userPerms = await this.userPermRepo.find({
      where: { userId: user.id },
    });
    const userPermSet = new Set(userPerms.map((up) => up.permissionId));

    // Get user roles
    const userRoles = await this.userRoleRepo.find({
      where: { userId: user.id },
    });
    const roleIds = userRoles.map((ur) => ur.roleId);

    // Get all permissions from roles (including inherited roles)
    const allRoleIds = await this.getAllInheritedRoleIds(roleIds);
    const rolePerms = await this.rolePermRepo.findByIds(allRoleIds.map((roleId) => ({ roleId })));
    const rolePermSet = new Set(rolePerms.map((rp) => rp.permissionId));

    // Combine user and role permissions
    const effectivePerms = new Set([...userPermSet, ...rolePermSet]);

    // Check if user has all required permissions
    const hasAll = requiredPermissions.every((perm) => effectivePerms.has(perm));
    if (!hasAll) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }

  // Recursively get all inherited role IDs
  private async getAllInheritedRoleIds(
    roleIds: string[],
    visited = new Set<string>(),
  ): Promise<string[]> {
    const allIds = new Set(roleIds);
    for (const roleId of roleIds) {
      if (visited.has(roleId)) continue;
      visited.add(roleId);
      const role = await this.roleRepo.findOne({ where: { id: roleId } });
      if (role && role.parentRoleId) {
        allIds.add(role.parentRoleId);
        const parentIds = await this.getAllInheritedRoleIds([role.parentRoleId], visited);
        parentIds.forEach((id) => allIds.add(id));
      }
    }
    return Array.from(allIds);
  }
}
