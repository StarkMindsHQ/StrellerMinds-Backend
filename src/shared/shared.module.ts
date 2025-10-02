/**
 * SharedModule provides shared services (e.g., RedisService) for use across the application.
 * Import this module to access shared infrastructure utilities.
 *
 * @module Shared
 */
import { Module } from '@nestjs/common';
import { RedisService } from './services/redis.service';

@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class SharedModule {}
