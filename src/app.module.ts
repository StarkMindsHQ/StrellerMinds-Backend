import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { I18nModule } from './i18n/i18n.module';
import { AccessibilityModule } from './accessibility/accessibility.module';
import { CourseModule } from './course/course.module';
import { PaymentModule } from './payment/payment.module';
import { FilesModule } from './files/files.module';
import { GamificationModule } from './gamification/gamification.module';
import { DatabaseModule } from './database/database.module';

import { JwtAuthGuard } from './auth/guards/auth.guard';
import { ResponseInterceptor } from './auth/interceptors/response.interceptor';
import { TokenBlacklistMiddleware, SecurityHeadersMiddleware } from './auth/middleware/auth.middleware';
import { LanguageDetectionMiddleware } from './i18n/middleware/language-detection.middleware';

import { DatabaseConfig } from './config/database.config';
import { IntegrationsModule } from './integrations/integrations.module';
import { User } from './auth/entities/user.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { UserProfile } from './user/entities/user-profile.entity';
import { PortfolioItem } from './user/entities/portfolio-item.entity';
import { Badge } from './user/entities/badge.entity';
import { UserBadge } from './user/entities/user-badge.entity';
import { Follow } from './user/entities/follow.entity';
import { PrivacySettings } from './user/entities/privacy-settings.entity';
import { ProfileAnalytics } from './user/entities/profile-analytics.entity';
import { IntegrationConfig } from './integrations/common/entities/integration-config.entity';
import { SyncLog } from './integrations/common/entities/sync-log.entity';
import { IntegrationMapping } from './integrations/common/entities/integration-mapping.entity';
import { JwtAuthGuard } from './auth/guards/auth.guard';
import { ResponseInterceptor } from './auth/interceptors/response.interceptor';
import { TokenBlacklistMiddleware, SecurityHeadersMiddleware } from './auth/middleware/auth.middleware';
import { CourseModule } from './course/course.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RequestLoggerMiddleware } from './logging/request-logger.middleware';
import { LanguageDetectionMiddleware } from './i18n/middleware/language-detection.middleware';
import { MiddlewareConsumer, Module } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '.env.development'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = new DatabaseConfig(configService);
        return dbConfig.createTypeOrmOptions();
      },
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
        IntegrationConfig,
        SyncLog,
        IntegrationMapping,
      ],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
      migrations: ['dist/migrations/*.js'],
      migrationsRun: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 1 minute
        limit: 10,
      },
      {
        ttl: 3_600_000, // 1 hour
        limit: 1000,
      },
    ]),
    AuthModule,
    CourseModule,
    UserModule,
    PaymentModule,
    FilesModule,
    GamificationModule,
    I18nModule.register(),
    AccessibilityModule,
    DatabaseModule,
    I18nModule.register(),
    AccessibilityModule,
    IntegrationsModule,
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
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
    consumer.apply(TokenBlacklistMiddleware).forRoutes('*');
    consumer.apply(LanguageDetectionMiddleware).forRoutes('*');
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
