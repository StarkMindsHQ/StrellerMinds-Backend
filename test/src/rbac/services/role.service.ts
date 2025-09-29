import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';

/**
 * Service for managing roles in the RBAC system.
 */
@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
  ) {}

  /**
   * Create a new role.
   * @param name - The name of the role.
   * @param description - Optional description of the role.
   * @param parentRoleId - Optional ID of the parent role for hierarchical roles.
   * @returns The created role.
   */
  async createRole(name: string, description?: string, parentRoleId?: string) {
    const role = this.roleRepo.create({ name, description, parentRoleId });
    return this.roleRepo.save(role);
  }

  /**
   * Get a role by its ID.
   * @param id - The ID of the role to retrieve.
   * @returns The role with the given ID, or null if not found.
   */
  async getRoleById(id: string) {
    return this.roleRepo.findOne({ where: { id } });
  }

  /**
   * Get all roles.
   * @returns An array of all roles.
   */
  async getAllRoles() {
    return this.roleRepo.find();
  }

  /**
   * Update an existing role.
   * @param id - The ID of the role to update.
   * @param data - Partial data to update the role with.
   * @returns The updated role.
   */
  async updateRole(id: string, data: Partial<Role>) {
    await this.roleRepo.update(id, data);
    return this.getRoleById(id);
  }

  /**
   * Delete a role by its ID.
   * @param id - The ID of the role to delete.
   * @returns The result of the delete operation.
   */
  async deleteRole(id: string) {
    return this.roleRepo.delete(id);
  }
}
