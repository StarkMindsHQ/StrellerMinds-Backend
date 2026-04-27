import { Injectable } from '@nestjs/common';
import { DataSource, Repository, EntityTarget } from 'typeorm';
import { ShardConnectionService } from './shard-connection.service';
import { ShardKeyService } from './shard-key.service';
import { ShardingConfig } from './sharding.config';

@Injectable()
export class ShardingService {
  constructor(
    private readonly shardConnectionService: ShardConnectionService,
    private readonly shardKeyService: ShardKeyService,
    private readonly shardingConfig: ShardingConfig,
  ) {}

  /**
   * Gets a repository for a specific entity on the appropriate shard
   */
  async getRepository<T>(
    entity: EntityTarget<T>,
    shardKey: string,
    strategy: string = 'user',
  ): Promise<Repository<T>> {
    const shardId = this.shardKeyService.getShardId(shardKey);
    const connection = this.shardConnectionService.getConnection(shardId);
    
    if (!connection) {
      throw new Error(`No connection found for shard: ${shardId}`);
    }

    return connection.getRepository(entity);
  }

  /**
   * Gets repositories across all shards for cross-shard operations
   */
  async getAllRepositories<T>(
    entity: EntityTarget<T>,
  ): Promise<Array<{ shardId: string; repository: Repository<T> }>> {
    const connections = this.shardConnectionService.getAllConnections();
    const repositories: Array<{ shardId: string; repository: Repository<T> }> = [];

    for (const [shardId, connection] of connections) {
      if (connection.isInitialized) {
        repositories.push({
          shardId,
          repository: connection.getRepository(entity),
        });
      }
    }

    return repositories;
  }

  /**
   * Executes a query on a specific shard
   */
  async executeOnShard<T>(
    shardKey: string,
    query: (repository: Repository<T>) => Promise<T>,
    entity: EntityTarget<T>,
    strategy: string = 'user',
  ): Promise<T> {
    const repository = await this.getRepository(entity, shardKey, strategy);
    return query(repository);
  }

  /**
   * Executes a query across all shards and aggregates results
   */
  async executeAcrossAllShards<T>(
    query: (repository: Repository<T>) => Promise<T[]>,
    entity: EntityTarget<T>,
  ): Promise<T[]> {
    const repositories = await this.getAllRepositories(entity);
    const results = await Promise.all(
      repositories.map(({ repository }) => query(repository))
    );
    
    return results.flat();
  }

  /**
   * Saves an entity to the appropriate shard
   */
  async save<T>(
    entity: T,
    strategy: string = 'user',
  ): Promise<T> {
    const shardKey = this.shardKeyService.extractShardKey(entity, strategy);
    const repository = await this.getRepository(
      entity.constructor as EntityTarget<T>,
      shardKey,
      strategy,
    );
    
    return repository.save(entity);
  }

  /**
   * Finds an entity by ID across all shards
   */
  async findById<T>(
    entityClass: EntityTarget<T>,
    id: string,
  ): Promise<T | null> {
    const repositories = await this.getAllRepositories(entityClass);
    
    for (const { repository } of repositories) {
      try {
        const result = await repository.findOne({ where: { id } as any });
        if (result) {
          return result;
        }
      } catch (error) {
        // Continue searching other shards if one fails
        console.warn(`Error searching shard for entity ${id}:`, error);
      }
    }
    
    return null;
  }

  /**
   * Finds entities by a specific field across all shards
   */
  async findByField<T>(
    entityClass: EntityTarget<T>,
    field: string,
    value: any,
  ): Promise<T[]> {
    const repositories = await this.getAllRepositories(entityClass);
    const results: T[] = [];
    
    for (const { repository } of repositories) {
      try {
        const result = await repository.find({ 
          where: { [field]: value } as any 
        });
        results.push(...result);
      } catch (error) {
        console.warn(`Error searching shard for ${field}=${value}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Updates an entity on the correct shard
   */
  async update<T>(
    entityClass: EntityTarget<T>,
    id: string,
    updates: Partial<T>,
  ): Promise<T | null> {
    const entity = await this.findById(entityClass, id);
    if (!entity) {
      return null;
    }

    const strategy = this.getEntityStrategy(entityClass);
    const shardKey = this.shardKeyService.extractShardKey(entity, strategy);
    const repository = await this.getRepository(entityClass, shardKey, strategy);
    
    await repository.update(id, updates);
    return repository.findOne({ where: { id } as any });
  }

  /**
   * Deletes an entity from the correct shard
   */
  async delete<T>(
    entityClass: EntityTarget<T>,
    id: string,
  ): Promise<boolean> {
    const entity = await this.findById(entityClass, id);
    if (!entity) {
      return false;
    }

    const strategy = this.getEntityStrategy(entityClass);
    const shardKey = this.shardKeyService.extractShardKey(entity, strategy);
    const repository = await this.getRepository(entityClass, shardKey, strategy);
    
    const result = await repository.delete(id);
    return (result.affected || 0) > 0;
  }

  /**
   * Counts entities across all shards
   */
  async count<T>(entityClass: EntityTarget<T>): Promise<number> {
    const repositories = await this.getAllRepositories(entityClass);
    const counts = await Promise.all(
      repositories.map(({ repository }) => repository.count())
    );
    
    return counts.reduce((sum, count) => sum + count, 0);
  }

  /**
   * Gets sharding statistics
   */
  async getShardingStats(): Promise<{
    totalShards: number;
    activeConnections: number;
    shardDistribution: Map<string, number>;
  }> {
    const strategies = this.shardingConfig.getShardingStrategies();
    const shardDistribution = new Map<string, number>();
    
    // Initialize distribution
    const totalShards = this.shardingConfig.getShardCount();
    for (let i = 0; i < totalShards; i++) {
      shardDistribution.set(`shard-${i}`, 0);
    }

    return {
      totalShards,
      activeConnections: this.shardConnectionService.getActiveConnectionCount(),
      shardDistribution,
    };
  }

  /**
   * Determines the sharding strategy for an entity
   */
  private getEntityStrategy<T>(entityClass: EntityTarget<T>): string {
    const entityName = typeof entityClass === 'string' 
      ? entityClass 
      : (entityClass as any).name;
    
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
   * Migrates data between shards (for rebalancing)
   */
  async migrateData<T>(
    entityClass: EntityTarget<T>,
    fromShardId: string,
    toShardId: string,
    batchSize: number = 100,
  ): Promise<{ migrated: number; errors: number }> {
    const fromConnection = this.shardConnectionService.getConnection(fromShardId);
    const toConnection = this.shardConnectionService.getConnection(toShardId);
    
    if (!fromConnection || !toConnection) {
      throw new Error('Invalid shard connections for migration');
    }

    const fromRepo = fromConnection.getRepository(entityClass);
    const toRepo = toConnection.getRepository(entityClass);
    
    let migrated = 0;
    let errors = 0;
    let offset = 0;
    
    while (true) {
      try {
        const entities = await fromRepo.find({
          take: batchSize,
          skip: offset,
        });
        
        if (entities.length === 0) {
          break;
        }
        
        await toRepo.save(entities);
        await fromRepo.remove(entities);
        
        migrated += entities.length;
        offset += batchSize;
      } catch (error) {
        console.error(`Migration error at offset ${offset}:`, error);
        errors++;
        offset += batchSize;
      }
    }
    
    return { migrated, errors };
  }
}
