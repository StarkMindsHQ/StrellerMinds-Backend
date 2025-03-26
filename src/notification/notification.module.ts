import { Module } from '@nestjs/common';
import { Notification } from './entities/notification.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notification.service';
import { NotificationsController } from './notification.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationModule {}
