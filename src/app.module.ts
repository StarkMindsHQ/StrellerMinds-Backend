import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';

import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { AuthModule } from './auth/auth.module';
import { CertificateModule } from './certificate/certificate.module';
import { ForumModule } from './forum/forum.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationModule } from './notification/notification.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { FilesModule } from './files/files.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { LessonModule } from './lesson/lesson.module';
import { IpfsModule } from './ipfs/ipfs.module';
import { ModerationModule } from './moderation/moderation.module';
import { CatogoryModule } from './catogory/catogory.module';
import { PostModule } from './post/post.module';
import { TopicModule } from './topic/topic.module';
import { SubmissionModule } from './submission/submission.module';
import { UserProfilesModule } from './user-profiles/user-profiles.module';
import { CredentialModule } from './credential/credential.module';
import { MentorshipModule } from './mentorship/mentorship.module';
import { TranslationModule } from './translation/translation.module';
import { I18nModule } from './i18n/i18n.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FeedbackModule } from './feedback/feedback.module';
import { UserSettingsModule } from './user-settings/user-settings.module';
import databaseConfig from './config/database.config';
import { EventSignupModule } from './event-signup/event-signup.module';
import { GdprModule } from './gdpr/gdpr.module';
import { MonitoringModule } from './monitoring/monitoring-module';
import { ProductsModule } from './products/products.module';
import cacheConfig from './config/cache.config';
import { CacheModule } from './cache/cache.module';



const ENV = process.env.NODE_ENV;
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('ENV:', ENV);

@Module({
  imports: [
    // Global Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: !ENV ? '.env' : `.env.${ENV.trim()}`,
      load: [databaseConfig],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.user'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        autoLoadEntities: configService.get<boolean>('database.autoload'),
        synchronize: configService.get<boolean>('database.synchronize'),
        // Connection Pool Settings
        extra: {
          max: configService.get<number>('database.maxPoolSize'),
          min: configService.get<number>('database.minPoolSize'),
          idleTimeoutMillis: configService.get<number>('database.poolIdleTimeout'),
        },
        // Retry Mechanism
        retryAttempts: configService.get<number>('database.retryAttempts'),
        retryDelay: configService.get<number>('database.retryDelay'),
      }),
    }),
    UsersModule,
    CoursesModule,
    AuthModule,
    CertificateModule,
    ForumModule,
    PaymentModule,
    NotificationModule,
    BlockchainModule,
    FilesModule,
    EmailModule,
    HealthModule,
    LessonModule,
    IpfsModule,
    ModerationModule,
    CatogoryModule,
    PostModule,
    TopicModule,
    SubmissionModule,
    UserProfilesModule,
    CredentialModule,
    MentorshipModule,
    FeedbackModule,
    EventSignupModule,
    TranslationModule,
    I18nModule,
    UserSettingsModule,
    GdprModule,
    MonitoringModule,
    CacheModule,
    UsersModule,
    ProductsModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
