import { Injectable } from '@nestjs/common';
import { Repository, Like, In, Between } from 'typeorm';
import { User, UserStatus, UserRole } from '../../../user/entities/user.entity';
import { BaseRepository } from '../../base/base.repository';
import { Repository as RepoDecorator, Transactional, Cacheable, CacheInvalidate } from '../../decorators/repository.decorators';
import { UnitOfWork } from '../../unit-of-work/unit-of-work';

export interface IUserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByStatus(status: UserStatus): Promise<User[]>;
  findByRole(role: UserRole): Promise<User[]>;
  findActiveUsers(): Promise<User[]>;
  findSuspendedUsers(): Promise<User[]>;
  searchUsers(query: string): Promise<User[]>;
  findUsersByDateRange(startDate: Date, endDate: Date): Promise<User[]>;
  findUsersWithRoles(roles: UserRole[]): Promise<User[]>;
  updateUserStatus(id: string, status: UserStatus): Promise<User | null>;
  bulkUpdateStatus(userIds: string[], status: UserStatus): Promise<any>;
  countByStatus(status: UserStatus): Promise<number>;
  countByRole(role: UserRole): Promise<number>;
}

@Injectable()
@RepoDecorator({ entity: User, cacheable: true, cacheDuration: 300 })
export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor(
    repository: Repository<User>,
    private readonly unitOfWork: UnitOfWork,
  ) {
    super(repository);
  }

  @Cacheable(600) // Cache for 10 minutes
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }

  @Cacheable(600)
  async findByUsername(username: string): Promise<User | null> {
    return this.findOne({ where: { username } });
  }

  @Cacheable(300)
  async findByStatus(status: UserStatus): Promise<User[]> {
    return this.findMany({ where: { status } });
  }

  @Cacheable(300)
  async findByRole(role: UserRole): Promise<User[]> {
    const qb = this.createQueryBuilder('user');
    return qb.where('user.roles LIKE :role', { role: `%${role}%` }).getMany();
  }

  @Cacheable(600)
  async findActiveUsers(): Promise<User[]> {
    return this.findMany({ 
      where: { 
        status: UserStatus.ACTIVE,
      } 
    });
  }

  @Cacheable(300)
  async findSuspendedUsers(): Promise<User[]> {
    return this.findMany({ 
      where: { 
        status: UserStatus.SUSPENDED,
      } 
    });
  }

  @Cacheable(300)
  async searchUsers(query: string): Promise<User[]> {
    const qb = this.createQueryBuilder('user');
    return qb.where(
      '(user.email LIKE :query OR user.username LIKE :query OR user.firstName LIKE :query OR user.lastName LIKE :query)',
      { query: `%${query}%` }
    ).getMany();
  }

  @Cacheable(600)
  async findUsersByDateRange(startDate: Date, endDate: Date): Promise<User[]> {
    return this.findMany({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });
  }

  @Cacheable(300)
  async findUsersWithRoles(roles: UserRole[]): Promise<User[]> {
    const qb = this.createQueryBuilder('user');
    
    roles.forEach((role, index) => {
      if (index === 0) {
        qb.where('user.roles LIKE :role' + index, { ['role' + index]: `%${role}%` });
      } else {
        qb.orWhere('user.roles LIKE :role' + index, { ['role' + index]: `%${role}%` });
      }
    });
    
    return qb.getMany();
  }

  @Transactional()
  @CacheInvalidate('UserRepository:*')
  async updateUserStatus(id: string, status: UserStatus): Promise<User | null> {
    await this.update(id, { status });
    return this.findOneById(id);
  }

  @Transactional()
  @CacheInvalidate('UserRepository:*')
  async bulkUpdateStatus(userIds: string[], status: UserStatus): Promise<any> {
    return this.updateMany(userIds, { status });
  }

  @Cacheable(300)
  async countByStatus(status: UserStatus): Promise<number> {
    return this.count({ where: { status } });
  }

  @Cacheable(300)
  async countByRole(role: UserRole): Promise<number> {
    const qb = this.createQueryBuilder('user');
    return qb.where('user.roles LIKE :role', { role: `%${role}%` }).getCount();
  }

  // Advanced query methods
  async findUsersWithPaginationAndFilters(
    page: number,
    limit: number,
    filters: {
      search?: string;
      status?: UserStatus;
      role?: UserRole;
      createdAfter?: Date;
      createdBefore?: Date;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    }
  ) {
    const qb = this.createQueryBuilder('user');

    if (filters.search) {
      qb.andWhere(
        '(user.email LIKE :search OR user.username LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.status) {
      qb.andWhere('user.status = :status', { status: filters.status });
    }

    if (filters.role) {
      qb.andWhere('user.roles LIKE :role', { role: `%${filters.role}%` });
    }

    if (filters.createdAfter) {
      qb.andWhere('user.createdAt >= :createdAfter', { createdAfter: filters.createdAfter });
    }

    if (filters.createdBefore) {
      qb.andWhere('user.createdAt <= :createdBefore', { createdBefore: filters.createdBefore });
    }

    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';
    
    qb.orderBy(`user.${sortBy}`, sortOrder);

    return this.findWithPagination(page, limit, qb.getQuery());
  }

  async findUsersWithCursorPagination(
    cursor?: string,
    limit: number = 10,
    filters?: {
      status?: UserStatus;
      role?: UserRole;
    }
  ) {
    const qb = this.createQueryBuilder('user');

    if (filters?.status) {
      qb.andWhere('user.status = :status', { status: filters.status });
    }

    if (filters?.role) {
      qb.andWhere('user.roles LIKE :role', { role: `%${filters.role}%` });
    }

    qb.orderBy('user.createdAt', 'DESC').addOrderBy('user.id', 'DESC');

    return this.findWithCursor(cursor, limit, qb.getQuery());
  }

  // Soft delete methods with proper cleanup
  @Transactional()
  @CacheInvalidate('UserRepository:*')
  async softDeleteUser(id: string, deletedBy?: string): Promise<void> {
    await this.update(id, { 
      deletedBy,
      updatedAt: new Date(),
    } as any);
    await this.softDelete(id);
  }

  @Transactional()
  @CacheInvalidate('UserRepository:*')
  async restoreUser(id: string): Promise<User | null> {
    await this.restore(id);
    await this.update(id, { 
      deletedBy: null,
      updatedAt: new Date(),
    } as any);
    return this.findOneById(id);
  }
}
