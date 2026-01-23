import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import Redis from 'ioredis';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';

import { AccessibilityModule } from './accessibility/accessibility.module';
import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './config/config.module';
import { CourseModule } from './course/course.module';
import { ForumModule } from './forum/forum.module';
import { I18nModule } from './i18n/i18n.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { PaymentModule } from './payment/payment.module';
import { UserModule } from './user/user.module';

import { RefreshToken } from './auth/entities/refresh-token.entity';
import { SecurityAudit } from './auth/entities/security-audit.entity';
import { User } from './auth/entities/user.entity';
import { IntegrationConfig } from './integrations/common/entities/integration-config.entity';
import { IntegrationMapping } from './integrations/common/entities/integration-mapping.entity';
import { SyncLog } from './integrations/common/entities/sync-log.entity';
import {
  Dispute,
  FinancialReport,
  Invoice,
  Payment,
  PaymentMethodEntity,
  PaymentPlan,
  Refund,
  Subscription,
  TaxRate,
} from './payment/entities';
import { Badge } from './user/entities/badge.entity';
import { Follow } from './user/entities/follow.entity';
import { PortfolioItem } from './user/entities/portfolio-item.entity';
import { PrivacySettings } from './user/entities/privacy-settings.entity';
import { ProfileAnalytics } from './user/entities/profile-analytics.entity';
import { UserBadge } from './user/entities/user-badge.entity';
import { UserProfile } from './user/entities/user-profile.entity';

import { JwtAuthGuard } from './auth/guards/auth.guard';
import { ResponseInterceptor } from './auth/interceptors/response.interceptor';
import {
  SecurityHeadersMiddleware,
  TokenBlacklistMiddleware,
} from './auth/middleware/auth.middleware';
import { InputSecurityMiddleware } from './common/middleware/input-security.middleware';
import { LanguageDetectionMiddleware } from './i18n/middleware/language-detection.middleware';
import { RequestLoggerMiddleware } from './logging/request-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [configuration],        // <-- add this
      validationSchema,      
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('RATE_LIMIT_TTL', 60000),
            limit: config.get<number>('RATE_LIMIT_MAX', 10),
          },
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get<string>('REDIS_PASSWORD'),
          }),
        ),
      }),
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'strellerminds',
      entities: [
        User,
        RefreshToken,
        UserProfile,
        PortfolioItem,
        Badge,
        UserBadge,
        Follow,
        PrivacySettings,
        ProfileAnalytics,
        SecurityAudit,
        Payment,
        Subscription,
        PaymentPlan,
        Invoice,
        Refund,
        Dispute,
        TaxRate,
        FinancialReport,
        PaymentMethodEntity,
        IntegrationConfig,
        SyncLog,
        IntegrationMapping,
      ],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
      migrations: ['dist/migrations/*.js'],
      migrationsRun: true,
    }),
    AuthModule,
    CourseModule,
    UserModule,
    PaymentModule,
    IntegrationsModule,
    I18nModule.register(),
    AccessibilityModule,
    ForumModule,
    AppConfigModule,
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
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        SecurityHeadersMiddleware,
        InputSecurityMiddleware,
        TokenBlacklistMiddleware,
        LanguageDetectionMiddleware,
        RequestLoggerMiddleware,
      )
      .forRoutes('*');
  }
}
