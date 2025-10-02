import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Repository, FindOptionsWhere, FindManyOptions } from 'typeorm';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export abstract class BaseService<T> {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly defaultPageSize = 10;
  protected readonly maxPageSize = 100;

  constructor(protected readonly repository: Repository<T>) {}

  /**
   * Create a new entity
   */
  protected async createEntity(data: Partial<T>): Promise<T> {
    try {
      const entity = this.repository.create(data);
      return await this.repository.save(entity);
    } catch (error) {
      this.handleError(error, 'create entity');
    }
  }

  /**
   * Find entity by ID with optional relations
   */
  protected async findEntityById(id: string, relations: string[] = []): Promise<T> {
    try {
      const entity = await this.repository.findOne({
        where: { id } as FindOptionsWhere<T>,
        relations,
      });

      if (!entity) {
        throw new NotFoundException(`Entity with ID ${id} not found`);
      }

      return entity;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleError(error, 'find entity by ID', `ID: ${id}`);
    }
  }

  /**
   * Find entities with pagination and filtering
   */
  protected async findEntitiesWithPagination(
    options: FindManyOptions<T> & PaginationOptions,
  ): Promise<PaginatedResult<T>> {
    try {
      const {
        page = 1,
        limit = this.defaultPageSize,
        sortBy,
        sortOrder = 'ASC',
        ...findOptions
      } = options;

      // Ensure page and limit are within reasonable bounds
      const safePage = Math.max(1, page);
      const safeLimit = Math.min(Math.max(1, limit), this.maxPageSize);
      const skip = (safePage - 1) * safeLimit;

      const [data, total] = await this.repository.findAndCount({
        ...findOptions,
        skip,
        take: safeLimit,
        order: sortBy ? { [sortBy]: sortOrder } : undefined,
      });

      return {
        data,
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      };
    } catch (error) {
      this.handleError(error, 'find entities with pagination');
    }
  }

  /**
   * Update entity by ID
   */
  protected async updateEntity(id: string, data: Partial<T>): Promise<T> {
    try {
      await this.findEntityById(id);
      await this.repository.update(id, data);
      return await this.findEntityById(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleError(error, 'update entity', `ID: ${id}`);
    }
  }

  /**
   * Delete entity by ID (soft delete if available, with fallback to hard delete)
   */
  protected async deleteEntity(id: string, forceHardDelete = false): Promise<void> {
    try {
      if (forceHardDelete) {
        const result = await this.repository.delete(id);
        if (result.affected === 0) {
          throw new NotFoundException(`Entity with ID ${id} not found`);
        }
      } else {
        // Try soft delete first, fallback to hard delete if not supported
        try {
          const result = await this.repository.softDelete(id);
          if (result.affected === 0) {
            throw new NotFoundException(`Entity with ID ${id} not found`);
          }
        } catch (softDeleteError) {
          this.logger.warn(`Soft delete not supported for entity ${id}, using hard delete`);
          const result = await this.repository.delete(id);
          if (result.affected === 0) {
            throw new NotFoundException(`Entity with ID ${id} not found`);
          }
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleError(error, 'delete entity', `ID: ${id}`);
    }
  }

  /**
   * Check if entity exists
   */
  protected async entityExists(where: FindOptionsWhere<T>): Promise<boolean> {
    try {
      const count = await this.repository.count({ where });
      return count > 0;
    } catch (error) {
      this.handleError(error, 'check entity existence');
    }
  }

  /**
   * Handle service errors consistently
   */
  protected handleError(error: any, operation: string, context?: string): never {
    const contextInfo = context ? ` in ${context}` : '';
    this.logger.error(`Error during ${operation}${contextInfo}: ${error.message}`, error.stack);

    if (error instanceof NotFoundException || error instanceof InternalServerErrorException) {
      throw error;
    }

    throw new InternalServerErrorException(`Error during ${operation}`);
  }
}
