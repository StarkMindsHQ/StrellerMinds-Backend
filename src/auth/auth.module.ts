/**
 * AuthModule provides authentication and authorization features.
 *
 * @module Auth
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthToken } from './entities/auth-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { EmailModule } from 'src/email/email.module';
import { PasswordValidationService } from './password-validation.service';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

import { JwtLocalStrategy } from './strategies/jwt-local.strategy';
import { IAuthStrategy } from './strategies/auth-strategy.interface';
import { GoogleOAuthAdapter } from './adapters/google.strategy.adapter';
import { FacebookOAuthAdapter } from './adapters/facebook.strategy.adapter';
import { AppleOAuthAdapter } from './adapters/apple.strategy.adapter';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    EmailModule,
    UsersModule, // This imports the UsersModule which exports UsersService
    PassportModule,
    TypeOrmModule.forFeature([AuthToken, RefreshToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1h',
        },
      }),
    }),
    SharedModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    PasswordValidationService,
    JwtLocalStrategy,
    GoogleOAuthAdapter,
    FacebookOAuthAdapter,
    AppleOAuthAdapter,
    {
      provide: 'AUTH_STRATEGY',
      useExisting: JwtLocalStrategy, // Use the JwtLocalStrategy as the default auth strategy
    },
    {
      provide: 'AUTH_STRATEGIES',
      useFactory: (
        jwtLocalStrategy: JwtLocalStrategy,
        google: GoogleOAuthAdapter,
        facebook: FacebookOAuthAdapter,
        apple: AppleOAuthAdapter,
      ): IAuthStrategy[] => [jwtLocalStrategy, google, facebook, apple],
      inject: [JwtLocalStrategy, GoogleOAuthAdapter, FacebookOAuthAdapter, AppleOAuthAdapter],
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
