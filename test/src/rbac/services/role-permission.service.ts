import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from '../entities/role-permission.entity';

@Injectable()
export class RolePermissionService {
  constructor(
    @InjectRepository(RolePermission)
    private rolePermRepo: Repository<RolePermission>,
  ) {}

  async assignPermission(roleId: string, permissionId: string) {
    const rp = this.rolePermRepo.create({ roleId, permissionId });
    return this.rolePermRepo.save(rp);
  }

  async removePermission(roleId: string, permissionId: string) {
    return this.rolePermRepo.delete({ roleId, permissionId });
  }

  async getPermissionsForRole(roleId: string) {
    return this.rolePermRepo.find({ where: { roleId } });
  }
}
