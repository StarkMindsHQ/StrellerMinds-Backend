import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { JwtModuleOptions } from '@nestjs/jwt';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtService } from './services/jwt.service';
import { PasswordStrengthService } from './services/password-strength.service';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtAuthGuard } from './guards/auth.guard';
import { RateLimiterService } from './guards/rate-limiter.service';
import { RateLimitInterceptor } from './guards/rate-limit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forFeature([User, RefreshToken]),
    JwtModule.registerAsync({
      useFactory: async (): Promise<JwtModuleOptions> => ({
        secret: process.env.JWT_SECRET || 'default-secret',
        signOptions: {
          expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
        },
      }),
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtService,
    PasswordStrengthService,
    JwtAuthGuard,
    RateLimiterService,
    RateLimitInterceptor,
  ],
  exports: [
    AuthService,
    JwtService,
    PasswordStrengthService,
    JwtAuthGuard,
    RateLimiterService,
    RateLimitInterceptor,
  ],
})
export class AuthModule {}
