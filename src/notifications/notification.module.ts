import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ScheduleModule } from "@nestjs/schedule"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { Notification } from "./entities/notification.entity"
import { UserNotificationPreference } from "./entities/user-notification-preference.entity"
import { NotificationAnalytics } from "./entities/notification-analytics.entity"
import { User } from "../users/entities/user.entity" // Assuming User entity is in ../users
import { NotificationService } from "./services/notification.service"
import { NotificationPreferenceService } from "./services/notification-preference.service"
import { NotificationAnalyticsService } from "./services/notification-analytics.service"
import { EmailModule } from "../email/email.module"
import { SmsService } from "./services/sms.service"
import { PushNotificationService } from "./services/push-notification.service"
import { NotificationController } from "./notification.controller"
import { NotificationGateway } from "./gateway/notification.gateway"
import { ConfigModule } from "@nestjs/config" // Import ConfigModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, UserNotificationPreference, NotificationAnalytics, User]),
    ScheduleModule.forRoot(), // For cron jobs
    EventEmitterModule.forRoot(), // For event-driven real-time notifications
    ConfigModule, // For accessing environment variables in services
    EmailModule, // Import unified EmailModule
  ],
  providers: [
    NotificationService,
    NotificationPreferenceService,
    NotificationAnalyticsService,
    SmsService,
    PushNotificationService,
    NotificationGateway, // WebSocket Gateway
  ],
  controllers: [NotificationController],
  exports: [NotificationService], // Export NotificationService if other modules need to send notifications
})
export class NotificationModule {}
