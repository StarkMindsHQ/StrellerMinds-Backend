import { Injectable } from '@nestjs/common';
import { Repository, EntityTarget, FindOptionsWhere, DeepPartial } from 'typeorm';
import { ShardingService } from './sharding.service';

@Injectable()
export abstract class BaseShardedRepository<T> {
  constructor(
    protected readonly shardingService: ShardingService,
    protected readonly entityClass: EntityTarget<T>,
  ) {}

  /**
   * Creates a new entity with sharding support
   */
  async create(entityData: DeepPartial<T>): Promise<T> {
    const entity = this.entityClass as any;
    const newEntity = new entity();
    
    Object.assign(newEntity, entityData);
    
    // Set shard key if entity has the method
    if (typeof newEntity.setShardKey === 'function') {
      newEntity.setShardKey();
    }
    
    return this.shardingService.save(newEntity, this.getShardingStrategy());
  }

  /**
   * Finds an entity by ID across all shards
   */
  async findById(id: string): Promise<T | null> {
    return this.shardingService.findById(this.entityClass, id);
  }

  /**
   * Finds entities by a specific field across all shards
   */
  async findByField(field: string, value: any): Promise<T[]> {
    return this.shardingService.findByField(this.entityClass, field, value);
  }

  /**
   * Updates an entity on the correct shard
   */
  async update(id: string, updates: DeepPartial<T>): Promise<T | null> {
    return this.shardingService.update(this.entityClass, id, updates);
  }

  /**
   * Deletes an entity from the correct shard
   */
  async delete(id: string): Promise<boolean> {
    return this.shardingService.delete(this.entityClass, id);
  }

  /**
   * Counts entities across all shards
   */
  async count(): Promise<number> {
    return this.shardingService.count(this.entityClass);
  }

  /**
   * Finds entities on a specific shard
   */
  async findOnShard(
    shardKey: string,
    options: {
      where?: FindOptionsWhere<T>;
      take?: number;
      skip?: number;
      order?: Record<string, 'ASC' | 'DESC'>;
    } = {},
  ): Promise<T[]> {
    return this.shardingService.executeOnShard(
      shardKey,
      async (repository) => {
        return repository.find({
          where: options.where,
          take: options.take,
          skip: options.skip,
          order: options.order,
        });
      },
      this.entityClass,
      this.getShardingStrategy(),
    );
  }

  /**
   * Finds one entity on a specific shard
   */
  async findOneOnShard(
    shardKey: string,
    options: {
      where?: FindOptionsWhere<T>;
    } = {},
  ): Promise<T | null> {
    return this.shardingService.executeOnShard(
      shardKey,
      async (repository) => {
        return repository.findOne({
          where: options.where,
        });
      },
      this.entityClass,
      this.getShardingStrategy(),
    );
  }

  /**
   * Executes a custom query on a specific shard
   */
  async executeOnShard<R>(
    shardKey: string,
    query: (repository: Repository<T>) => Promise<R>,
  ): Promise<R> {
    return this.shardingService.executeOnShard(
      shardKey,
      query,
      this.entityClass,
      this.getShardingStrategy(),
    );
  }

  /**
   * Executes a custom query across all shards
   */
  async executeAcrossAllShards<R>(
    query: (repository: Repository<T>) => Promise<R[]>,
  ): Promise<R[]> {
    return this.shardingService.executeAcrossAllShards(query, this.entityClass);
  }

  /**
   * Gets the sharding strategy for this entity type
   * Override this method in subclasses to specify custom strategies
   */
  protected getShardingStrategy(): string {
    const entityName = typeof this.entityClass === 'string' 
      ? this.entityClass 
      : (this.entityClass as any).name;
    
    switch (entityName.toLowerCase()) {
      case 'user':
      case 'userprofile':
        return 'user';
      case 'course':
        return 'course';
      default:
        return 'shared';
    }
  }

  /**
   * Gets shard key from entity data
   */
  protected extractShardKey(entityData: any): string {
    const strategy = this.getShardingStrategy();
    
    switch (strategy) {
      case 'user':
        return entityData.userId || entityData.id;
      case 'course':
        return entityData.instructorId || entityData.createdBy || entityData.id;
      default:
        return entityData.id;
    }
  }

  /**
   * Validates if entity data has required shard key
   */
  protected validateShardKey(entityData: any): boolean {
    const shardKey = this.extractShardKey(entityData);
    return shardKey && typeof shardKey === 'string' && shardKey.length > 0;
  }

  /**
   * Gets paginated results across all shards
   */
  async findPaginated(
    page: number = 1,
    limit: number = 10,
    options: {
      where?: FindOptionsWhere<T>;
      order?: Record<string, 'ASC' | 'DESC'>;
    } = {},
  ): Promise<{ items: T[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      this.shardingService.executeAcrossAllShards(
        async (repository) => {
          return repository.find({
            where: options.where,
            take: limit,
            skip,
            order: options.order,
          });
        },
        this.entityClass,
      ),
      this.count(),
    ]);

    const flattenedItems = items.flat();
    const totalPages = Math.ceil(total / limit);

    return {
      items: flattenedItems.slice(0, limit), // Ensure we don't exceed limit
      total,
      page,
      limit,
      totalPages,
    };
  }
}
