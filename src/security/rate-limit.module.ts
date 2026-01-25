import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nestjs/throttler-storage-redis';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
      storage: new ThrottlerStorageRedisService({
        host: 'localhost',
        port: 6379,
      }),
    }),
  ],
})
export class RateLimitModule {}
