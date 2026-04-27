import { Module, OnModuleInit } from '@nestjs/common';
import { ShardingConfig } from './sharding.config';
import { ShardKeyService } from './shard-key.service';
import { ShardConnectionService } from './shard-connection.service';
import { ShardingService } from './sharding.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [
    ShardingConfig,
    ShardKeyService,
    ShardConnectionService,
    ShardingService,
  ],
  exports: [
    ShardingConfig,
    ShardKeyService,
    ShardConnectionService,
    ShardingService,
  ],
})
export class ShardingModule implements OnModuleInit {
  constructor(
    private readonly shardConnectionService: ShardConnectionService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.shardConnectionService.initializeConnections();
  }
}
