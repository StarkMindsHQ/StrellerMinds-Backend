import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ShardConfig {
  id: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  isPrimary?: boolean;
}

export interface ShardingStrategy {
  name: string;
  shardKey: string;
  algorithm: 'consistent_hash' | 'range' | 'hash';
}

@Injectable()
export class ShardingConfig {
  private readonly shards: Map<string, ShardConfig> = new Map();
  private readonly shardCount: number;

  constructor(private configService: ConfigService) {
    this.shardCount = this.configService.get<number>('DATABASE_SHARD_COUNT', 4);
    this.initializeShards();
  }

  private initializeShards(): void {
    for (let i = 0; i < this.shardCount; i++) {
      const shardConfig: ShardConfig = {
        id: `shard-${i}`,
        host: this.configService.get(`DATABASE_SHARD_${i}_HOST`, 'localhost'),
        port: this.configService.get<number>(`DATABASE_SHARD_${i}_PORT`, 5432 + i),
        database: this.configService.get(`DATABASE_SHARD_${i}_NAME`, `strellerminds_shard_${i}`),
        username: this.configService.get(`DATABASE_SHARD_${i}_USER`, 'postgres'),
        password: this.configService.get(`DATABASE_SHARD_${i}_PASSWORD`),
        isPrimary: i === 0,
      };
      
      this.shards.set(shardConfig.id, shardConfig);
    }
  }

  getShardConfig(shardId: string): ShardConfig | undefined {
    return this.shards.get(shardId);
  }

  getAllShards(): ShardConfig[] {
    return Array.from(this.shards.values());
  }

  getPrimaryShard(): ShardConfig | undefined {
    return this.getAllShards().find(shard => shard.isPrimary);
  }

  getShardCount(): number {
    return this.shardCount;
  }

  getShardingStrategies(): ShardingStrategy[] {
    return [
      {
        name: 'user',
        shardKey: 'userId',
        algorithm: 'consistent_hash',
      },
      {
        name: 'course',
        shardKey: 'instructorId',
        algorithm: 'consistent_hash',
      },
      {
        name: 'shared',
        shardKey: 'id',
        algorithm: 'hash',
      },
    ];
  }
}
