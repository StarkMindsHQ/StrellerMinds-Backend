import { Global, Module } from '@nestjs/common';
import { RedisPoolService } from './redis-pool.service';

@Global()
@Module({
  providers: [RedisPoolService],
  exports: [RedisPoolService],
})
export class RedisPoolModule {}
