import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';

import { PushSubscription } from './entities/push-subscription.entity';
import { OfflineSync } from './entities/offline-sync.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { CachePolicy } from './entities/cache-policy.entity';

import { PushNotificationService } from './services/push-notification.service';
import { OfflineSyncService } from './services/offline-sync.service';
import { CacheOptimizationService } from './services/cache-optimization.service';
import { BackgroundSyncService } from './services/background-sync.service';

import { PushNotificationController } from './controllers/push-notification.controller';
import { OfflineSyncController } from './controllers/offline-sync.controller';
import { CacheController } from './controllers/cache.controller';

import { PushNotificationProcessor } from './processors/push-notification.processor';
import { BackgroundSyncProcessor } from './processors/background-sync.processor';

import { CacheInterceptor } from './interceptors/cache.interceptor';
import { OfflineMiddleware } from './middleware/offline.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([PushSubscription, OfflineSync, NotificationTemplate, CachePolicy]),
    BullModule.registerQueue(
      { name: 'push-notifications' },
      { name: 'background-sync' },
      { name: 'cache-invalidation' },
    ),
    ConfigModule,
  ],
  controllers: [PushNotificationController, OfflineSyncController, CacheController],
  providers: [
    PushNotificationService,
    OfflineSyncService,
    CacheOptimizationService,
    BackgroundSyncService,
    PushNotificationProcessor,
    BackgroundSyncProcessor,
    CacheInterceptor,
    OfflineMiddleware,
  ],
  exports: [
    PushNotificationService,
    OfflineSyncService,
    CacheOptimizationService,
    BackgroundSyncService,
  ],
})
export class PWAModule {}
