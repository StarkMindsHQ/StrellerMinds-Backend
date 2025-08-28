import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Repository, FindOptionsWhere, FindManyOptions } from 'typeorm';

export interface PaginationOptions {
  page: number;
  limit: number;
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

  constructor(protected readonly repository: Repository<T>) {}

  /**
   * Create a new entity
   */
  protected async createEntity(data: Partial<T>): Promise<T> {
    try {
      const entity = this.repository.create(data);
      return await this.repository.save(entity);
    } catch (error) {
      this.logger.error(`Error creating entity: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error creating entity');
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
      this.logger.error(`Error finding entity by ID ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error fetching entity');
    }
  }

  /**
   * Find entities with pagination and filtering
   */
  protected async findEntitiesWithPagination(
    options: FindManyOptions<T> & PaginationOptions
  ): Promise<PaginatedResult<T>> {
    try {
      const { page, limit, ...findOptions } = options;
      const [data, total] = await this.repository.findAndCount({
        ...findOptions,
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Error finding entities: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error fetching entities');
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
      this.logger.error(`Error updating entity ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error updating entity');
    }
  }

  /**
   * Delete entity by ID (soft delete if available)
   */
  protected async deleteEntity(id: string): Promise<void> {
    try {
      const result = await this.repository.softDelete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`Entity with ID ${id} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error deleting entity ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error deleting entity');
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
      this.logger.error(`Error checking entity existence: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error checking entity existence');
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
