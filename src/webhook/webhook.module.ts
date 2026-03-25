import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookSecurityService } from './services/webhook-security.service';
import { WebhookLoggingService } from './services/webhook-logging.service';
import { WebhookLog } from './entities/webhook-log.entity';
import { WebhookAuthGuard } from './guards/webhook-auth.guard';
import { WebhookLoggingInterceptor } from './interceptors/webhook-logging.interceptor';
import { WebhookMonitoringController } from './controllers/webhook-monitoring.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WebhookLog])],
  controllers: [WebhookMonitoringController],
  providers: [
    WebhookSecurityService,
    WebhookLoggingService,
    WebhookAuthGuard,
    WebhookLoggingInterceptor,
  ],
  exports: [
    WebhookSecurityService,
    WebhookLoggingService,
    WebhookAuthGuard,
    WebhookLoggingInterceptor,
  ],
})
export class WebhookModule {}
