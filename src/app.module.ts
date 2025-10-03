// import { I18nModule } from './i18n/i18n.module';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { AuthModule } from './auth/auth.module';
import { CertificateModule } from './certificates/certificate.module';
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
// import { FeedbackModule } from './feedback/feedback.module';
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
import { ApiUsageLog } from './common/entities/api-usage-log.entity';
import { AuthControllerV1 } from './modules/auth/controllers/auth.controller.v1';
import { AuthControllerV2 } from './modules/auth/controllers/auth.controller.v2';
// import { CoursesControllerV1 } from './modules/courses/controllers/courses.controller.v1';
// import { CoursesControllerV2 } from './modules/courses/controllers/courses.controller.v2';
import { VersionController } from './modules/version/version.controller';
import { apiVersionConfig } from './config/api-version.config';
import { VersionHeaderMiddleware } from './common/middleware/version-header.middleware';
import { SimplifiedDeprecationService } from './common/services/simplified-deprecation.service';
import { PaymentModule } from './payment/payment.module';
import { CmsModule } from './cms/cms.module';
import { BillingModule } from './billing/billing.module';
import { StellarService } from './blockchain/stellar/stellar.service';
import { ErrorDashboardModule } from './error-dashboard/error-dashboard.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { DatabaseOptimizationModule } from './database-optimization/database-optimization.module';
import { NotificationsModule } from './notifications/notifications.module';
import { I18nApiModule } from './i18n/i18n.module';
import { BullModule } from '@nestjs/bull';
import { BullBoardConfigModule } from './email/bull-board.module';

const ENV = process.env.NODE_ENV;
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('ENV:', ENV);

// In OpenAPI generation environment, skip database initialization to avoid CI failures
const isOpenApiEnv = ENV && ENV.trim() === 'openapi';
const databaseImports = isOpenApiEnv
  ? []
  : [
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
            idleTimeoutMillis: configService.get<number>(
              'database.poolIdleTimeout',
            ),
          },
          // Retry Mechanism
          retryAttempts: configService.get<number>('database.retryAttempts'),
          retryDelay: configService.get<number>('database.retryDelay'),
        }),
      }),
    ];

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: process.env.GLOBAL_RATE_LIMIT_TTL
        ? Number(process.env.GLOBAL_RATE_LIMIT_TTL)
        : 60,
      limit: process.env.GLOBAL_RATE_LIMIT_LIMIT
        ? Number(process.env.GLOBAL_RATE_LIMIT_LIMIT)
        : 100,
    }),
    // Global Config
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: !ENV ? '.env' : `.env.${ENV.trim()}`,
      load: [databaseConfig, () => ({ api: apiVersionConfig })],
    }),

    // Bull Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
      }),
    }),

    // Database
    // Replace direct DB import with a conditional to avoid connecting during OpenAPI generation
    ...databaseImports,
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
    // FeedbackModule,
    I18nApiModule,
    MentorshipModule,
    TranslationModule,
    GdprModule,
    MonitoringModule,
    CoursesAdvancesModule,
    AuthControllerV1,
    AuthControllerV2,
    // CoursesControllerV1,
    // CoursesControllerV2,
    VersionController,
    CmsModule,
    BillingModule,
    PaymentModule,
    ErrorDashboardModule,
    DatabaseOptimizationModule.forRoot(),
    NotificationsModule,
    ...(process.env.NODE_ENV !== 'production' ? [BullBoardConfigModule] : []),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    VersionAnalyticsService,
    SimplifiedDeprecationService,
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