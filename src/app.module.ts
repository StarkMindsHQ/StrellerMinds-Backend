import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { User } from './auth/entities/user.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { JwtAuthGuard } from './auth/guards/auth.guard';
import { ResponseInterceptor } from './auth/interceptors/response.interceptor';
import { TokenBlacklistMiddleware, SecurityHeadersMiddleware } from './auth/middleware/auth.middleware';
import { CourseModule } from './course/course.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'strellerminds',
      entities: [User, RefreshToken],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
      migrations: ['dist/migrations/*.js'],
      migrationsRun: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute for auth endpoints
      },
      {
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour for general endpoints
      },
    ]),
    AuthModule,
    CourseModule,
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
  configure(consumer: any) {
    consumer
      .apply(SecurityHeadersMiddleware)
      .forRoutes('*');
    
    consumer
      .apply(TokenBlacklistMiddleware)
      .forRoutes('*');
  }
}
