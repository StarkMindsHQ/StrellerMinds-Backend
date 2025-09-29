import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPermission } from '../entities/user-permission.entity';

@Injectable()
export class UserPermissionService {
  constructor(
    @InjectRepository(UserPermission)
    private userPermRepo: Repository<UserPermission>,
  ) {}

  async assignPermission(userId: string, permissionId: string) {
    const up = this.userPermRepo.create({ userId, permissionId });
    return this.userPermRepo.save(up);
  }

  async removePermission(userId: string, permissionId: string) {
    return this.userPermRepo.delete({ userId, permissionId });
  }

  async getPermissionsForUser(userId: string) {
    return this.userPermRepo.find({ where: { userId } });
  }
}
