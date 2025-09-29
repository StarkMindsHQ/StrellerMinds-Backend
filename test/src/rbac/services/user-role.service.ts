import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../entities/user-role.entity';

@Injectable()
export class UserRoleService {
  constructor(
    @InjectRepository(UserRole)
    private userRoleRepo: Repository<UserRole>,
  ) {}

  async assignRole(userId: string, roleId: string) {
    const ur = this.userRoleRepo.create({ userId, roleId });
    return this.userRoleRepo.save(ur);
  }

  async removeRole(userId: string, roleId: string) {
    return this.userRoleRepo.delete({ userId, roleId });
  }

  async getRolesForUser(userId: string) {
    return this.userRoleRepo.find({ where: { userId } });
  }
}
