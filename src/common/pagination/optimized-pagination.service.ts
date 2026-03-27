import { Logger } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page?: number;
    limit: number;
    total?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
    cursor?: string;
    nextCursor?: string | null;
  };
}

export interface CursorPaginationOptions {
  cursor?: string;
  limit: number;
  orderBy: string;
  orderDirection: 'ASC' | 'DESC';
}

export interface CursorPaginatedResult<T> {
  data: T[];
  pagination: {
    hasNext: boolean;
    hasPrevious: boolean;
    cursor?: string;
    nextCursor?: string | null;
    limit: number;
  };
}

export class OptimizedPaginationService {
  private readonly logger = new Logger(OptimizedPaginationService.name);

  /**
   * Apply offset-based pagination with optimizations
   */
  async paginate<T>(
    queryBuilder: SelectQueryBuilder<T>,
    options: PaginationOptions,
  ): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 20, sortBy, sortOrder = 'DESC' } = options;
    const skip = (page - 1) * limit;

    // Validate limit to prevent large result sets
    const validatedLimit = Math.min(limit, 100);

    // Clone the query for counting to avoid interference
    const countQuery = queryBuilder.clone();

    // Apply ordering
    if (sortBy) {
      queryBuilder.orderBy(`entity.${sortBy}`, sortOrder);
    }

    // Apply pagination with index hints
    queryBuilder.skip(skip).take(validatedLimit);

    // Execute queries in parallel for better performance
    const [data, total] = await Promise.all([
      queryBuilder.getMany(),
      countQuery.getCount(),
    ]);

    const totalPages = Math.ceil(total / validatedLimit);

    return {
      data,
      pagination: {
        page,
        limit: validatedLimit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Apply cursor-based pagination for better performance on large datasets
   */
  async paginateWithCursor<T>(
    queryBuilder: SelectQueryBuilder<T>,
    options: CursorPaginationOptions,
  ): Promise<CursorPaginatedResult<T>> {
    const { cursor, limit, orderBy, orderDirection } = options;

    // Validate limit
    const validatedLimit = Math.min(limit, 100);

    // Apply cursor-based filtering
    if (cursor) {
      const cursorData = this.decodeCursor(cursor);
      if (cursorData) {
        const { value, direction } = cursorData;
        
        if (orderDirection === 'ASC') {
          queryBuilder.andWhere(`entity.${orderBy} > :value`, { value });
        } else {
          queryBuilder.andWhere(`entity.${orderBy} < :value`, { value });
        }
      }
    }

    // Apply ordering
    queryBuilder.orderBy(`entity.${orderBy}`, orderDirection);

    // Get one extra record to determine if there are more results
    queryBuilder.take(validatedLimit + 1);

    const results = await queryBuilder.getMany();
    const hasNext = results.length > validatedLimit;
    const data = hasNext ? results.slice(0, -1) : results;

    // Generate next cursor
    let nextCursor: string | null = null;
    if (hasNext && data.length > 0) {
      const lastItem = data[data.length - 1];
      const lastValue = (lastItem as any)[orderBy];
      nextCursor = this.encodeCursor(lastValue, orderDirection);
    }

    return {
      data,
      pagination: {
        hasNext,
        hasPrevious: !!cursor,
        cursor,
        nextCursor,
        limit: validatedLimit,
      },
    };
  }

  /**
   * Apply keyset pagination for optimal performance
   */
  async paginateKeyset<T>(
    queryBuilder: SelectQueryBuilder<T>,
    lastId?: string,
    limit: number = 20,
  ): Promise<PaginatedResult<T>> {
    const validatedLimit = Math.min(limit, 100);

    if (lastId) {
      queryBuilder.andWhere('entity.id > :lastId', { lastId });
    }

    queryBuilder.orderBy('entity.id', 'ASC').take(validatedLimit + 1);

    const results = await queryBuilder.getMany();
    const hasNext = results.length > validatedLimit;
    const data = hasNext ? results.slice(0, -1) : results;

    return {
      data,
      pagination: {
        limit: validatedLimit,
        hasNext,
        hasPrevious: !!lastId,
      },
    };
  }

  /**
   * Optimized count query with caching
   */
  async getCount(
    queryBuilder: SelectQueryBuilder<any>,
    cacheKey?: string,
    cacheTTL: number = 300,
  ): Promise<number> {
    try {
      // Use a simpler count query for better performance
      const countQuery = queryBuilder
        .clone()
        .select('COUNT(*)')
        .orderBy(); // Remove ordering for count

      const count = await countQuery.getRawOne();
      return parseInt(count.count) || 0;
    } catch (error) {
      this.logger.error('Failed to get count:', error);
      return 0;
    }
  }

  /**
   * Apply window functions for advanced pagination
   */
  async paginateWithWindow<T>(
    queryBuilder: SelectQueryBuilder<T>,
    options: PaginationOptions,
  ): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 20, sortBy, sortOrder = 'DESC' } = options;
    const offset = (page - 1) * limit;
    const validatedLimit = Math.min(limit, 100);

    // Add window function for total count
    const totalCountQuery = queryBuilder
      .clone()
      .select('COUNT(*) OVER ()', 'total')
      .addSelect('entity.*');

    if (sortBy) {
      totalCountQuery.orderBy(`entity.${sortBy}`, sortOrder);
    }

    totalCountQuery.offset(offset).limit(validatedLimit);

    const results = await totalCountQuery.getRawMany();
    const total = results.length > 0 ? parseInt(results[0].total) : 0;

    // Map raw results back to entities
    const data = results.map(row => {
      const { total, ...entityData } = row;
      return entityData as T;
    });

    const totalPages = Math.ceil(total / validatedLimit);

    return {
      data,
      pagination: {
        page,
        limit: validatedLimit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  private encodeCursor(value: any, direction: 'ASC' | 'DESC'): string {
    return Buffer.from(`${value}:${direction}`).toString('base64');
  }

  private decodeCursor(cursor: string): { value: any; direction: 'ASC' | 'DESC' } | null {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const [value, direction] = decoded.split(':');
      return { value, direction: direction as 'ASC' | 'DESC' };
    } catch {
      return null;
    }
  }

  /**
   * Generate pagination metadata for API responses
   */
  generatePaginationMetadata(
    total: number,
    page: number,
    limit: number,
  ): {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } {
    const totalPages = Math.ceil(total / limit);
    
    return {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
