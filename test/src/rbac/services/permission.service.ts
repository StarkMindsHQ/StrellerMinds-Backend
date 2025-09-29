import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private permRepo: Repository<Permission>,
  ) {}

  async createPermission(name: string, description?: string) {
    const perm = this.permRepo.create({ name, description });
    return this.permRepo.save(perm);
  }

  async getPermissionById(id: string) {
    return this.permRepo.findOne({ where: { id } });
  }

  async getAllPermissions() {
    return this.permRepo.find();
  }

  async updatePermission(id: string, data: Partial<Permission>) {
    await this.permRepo.update(id, data);
    return this.getPermissionById(id);
  }

  async deletePermission(id: string) {
    return this.permRepo.delete(id);
  }
}
