import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule } from '@nestjs/config';
import { EmailQueue } from '../entities/email-queue.entity';
import { EmailTemplate } from '../entities/email-template.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { EmailAnalytics } from '../entities/email-analytics.entity';
import { Notification } from '../entities/notifications.entity';
import { NotificationLog } from '../entities/notification-log.entity';
import { EmailNotificationsService } from '../services/email-notifications.service';
import { NotificationsService } from '../services/notifications.service';
import { EmailChannel } from '../services/channels/email.channel';
import { SmsChannel } from '../services/channels/sms.channel';
import { PushChannel } from '../services/channels/push.channel';
import { InAppChannel } from '../services/channels/in-app.channel';
import { TemplateService } from '../services/template.service';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { EmailAnalyticsService } from '../services/email-analytics.service';
import { DigestEmailService } from '../services/digest-email.service';
import { UnsubscribeService } from '../services/unsubscribe.service';
import { NotificationsController } from '../controllers/notifications.controller';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      EmailQueue, 
      EmailTemplate, 
      NotificationPreference, 
      EmailAnalytics,
      Notification,
      NotificationLog
    ]),
    MailerModule,
    AuthModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailNotificationsService,
    EmailChannel,
    SmsChannel,
    PushChannel,
    InAppChannel,
    TemplateService,
    NotificationPreferenceService,
    EmailAnalyticsService,
    DigestEmailService,
    UnsubscribeService,
  ],
  exports: [
    NotificationsService,
    EmailNotificationsService,
    TemplateService,
    NotificationPreferenceService,
    EmailAnalyticsService,
    DigestEmailService,
    UnsubscribeService,
  ],
})
export class NotificationsModule {}