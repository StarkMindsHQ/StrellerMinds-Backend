import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_INTERCEPTOR, APP_GUARD, APP_FILTER } from '@nestjs/core';

// Feature Modules
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
import { MentorshipModule } from './mentorship/mentorship.module';
import { ArchiveModule } from './archive/archive.module';
import { GdprModule } from './gdpr/gdpr.module';
import { MonitoringModule } from './monitoring/monitoring-module';
import { CoursesAdvancesModule } from './courses-advances/courses-advances.module';
import { CmsModule } from './cms/cms.module';
import { PaymentModule } from './payment/payment.module';
import { ErrorDashboardModule } from './error-dashboard/error-dashboard.module';
import { DatabaseOptimizationModule } from './database-optimization/database-optimization.module';

// Controllers and Services
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VersionController } from './modules/version/version.controller';
import { AuthControllerV1 } from './modules/auth/controllers/auth.controller.v1';
import { AuthControllerV2 } from './modules/auth/controllers/auth.controller.v2';
import { StellarService } from './blockchain/stellar/stellar.service';
import { VersionAnalyticsService } from './common/services/version-analytics.service';

// Core Standardization (Requirement #471)
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { GlobalExceptionsFilter } from './common/filters/global-exception.filter';

// Existing Guards/Interceptors/Middleware
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { VersionTrackingInterceptor } from './common/interceptors/version-tracking.interceptor';
import { PerformanceInterceptor } from './monitoring/performance.interceptor';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { VersionHeaderMiddleware } from './common/middleware/version-header.middleware';
import { DeprecationWarningMiddleware } from './common/middleware/deprecation-warning.middleware';
import { ApiUsageLoggerMiddleware } from './common/middleware/api-usage-logger.middleware';

// Config
import databaseConfig from './config/database.config';
import { apiVersionConfig } from './config/api-version.config';

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

    // Database Configuration
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

    // Feature Modules
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
  ],
  controllers: [AppController, VersionController, AuthControllerV1, AuthControllerV2],
  providers: [
    AppService,
    VersionAnalyticsService,
    StellarService,

    // --- REQUIREMENT #471: Global Response Standardization ---
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // --- REQUIREMENT #471: Global Exception Handling (Unified Format) ---
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionsFilter,
    },

    // Existing App-level Guards and Interceptors
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