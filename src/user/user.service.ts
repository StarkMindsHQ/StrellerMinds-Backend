import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { ShardedUserRepository } from './repositories/sharded-user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly shardedUserRepository: ShardedUserRepository,
  ) {}

  async findAll(search?: string): Promise<User[]> {
    if (search) {
      return this.shardedUserRepository.searchByName(search);
    }
    return this.shardedUserRepository.findActiveUsers();
  }

  async findOne(id: string): Promise<User | null> {
    return this.shardedUserRepository.findById(id);
  }

  async create(userData: Partial<User>): Promise<User> {
    return this.shardedUserRepository.createUser(userData);
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    return this.shardedUserRepository.update(id, updates);
  }

  async delete(id: string): Promise<boolean> {
    return this.shardedUserRepository.delete(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.shardedUserRepository.findByEmail(email);
  }

  async deactivateUser(id: string): Promise<User | null> {
    return this.shardedUserRepository.deactivateUser(id);
  }

  async activateUser(id: string): Promise<User | null> {
    return this.shardedUserRepository.activateUser(id);
  }

  async getUserStats() {
    return this.shardedUserRepository.getUserStats();
  }

  async getPaginatedUsers(
    page: number = 1,
    limit: number = 10,
    filters: {
      isActive?: boolean;
      search?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    return this.shardedUserRepository.getPaginatedUsers(page, limit, filters);
  }
}
