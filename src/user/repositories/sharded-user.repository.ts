import { Injectable } from '@nestjs/common';
import { BaseShardedRepository } from '../../database/sharding/base-sharded.repository';
import { ShardingService } from '../../database/sharding/sharding.service';
import { User } from '../entities/user.entity';
import { FindOptionsWhere } from 'typeorm';

@Injectable()
export class ShardedUserRepository extends BaseShardedRepository<User> {
  constructor(shardingService: ShardingService) {
    super(shardingService, User);
  }

  /**
   * Finds a user by email across all shards
   */
  async findByEmail(email: string): Promise<User | null> {
    const users = await this.findByField('email', email);
    return users.length > 0 ? users[0] : null;
  }

  /**
   * Finds active users across all shards
   */
  async findActiveUsers(limit?: number): Promise<User[]> {
    return this.shardingService.executeAcrossAllShards(
      async (repository) => {
        const findOptions: any = { where: { isActive: true } };
        if (limit) {
          findOptions.take = limit;
        }
        return repository.find(findOptions);
      },
      User,
    );
  }

  /**
   * Finds users created within a date range across all shards
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<User[]> {
    return this.shardingService.executeAcrossAllShards(
      async (repository) => {
        return repository.find({
          where: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          } as any,
        });
      },
      User,
    );
  }

  /**
   * Searches users by name across all shards
   */
  async searchByName(query: string): Promise<User[]> {
    return this.shardingService.executeAcrossAllShards(
      async (repository) => {
        return repository
          .createQueryBuilder('user')
          .where('user.firstName ILIKE :query', { query: `%${query}%` })
          .orWhere('user.lastName ILIKE :query', { query: `%${query}%` })
          .orWhere(
            'CONCAT(user.firstName, " ", user.lastName) ILIKE :query',
            { query: `%${query}%` },
          )
          .getMany();
      },
      User,
    );
  }

  /**
   * Updates user last login timestamp
   */
  async updateLastLogin(userId: string): Promise<User | null> {
    return this.update(userId, { updatedAt: new Date() } as any);
  }

  /**
   * Deactivates a user
   */
  async deactivateUser(userId: string): Promise<User | null> {
    return this.update(userId, { isActive: false } as any);
  }

  /**
   * Activates a user
   */
  async activateUser(userId: string): Promise<User | null> {
    return this.update(userId, { isActive: true } as any);
  }

  /**
   * Gets user statistics across all shards
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersCreatedToday: number;
    usersCreatedThisMonth: number;
  }> {
    const stats = await this.shardingService.executeAcrossAllShards(
      async (repository) => {
        const totalUsers = await repository.count();
        const activeUsers = await repository.count({
          where: { isActive: true } as FindOptionsWhere<User>,
        });
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const usersCreatedToday = await repository.count({
          where: {
            createdAt: {
              $gte: today,
            },
          } as any,
        });

        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        const usersCreatedThisMonth = await repository.count({
          where: {
            createdAt: {
              $gte: thisMonth,
            },
          } as any,
        });

        return {
          totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers,
          usersCreatedToday,
          usersCreatedThisMonth,
        };
      },
      User,
    );

    // Aggregate stats across all shards
    return stats.reduce(
      (acc, stat) => ({
        totalUsers: acc.totalUsers + stat.totalUsers,
        activeUsers: acc.activeUsers + stat.activeUsers,
        inactiveUsers: acc.inactiveUsers + stat.inactiveUsers,
        usersCreatedToday: acc.usersCreatedToday + stat.usersCreatedToday,
        usersCreatedThisMonth: acc.usersCreatedThisMonth + stat.usersCreatedThisMonth,
      }),
      {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        usersCreatedToday: 0,
        usersCreatedThisMonth: 0,
      },
    );
  }

  /**
   * Creates a user with automatic shard key assignment
   */
  async createUser(userData: Partial<User>): Promise<User> {
    const user = new User();
    Object.assign(user, userData);
    
    // Set shard key to user ID (will be generated)
    user.setShardKey();
    
    return this.create(userData);
  }

  /**
   * Gets paginated users with filtering
   */
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
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      this.shardingService.executeAcrossAllShards(
        async (repository) => {
          let query = repository.createQueryBuilder('user');
          
          if (filters.isActive !== undefined) {
            query = query.andWhere('user.isActive = :isActive', { 
              isActive: filters.isActive 
            });
          }
          
          if (filters.search) {
            query = query.andWhere(
              '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
              { search: `%${filters.search}%` }
            );
          }
          
          if (filters.startDate) {
            query = query.andWhere('user.createdAt >= :startDate', { 
              startDate: filters.startDate 
            });
          }
          
          if (filters.endDate) {
            query = query.andWhere('user.createdAt <= :endDate', { 
              endDate: filters.endDate 
            });
          }
          
          return query
            .orderBy('user.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getMany();
        },
        User,
      ),
      this.count(),
    ]);

    const flattenedItems = items.flat().slice(0, limit);
    const totalPages = Math.ceil(total / limit);

    return {
      items: flattenedItems,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
