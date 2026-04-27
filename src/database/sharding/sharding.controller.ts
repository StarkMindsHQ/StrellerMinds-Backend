import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ShardingService } from './sharding.service';
import { ShardConnectionService } from './shard-connection.service';
import { ShardingConfig } from './sharding.config';

@Controller('sharding')
export class ShardingController {
  constructor(
    private readonly shardingService: ShardingService,
    private readonly shardConnectionService: ShardConnectionService,
    private readonly shardingConfig: ShardingConfig,
  ) {}

  @Get('stats')
  async getShardingStats() {
    return this.shardingService.getShardingStats();
  }

  @Get('connections')
  async getConnections() {
    const stats = this.shardConnectionService.getConnectionStats();
    const healthChecks = await Promise.all(
      stats.map(async (stat) => ({
        ...stat,
        isHealthy: await this.shardConnectionService.isConnectionHealthy(stat.shardId),
      }))
    );
    return healthChecks;
  }

  @Get('shards')
  async getShards() {
    return this.shardingConfig.getAllShards();
  }

  @Post('reconnect/:shardId')
  async reconnectShard(@Param('shardId') shardId: string) {
    await this.shardConnectionService.reconnectShard(shardId);
    return { message: `Successfully reconnected to shard: ${shardId}` };
  }

  @Get('health/:shardId')
  async checkShardHealth(@Param('shardId') shardId: string) {
    const isHealthy = await this.shardConnectionService.isConnectionHealthy(shardId);
    return { shardId, isHealthy };
  }

  @Post('migrate')
  async migrateData(
    @Body() body: {
      entityClass: string;
      fromShardId: string;
      toShardId: string;
      batchSize?: number;
    }
  ) {
    const { entityClass, fromShardId, toShardId, batchSize } = body;
    
    try {
      const result = await this.shardingService.migrateData(
        entityClass,
        fromShardId,
        toShardId,
        batchSize
      );
      return result;
    } catch (error) {
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  @Get('distribution')
  async getShardDistribution(@Query('entityClass') entityClass?: string) {
    // This would typically query actual data to get real distribution
    // For now, return a mock distribution based on shard count
    const totalShards = this.shardingConfig.getShardCount();
    const distribution: Record<string, number> = {};
    
    for (let i = 0; i < totalShards; i++) {
      distribution[`shard-${i}`] = Math.floor(Math.random() * 1000);
    }
    
    return distribution;
  }

  @Get('strategies')
  async getShardingStrategies() {
    return this.shardingConfig.getShardingStrategies();
  }
}
