import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';

import { Webhook } from './entities/webhook.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';

import { WebhookService } from './services/webhook.service';
import { WebhookDeliveryService } from './services/webhook-delivery.service';
import { WebhookEventService } from './services/webhook-event.service';

import { WebhookController } from './controllers/webhook.controller';
import { WebhookAdminController } from './controllers/webhook-admin.controller';

import { WebhookRetryTask } from './tasks/webhook-retry.task';
import { WebhookEventInterceptor } from './interceptors/webhook-event.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook, WebhookDelivery]),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [WebhookController, WebhookAdminController],
  providers: [
    WebhookService,
    WebhookDeliveryService,
    WebhookEventService,
    WebhookRetryTask,
    WebhookEventInterceptor,
  ],
  exports: [WebhookService, WebhookDeliveryService, WebhookEventService, WebhookEventInterceptor],
})
export class WebhookModule {}
