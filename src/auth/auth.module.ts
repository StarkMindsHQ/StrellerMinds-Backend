import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';

import { AuthController } from './controllers/auth.controller';
import { SecurityController } from './controllers/security.controller';
import { AuthService } from './services/auth.service';
import { BcryptService } from './services/bcrypt.service';
import { JwtService } from './services/jwt.service';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtAuthGuard, RolesGuard, OptionalJwtAuthGuard } from './guards/auth.guard';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { TokenBlacklistMiddleware, SecurityHeadersMiddleware } from './middleware/auth.middleware';

import { TwoFactorAuthService } from './services/two-factor-auth.service';
import { EmailService } from './services/email.service';

import { SecurityAudit } from './entities/security-audit.entity';
import { SecurityAuditService } from './services/security-audit.service';
import { GeoIpService } from './services/geo-ip.service';
import { PasswordHistory } from './entities/password-history.entity';
import { PasswordHistoryService } from './services/password-history.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forFeature([User, RefreshToken, SecurityAudit, PasswordHistory]),
    JwtModule.registerAsync({
      useFactory: async () => ({
        secret: process.env.JWT_SECRET,
        signOptions: {
          expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        },
      }),
      global: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
      },
      {
        ttl: 3600000, // 1 hour
        limit: 100, // 100 requests per hour
      },
    ]),
    MailerModule.forRootAsync({
      useFactory: () => ({
        transport: {
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        },
        defaults: {
          from: process.env.SMTP_FROM || 'noreply@strellerminds.com',
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  controllers: [AuthController, SecurityController],
  providers: [
    AuthService,
    BcryptService,
    JwtService,
    JwtAuthGuard,
    RolesGuard,
    OptionalJwtAuthGuard,
    ResponseInterceptor,
    TwoFactorAuthService,
    EmailService,
    SecurityAuditService,
    GeoIpService,
    PasswordHistoryService,
  ],
  exports: [AuthService, BcryptService, JwtService, JwtAuthGuard, RolesGuard, EmailService, TwoFactorAuthService, SecurityAuditService, GeoIpService, PasswordHistoryService],
})
export class AuthModule { }
