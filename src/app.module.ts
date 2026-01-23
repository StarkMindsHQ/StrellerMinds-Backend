import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { AuthModule } from './auth/auth.module';
import { CertificateModule } from './certificate/certificate.module';
import { FilesModule } from './files/files.module';
import { EmailModule } from './email/email.module';
import { LessonModule } from './lesson/lesson.module';
import { IpfsModule } from './ipfs/ipfs.module';
import { ModerationModule } from './moderation/moderation.module';
import { SubmissionModule } from './submission/submission.module';
import { UserProfilesModule } from './user-profiles/user-profiles.module';
import { CredentialModule } from './credential/credential.module';
import { TranslationModule } from './translation/translation.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MentorshipModule } from './mentorship/mentorship.module';
import { ArchiveModule } from './archive/archive.module';
import databaseConfig from './config/database.config';
import { ScheduleModule } from '@nestjs/schedule';
import { GdprModule } from './gdpr/gdpr.module';
import { MonitoringModule } from './monitoring/monitoring-module';
import { CoursesAdvancesModule } from './courses-advances/courses-advances.module';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { ApiUsageLoggerMiddleware } from './common/middleware/api-usage-logger.middleware';
import { DeprecationWarningMiddleware } from './common/middleware/deprecation-warning.middleware';
import { VersionTrackingInterceptor } from './common/interceptors/version-tracking.interceptor';
import { VersionAnalyticsService } from './common/services/version-analytics.service';
import { PerformanceInterceptor } from './monitoring/performance.interceptor';
import { VersionController } from './modules/version/version.controller';
import { apiVersionConfig } from './config/api-version.config';
import { VersionHeaderMiddleware } from './common/middleware/version-header.middleware';
import { PaymentModule } from './payment/payment.module';
import { CmsModule } from './cms/cms.module';
import { StellarService } from './blockchain/stellar/stellar.service';
import { ErrorDashboardModule } from './error-dashboard/error-dashboard.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { DatabaseOptimizationModule } from './database-optimization/database-optimization.module';

const ENV = process.env.NODE_ENV;

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    }),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: !ENV ? '.env' : `.env.${ENV.trim()}`,
      load: [databaseConfig, () => ({ api: apiVersionConfig })],
    }),

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
        extra: {
          max: configService.get<number>('database.maxPoolSize'),
          min: configService.get<number>('database.minPoolSize'),
          idleTimeoutMillis: configService.get<number>('database.poolIdleTimeout'),
        },
        retryAttempts: configService.get<number>('database.retryAttempts'),
        retryDelay: configService.get<number>('database.retryDelay'),
      }),
    }),

    // --- ACTIVE MODULES ---
    UsersModule,
    CoursesModule,
    AuthModule,
    CertificateModule,
    FilesModule,
    EmailModule,
    LessonModule,
    IpfsModule,
    ModerationModule,
    SubmissionModule,
    UserProfilesModule,
    CredentialModule,
    ArchiveModule,
    MentorshipModule,
    TranslationModule,
    GdprModule,
    MonitoringModule, 
    CoursesAdvancesModule,
    CmsModule,
    PaymentModule,
    ErrorDashboardModule,
    DatabaseOptimizationModule.forRoot(),

    /** * ⛔ DISABLED MODULES (Bypassing Search/Video errors for Task #474)
     * SearchModule,
     * VideoStreamingModule,
     * I18nModule
     **/
  ],
  controllers: [
    AppController, 
    VersionController
  ],
  providers: [
    AppService,
    VersionAnalyticsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: VersionTrackingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    StellarService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        CorrelationIdMiddleware,
        VersionHeaderMiddleware,
        DeprecationWarningMiddleware,
        ApiUsageLoggerMiddleware,
      )
      .forRoutes('*');
  }
}