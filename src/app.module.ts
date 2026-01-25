import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import Redis from 'ioredis';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { I18nModule } from './i18n/i18n.module';
import { AccessibilityModule } from './accessibility/accessibility.module';
import { FilesModule } from './files/files.module';
import { GamificationModule } from './gamification/gamification.module';
import { DatabaseModule } from './database/database.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { SecurityModule } from './security/security.module';
import { InputSecurityMiddleware } from './common/middleware/input-security.middleware';
import { LanguageDetectionMiddleware } from './i18n/middleware/language-detection.middleware';
import { HealthModule } from './health/health.module';

import { RequestLoggerMiddleware } from './logging/request-logger.middleware';

import { DatabaseConfig } from './config/database.config';
import { configuration, validationSchema } from './config/configuration';

import { User } from './auth/entities/user.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { SecurityAudit } from './auth/entities/security-audit.entity';
import { UserProfile } from './user/entities/user-profile.entity';
import { PortfolioItem } from './user/entities/portfolio-item.entity';
import { Badge } from './user/entities/badge.entity';
import { UserBadge } from './user/entities/user-badge.entity';
import { Follow } from './user/entities/follow.entity';
import { PrivacySettings } from './user/entities/privacy-settings.entity';
import { ProfileAnalytics } from './user/entities/profile-analytics.entity';
import { JwtAuthGuard } from './auth/guards/auth.guard';
import { ResponseInterceptor } from './auth/interceptors/response.interceptor';
import { TokenBlacklistMiddleware, SecurityHeadersMiddleware } from './auth/middleware/auth.middleware';
// import { LanguageDetectionMiddleware } from './common/middleware/language-detection.middleware'; // <-- make sure to import
import { CourseModule } from './course/course.module';
import { PaymentModule } from './payment/payment.module';
import {
  Payment,
  Subscription,
  PaymentPlan,
  Invoice,
  Refund,
  Dispute,
  TaxRate,
  FinancialReport,
  PaymentMethodEntity,
} from './payment/entities';
import { SearchModule } from './search/search.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { IntegrationConfig } from './integrations/common/entities/integration-config.entity';
import { SyncLog } from './integrations/common/entities/sync-log.entity';
import { IntegrationMapping } from './integrations/common/entities/integration-mapping.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '.env.development'],
      load: [configuration],
      validationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = new DatabaseConfig(configService);
        return dbConfig.createTypeOrmOptions();
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get('RATE_LIMIT_TTL', 60000),
            limit: config.get('RATE_LIMIT_MAX', 10),
          },
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get('REDIS_PORT', 6379),
            password: config.get('REDIS_PASSWORD'),
          }),
        ),
      }),
    }),
    AuthModule,
    CourseModule,
    UserModule,
    PaymentModule,                // <-- from feature branch
    I18nModule.register(),        // <-- from main
    AccessibilityModule, SearchModule,          // <-- from main
    PaymentModule,
    FilesModule,
    GamificationModule,
    I18nModule.register(),
    AccessibilityModule,
    IntegrationsModule,
    SecurityModule,
    HealthModule,
    DatabaseModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
     {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
    consumer.apply(InputSecurityMiddleware).forRoutes('*');
    consumer.apply(TokenBlacklistMiddleware).forRoutes('*');
    // consumer.apply(LanguageDetectionMiddleware).forRoutes('*');
    consumer.apply(RequestIdMiddleware).forRoutes('*');
    consumer.apply(LanguageDetectionMiddleware).forRoutes('*');
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}