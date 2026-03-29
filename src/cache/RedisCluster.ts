import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cluster, Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

export interface RedisClusterConfig {
  nodes: Array<{
    host: string;
    port: number;
    password?: string;
  }>;
  options: {
    redisOptions?: {
      password?: string;
      tls?: boolean;
      maxRetriesPerRequest?: number;
      retryDelayOnFailover?: number;
    };
    enableOfflineQueue?: boolean;
    maxRetriesPerRequest?: number;
    retryDelayOnFailover?: number;
    enableReadyCheck?: boolean;
    slotsRefreshTimeout?: number;
  };
}

export interface CacheMetadata {
  ttl: number;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  strategy: 'write-through' | 'write-behind' | 'cache-aside';
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

@Injectable()
export class RedisClusterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisClusterService.name);
  private cluster: Cluster;
  private readonly metadataKeyPrefix = 'meta:';
  private readonly tagKeyPrefix = 'tag:';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeCluster();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cluster) {
      await this.cluster.quit();
    }
  }

  private async initializeCluster(): Promise<void> {
    const config = this.getClusterConfig();
    
    try {
      this.cluster = new Cluster(config.nodes, config.options);
      
      this.cluster.on('connect', () => {
        this.logger.log('Redis cluster connected');
      });

      this.cluster.on('error', (error) => {
        this.logger.error('Redis cluster error:', error);
      });

      this.cluster.on('node error', (error, node) => {
        this.logger.error(`Redis node error on ${node.options.host}:${node.options.port}:`, error);
      });

      this.cluster.on('failover', (type, from, to, slots) => {
        this.logger.warn(`Redis failover: ${type} from ${from} to ${to}, slots: ${slots.length}`);
      });

      // Test connection
      await this.cluster.ping();
      this.logger.log('Redis cluster initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize Redis cluster:', error);
      throw error;
    }
  }

  private getClusterConfig(): RedisClusterConfig {
    const nodes = this.configService.get<string>('REDIS_CLUSTER_NODES', 'localhost:6379').split(',');
    
    return {
      nodes: nodes.map(node => {
        const [host, port] = node.split(':');
        return {
          host: host.trim(),
          port: parseInt(port.trim(), 10),
          password: this.configService.get<string>('REDIS_PASSWORD'),
        };
      }),
      options: {
        redisOptions: {
          password: this.configService.get<string>('REDIS_PASSWORD'),
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
        },
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        slotsRefreshTimeout: 10000,
      },
    };
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cluster.get(key);
      if (value === null) {
        return null;
      }

      // Update access metadata
      await this.updateAccessMetadata(key);
      
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to get key ${key}:`, error);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    ttl: number,
    metadata: Partial<CacheMetadata> = {},
  ): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      const pipeline = this.cluster.pipeline();

      // Set the main value
      pipeline.setex(key, ttl, serializedValue);

      // Set metadata
      const fullMetadata: CacheMetadata = {
        ttl,
        tags: metadata.tags || [],
        priority: metadata.priority || 'medium',
        strategy: metadata.strategy || 'cache-aside',
        createdAt: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
        ...metadata,
      };

      const metadataKey = this.metadataKeyPrefix + key;
      pipeline.setex(metadataKey, ttl, JSON.stringify(fullMetadata));

      // Add to tag indexes
      for (const tag of fullMetadata.tags) {
        const tagKey = this.tagKeyPrefix + tag;
        pipeline.sadd(tagKey, key);
        pipeline.expire(tagKey, ttl);
      }

      await pipeline.exec();
      this.logger.debug(`Set key ${key} with TTL ${ttl}s`);
    } catch (error) {
      this.logger.error(`Failed to set key ${key}:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      const pipeline = this.cluster.pipeline();
      
      // Delete main value
      pipeline.del(key);
      
      // Delete metadata
      const metadataKey = this.metadataKeyPrefix + key;
      pipeline.del(metadataKey);

      // Remove from tag indexes
      const metadata = await this.getMetadata(key);
      if (metadata && metadata.tags.length > 0) {
        for (const tag of metadata.tags) {
          const tagKey = this.tagKeyPrefix + tag;
          pipeline.srem(tagKey, key);
        }
      }

      await pipeline.exec();
      this.logger.debug(`Deleted key ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete key ${key}:`, error);
      throw error;
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      const tagKey = this.tagKeyPrefix + tag;
      const keys = await this.cluster.smembers(tagKey);
      
      if (keys.length === 0) {
        return;
      }

      const pipeline = this.cluster.pipeline();
      
      // Delete all keys with this tag
      for (const key of keys) {
        pipeline.del(key);
        pipeline.del(this.metadataKeyPrefix + key);
      }
      
      // Delete the tag index
      pipeline.del(tagKey);
      
      await pipeline.exec();
      this.logger.debug(`Invalidated ${keys.length} keys with tag ${tag}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate by tag ${tag}:`, error);
      throw error;
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.getKeysByPattern(pattern);
      
      if (keys.length === 0) {
        return;
      }

      const pipeline = this.cluster.pipeline();
      
      for (const key of keys) {
        pipeline.del(key);
        pipeline.del(this.metadataKeyPrefix + key);
      }
      
      await pipeline.exec();
      this.logger.debug(`Invalidated ${keys.length} keys matching pattern ${pattern}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate pattern ${pattern}:`, error);
      throw error;
    }
  }

  async getMetadata(key: string): Promise<CacheMetadata | null> {
    try {
      const metadataKey = this.metadataKeyPrefix + key;
      const metadata = await this.cluster.get(metadataKey);
      
      if (metadata === null) {
        return null;
      }
      
      return JSON.parse(metadata) as CacheMetadata;
    } catch (error) {
      this.logger.error(`Failed to get metadata for key ${key}:`, error);
      return null;
    }
  }

  async getKeysByPattern(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    
    // Use SCAN to iterate through all keys in the cluster
    const nodes = this.cluster.nodes();
    
    for (const node of nodes) {
      let cursor = '0';
      
      do {
        try {
          const reply = await node.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = reply[0];
          const scannedKeys = reply[1];
          keys.push(...scannedKeys);
        } catch (error) {
          this.logger.error(`Failed to scan node ${node.options.host}:${node.options.port}:`, error);
        }
      } while (cursor !== '0');
    }
    
    return keys;
  }

  async getDbSize(): Promise<number> {
    try {
      const nodes = this.cluster.nodes();
      let totalSize = 0;
      
      for (const node of nodes) {
        try {
          const info = await node.info('memory');
          const match = info.match(/used_memory:(\d+)/);
          if (match) {
            totalSize += parseInt(match[1], 10);
          }
        } catch (error) {
          this.logger.error(`Failed to get memory info from node:`, error);
        }
      }
      
      return totalSize;
    } catch (error) {
      this.logger.error('Failed to get database size:', error);
      return 0;
    }
  }

  async getClusterInfo(): Promise<any> {
    try {
      const info = await this.cluster.info();
      const nodes = this.cluster.nodes().map(node => ({
        host: node.options.host,
        port: node.options.port,
        status: node.status,
      }));
      
      return {
        info,
        nodes,
        connected: this.cluster.status === 'ready',
      };
    } catch (error) {
      this.logger.error('Failed to get cluster info:', error);
      return null;
    }
  }

  async flushAll(): Promise<void> {
    try {
      await this.cluster.flushall();
      this.logger.warn('Flushed all keys from Redis cluster');
    } catch (error) {
      this.logger.error('Failed to flush all keys:', error);
      throw error;
    }
  }

  private async updateAccessMetadata(key: string): Promise<void> {
    try {
      const metadataKey = this.metadataKeyPrefix + key;
      const metadata = await this.cluster.get(metadataKey);
      
      if (metadata) {
        const parsed = JSON.parse(metadata) as CacheMetadata;
        parsed.accessCount += 1;
        parsed.lastAccessed = Date.now();
        
        await this.cluster.set(metadataKey, JSON.stringify(parsed), 'EX', parsed.ttl);
      }
    } catch (error) {
      // Don't throw errors for metadata updates
      this.logger.debug(`Failed to update access metadata for key ${key}:`, error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.cluster.ping();
      return true;
    } catch (error) {
      this.logger.error('Redis cluster health check failed:', error);
      return false;
    }
  }
}
