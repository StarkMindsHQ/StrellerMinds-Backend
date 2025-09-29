/**
 * AuthModule provides authentication and email verification features.
 *
 * @module Auth
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { EmailVerificationController } from './email-verification.controller';
import { EmailModule } from '../email/email.module';
import { User } from 'src/credential/credential.controller';
import { AuthController } from 'src/auth/auth.controller';
import { JwtStrategy } from 'src/auth/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
    EmailModule,
  ],
  controllers: [AuthController, EmailVerificationController],
  providers: [AuthService, EmailVerificationService, JwtStrategy],
  exports: [EmailVerificationService],
})
export class AuthModule {}
