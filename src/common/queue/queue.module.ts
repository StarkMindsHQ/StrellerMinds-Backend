import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueController } from './controllers/queue.controller';
import { QueueMonitoringService } from './services/queue-monitoring.service';
import { DeadLetterQueueService } from './services/dead-letter-queue.service';
import { QueueScalingService } from './services/queue-scaling.service';
import { QueueHealthIndicator } from './health/queue-health.indicator';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
          db: config.get<number>('REDIS_DB', 0),
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 50,
          priority: 0, // Default priority
        },
      }),
      inject: [ConfigService],
    }),

    // Register queues with reliability features
    BullModule.registerQueueAsync({
      name: 'analytics',
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
          db: config.get<number>('REDIS_DB', 0),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 50,
          priority: 0,
        },
        settings: {
          lockDuration: 30000, // 30 seconds
          lockRenewTime: 15000, // 15 seconds
          stalledInterval: 30000, // 30 seconds
          maxStalledCount: 3,
        },
      }),
      inject: [ConfigService],
    }),

    BullModule.registerQueueAsync({
      name: 'file-processing',
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
          db: config.get<number>('REDIS_DB', 0),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 50,
          removeOnFail: 20,
          priority: 0,
        },
        settings: {
          lockDuration: 60000, // 1 minute for file processing
          lockRenewTime: 30000, // 30 seconds
          stalledInterval: 60000, // 1 minute
          maxStalledCount: 2,
        },
      }),
      inject: [ConfigService],
    }),

    BullModule.registerQueueAsync({
      name: 'dead-letter',
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
          db: config.get<number>('REDIS_DB', 1), // Separate DB for DLQ
        },
        defaultJobOptions: {
          attempts: 1, // DLQ jobs don't retry
          removeOnComplete: 1000, // Keep more completed DLQ jobs
          removeOnFail: 0, // Never remove failed DLQ jobs
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [QueueController],
  providers: [
    QueueMonitoringService,
    DeadLetterQueueService,
    QueueScalingService,
    QueueHealthIndicator,
  ],
  exports: [
    BullModule,
    QueueMonitoringService,
    DeadLetterQueueService,
    QueueScalingService,
    QueueHealthIndicator,
  ],
})
export class QueueModule {}
