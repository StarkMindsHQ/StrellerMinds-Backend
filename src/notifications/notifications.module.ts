import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { JwtModule } from "@nestjs/jwt"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { NotificationsService } from "./notifications.service"
import { NotificationsController } from "./notifications.controller"
import { NotificationsGateway } from "./notifications.gateway"
import { NotificationDeliveryService } from "./notification-delivery.service"
import { EmailService } from "./providers/email.service"
import { PushNotificationService } from "./providers/push-notification.service"
import { Notification } from "./entities/notification.entity"
import { NotificationTemplate } from "./entities/notification-template.entity"
import { NotificationPreference } from "./entities/notification-preference.entity"
import { UsersModule } from "../users/users.module"
import { InAppService } from './providers/in-app.service';
import { PreferenceService } from "./providers/preferences.service"


@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationTemplate, NotificationPreference]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET"),
        signOptions: { expiresIn: "1d" },
      }),
    }),
    EventEmitterModule.forRoot(),
    UsersModule,
    ConfigModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationDeliveryService,
    EmailService,
    PushNotificationService,
    NotificationsGateway,
    InAppService,
    PreferenceService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}


//To be removed 
//Later On 
//I WANT TO CHANGE A PR 

