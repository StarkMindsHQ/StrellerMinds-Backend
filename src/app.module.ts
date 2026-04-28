import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponseTimeInterceptor } from './common/interceptors/response-time.interceptor';
import { StreamingResponseInterceptor } from './common/interceptors/streaming-response.interceptor';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CourseModule } from './course/course.module';
import { HealthModule } from './health/health.module';
import { ContractTestingModule } from './common/contract-testing/contract-testing.module';
import { SecureLoggingModule } from './common/secure-logging/secure-logging.module';
import { GdprModule } from './gdpr/gdpr.module';
import { SecurityModule } from './security/security.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { CertificatePinningMiddleware } from './common/middleware/certificate-pinning.middleware';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('DATABASE_HOST'),
        port: configService.getOrThrow<number>('DATABASE_PORT'),
        username: configService.getOrThrow<string>('DATABASE_USER'),
        password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
        database: configService.getOrThrow<string>('DATABASE_NAME'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    DatabaseModule,
    SecureLoggingModule,
    SecurityModule,
    AuthModule,
    UserModule,
    CourseModule,
    HealthModule,
    GdprModule,
    ContractTestingModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: ResponseTimeInterceptor },
    { provide: APP_INTERCEPTOR, useClass: StreamingResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
    consumer.apply(CertificatePinningMiddleware).forRoutes('*');
  }
}
