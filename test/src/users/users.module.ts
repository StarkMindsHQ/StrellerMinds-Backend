/**
 * UsersModule provides user management, authentication, and progress tracking features.
 *
 * @module Users
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';

import { UsersController } from './users.controller';
import { UsersService } from './services/users.service';
import { AccountDeletionConfirmationService } from './services/account.deletion.confirmation.service';
import { ProgressService } from './services/progress.service';
import { ProgressController } from './controllers/progress.controller';
import { AdminUsersController } from './admin.users.controller';

import { User } from './entities/user.entity';
import { WalletInfo } from './entities/wallet-info.entity';
import { UserSettings } from './entities/user-settings.entity';
import { UserProgress } from './entities/user-progress.entity';

import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../lesson/entity/lesson.entity';
// Import the CourseModule ENTITY (not the module)
import { CourseModule as CourseModuleEntity } from '../courses/entities/course-module.entity';

import { AuditLog } from 'src/audit/entities/audit.log.entity';
import { AuditLogModule } from 'src/audit/audit.log.module';

import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

import { EmailModule } from 'src/email/email.module';
import { SharedModule } from 'src/shared/shared.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      WalletInfo,
      AuditLog,
      UserSettings,
      UserProgress,
      Course,
      Lesson,
      CourseModuleEntity, // Add the CourseModule entity here
    ]),
    AuditLogModule,
    ConfigModule,
    EmailModule,
    CloudinaryModule,
    SharedModule,
    CommonModule, // Import CommonModule for shared services
  ],
  controllers: [UsersController, ProgressController, AdminUsersController],
  providers: [
    UsersService,
    AccountDeletionConfirmationService,
    ProgressService,
    CloudinaryService,
  ],
  exports: [UsersService, AccountDeletionConfirmationService],
})
export class UsersModule {}
