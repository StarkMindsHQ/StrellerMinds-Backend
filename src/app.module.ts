import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import Redis from 'ioredis';
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
import { IntegrationsModule } from './integrations/integrations.module';
import { SecurityModule } from './security/security.module';

import { JwtAuthGuard } from './auth/guards/auth.guard';
import { ResponseInterceptor } from './auth/interceptors/response.interceptor';
import {
  TokenBlacklistMiddleware,
  SecurityHeadersMiddleware,
} from './auth/middleware/auth.middleware';
import { InputSecurityMiddleware } from './common/middleware/input-security.middleware';
import { LanguageDetectionMiddleware } from './i18n/middleware/language-detection.middleware';
import { HealthModule } from './health/health.module';

import { RequestLoggerMiddleware } from './logging/request-logger.middleware';

import { DatabaseConfig } from './config/database.config';
import { configuration, validationSchema } from './config/configuration';
import { SearchModule } from './search/search.module';

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
    PaymentModule, // <-- from feature branch
    I18nModule.register(), // <-- from main
    AccessibilityModule,
    SearchModule, // <-- from main
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
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
    consumer.apply(InputSecurityMiddleware).forRoutes('*');
    consumer.apply(TokenBlacklistMiddleware).forRoutes('*');
    consumer.apply(LanguageDetectionMiddleware).forRoutes('*');
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
