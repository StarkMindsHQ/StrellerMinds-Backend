import { Module } from '@nestjs/common';
import { ArchiveService } from './services/archive.service';
import { ArchiveController } from './archive.controller';
import { ArchiveCronService } from './services/archive-cron.service';
import { User } from 'src/users/entities/user.entity';
import { ArchivedUser } from 'src/users/entities/archived-user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from 'src/user-profiles/entities/user-profile.entity';
import { ArchivedUserProfile } from 'src/user-profiles/entities/archived-user-profile.entity';
import { ArchivedPayment } from 'src/payment/entities/archived-payment.entity';
import { ArchivedNotification } from 'src/notification/entities/archived-notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ArchivedUser,
      UserProfile,
      ArchivedUserProfile,
      ArchivedPayment,
      Notification,
      ArchivedNotification,
    ]),
  ],
  controllers: [ArchiveController],
  providers: [ArchiveService, ArchiveCronService],
})
export class ArchiveModule {}
