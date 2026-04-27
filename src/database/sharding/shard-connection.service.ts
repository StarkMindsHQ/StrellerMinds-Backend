import { Injectable } from '@nestjs/common';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ShardingConfig, ShardConfig } from './sharding.config';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ShardConnectionService {
  private readonly connections: Map<string, DataSource> = new Map();
  private readonly shardConfigs: Map<string, ShardConfig> = new Map();

  constructor(
    private readonly shardingConfig: ShardingConfig,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initializes all shard connections
   */
  async initializeConnections(): Promise<void> {
    const shards = this.shardingConfig.getAllShards();
    
    for (const shard of shards) {
      await this.createConnection(shard);
    }
  }

  /**
   * Creates a connection to a specific shard
   */
  private async createConnection(shardConfig: ShardConfig): Promise<DataSource> {
    const connectionOptions: DataSourceOptions = {
      type: 'postgres',
      host: shardConfig.host,
      port: shardConfig.port,
      username: shardConfig.username,
      password: shardConfig.password,
      database: shardConfig.database,
      
      extra: {
        max: this.configService.get<number>('DATABASE_POOL_MAX', 10),
        min: this.configService.get<number>('DATABASE_POOL_MIN', 1),
        idleTimeoutMillis: this.configService.get<number>('DATABASE_IDLE_TIMEOUT', 30000),
        connectionTimeoutMillis: this.configService.get<number>('DATABASE_CONNECTION_TIMEOUT', 10000),
        acquireTimeoutMillis: this.configService.get<number>('DATABASE_ACQUIRE_TIMEOUT', 60000),
        createTimeoutMillis: this.configService.get<number>('DATABASE_CREATE_TIMEOUT', 30000),
        destroyTimeoutMillis: this.configService.get<number>('DATABASE_DESTROY_TIMEOUT', 5000),
        reapIntervalMillis: this.configService.get<number>('DATABASE_REAP_INTERVAL', 1000),
        createRetryIntervalMillis: this.configService.get<number>('DATABASE_CREATE_RETRY_INTERVAL', 200),
      },

      autoLoadEntities: true,
      synchronize: false,
      logging: this.configService.get('NODE_ENV') !== 'production',
    };

    const dataSource = new DataSource(connectionOptions);
    
    try {
      await dataSource.initialize();
      this.connections.set(shardConfig.id, dataSource);
      this.shardConfigs.set(shardConfig.id, shardConfig);
      console.log(`Successfully connected to shard: ${shardConfig.id}`);
    } catch (error) {
      console.error(`Failed to connect to shard ${shardConfig.id}:`, error);
      throw error;
    }

    return dataSource;
  }

  /**
   * Gets a connection to a specific shard
   */
  getConnection(shardId: string): DataSource | undefined {
    return this.connections.get(shardId);
  }

  /**
   * Gets all active connections
   */
  getAllConnections(): Map<string, DataSource> {
    return new Map(this.connections);
  }

  /**
   * Gets the primary shard connection
   */
  getPrimaryConnection(): DataSource | undefined {
    const primaryShard = this.shardingConfig.getPrimaryShard();
    return primaryShard ? this.connections.get(primaryShard.id) : undefined;
  }

  /**
   * Closes a specific shard connection
   */
  async closeConnection(shardId: string): Promise<void> {
    const connection = this.connections.get(shardId);
    if (connection && connection.isInitialized) {
      await connection.destroy();
      this.connections.delete(shardId);
      this.shardConfigs.delete(shardId);
      console.log(`Closed connection to shard: ${shardId}`);
    }
  }

  /**
   * Closes all shard connections
   */
  async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.entries()).map(
      async ([shardId, connection]) => {
        if (connection.isInitialized) {
          await connection.destroy();
          console.log(`Closed connection to shard: ${shardId}`);
        }
      }
    );

    await Promise.all(closePromises);
    this.connections.clear();
    this.shardConfigs.clear();
  }

  /**
   * Checks if a shard connection is healthy
   */
  async isConnectionHealthy(shardId: string): Promise<boolean> {
    const connection = this.connections.get(shardId);
    if (!connection || !connection.isInitialized) {
      return false;
    }

    try {
      await connection.query('SELECT 1');
      return true;
    } catch (error) {
      console.error(`Health check failed for shard ${shardId}:`, error);
      return false;
    }
  }

  /**
   * Gets connection statistics for monitoring
   */
  getConnectionStats(): Array<{
    shardId: string;
    host: string;
    port: number;
    database: string;
    isHealthy: boolean;
  }> {
    return Array.from(this.shardConfigs.entries()).map(([shardId, config]) => ({
      shardId,
      host: config.host,
      port: config.port,
      database: config.database,
      isHealthy: false, // Will be updated by health check
    }));
  }

  /**
   * Reconnects to a specific shard
   */
  async reconnectShard(shardId: string): Promise<void> {
    const shardConfig = this.shardConfigs.get(shardId);
    if (!shardConfig) {
      throw new Error(`Shard configuration not found for ${shardId}`);
    }

    await this.closeConnection(shardId);
    await this.createConnection(shardConfig);
  }

  /**
   * Gets the number of active connections
   */
  getActiveConnectionCount(): number {
    return this.connections.size;
  }
}
