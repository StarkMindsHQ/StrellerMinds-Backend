import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from './entities/user.entity';
import { PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(
    search?: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<PaginatedResponse<User>> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Apply search filter
    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply cursor-based pagination
    if (cursor) {
      queryBuilder.andWhere('user.id > :cursor', { cursor });
    }

    // Always order by ID for consistent cursor pagination
    queryBuilder.orderBy('user.id', 'ASC');
    
    // Fetch limit + 1 to determine if there are more results
    const fetchLimit = limit + 1;
    queryBuilder.take(fetchLimit);

    const users = await queryBuilder.getMany();

    // Check if there are more results
    const hasMore = users.length > limit;
    if (hasMore) {
      users.pop(); // Remove the extra item
    }

    // Generate next cursor
    const nextCursor = hasMore && users.length > 0 
      ? users[users.length - 1].id 
      : null;

    return {
      data: users,
      nextCursor,
      hasMore,
    };
  }

  async findOne(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }
}
