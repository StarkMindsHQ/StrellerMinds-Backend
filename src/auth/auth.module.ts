import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { JwtModuleOptions } from '@nestjs/jwt';

import { AuthController } from './controllers/auth.controller';
import { TokenController } from './controllers/token.controller';
import { AuthService } from './services/auth.service';
import { JwtService } from './services/jwt.service';
import { PasswordStrengthService } from './services/password-strength.service';
import { CookieTokenService } from './services/cookie-token.service';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { SecurityAudit } from './entities/security-audit.entity';
import { UserProfile } from '../user/entities/user-profile.entity';
import { JwtAuthGuard } from './guards/auth.guard';
import { JwtCookieGuard } from './guards/jwt-cookie.guard';
import { RateLimiterService } from './guards/rate-limiter.service';
import { RateLimitInterceptor } from './guards/rate-limit.interceptor';
import { JwtCookieStrategy } from './strategies/jwt-cookie.strategy';
import { TransactionManager } from '../common/database/transaction.manager';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forFeature([User, RefreshToken, SecurityAudit, UserProfile]),
    PassportModule.register({ defaultStrategy: 'jwt-cookie' }),
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
  controllers: [AuthController, TokenController],
  providers: [
    AuthService,
    JwtService,
    PasswordStrengthService,
    CookieTokenService,
    JwtAuthGuard,
    JwtCookieGuard,
    JwtCookieStrategy,
    RateLimiterService,
    RateLimitInterceptor,
    TransactionManager,
  ],
  exports: [
    AuthService,
    JwtService,
    PasswordStrengthService,
    CookieTokenService,
    JwtAuthGuard,
    JwtCookieGuard,
    JwtCookieStrategy,
    RateLimiterService,
    RateLimitInterceptor,
    TransactionManager,
  ],
})
export class AuthModule {}

