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
  }
}
