import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { AuthResponseDto } from '../dto/auth-response.dto';
import { EmailService } from '../../email/email.service';
import { PasswordValidationService } from '../password-validation.service';
import { AuthToken } from '../entities/auth-token.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { UsersService } from 'src/users/services/users.service';
import { IAuthStrategy } from './auth-strategy.interface';

@Injectable()
export class JwtLocalStrategy implements IAuthStrategy {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly passwordValidationService: PasswordValidationService,
    @InjectRepository(AuthToken)
    private readonly authTokenRepository: Repository<AuthToken>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly configService: ConfigService,
  ) {}
  name: string;
  validate(credentials: any): Promise<any> {
    throw new Error('Method not implemented.');
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Welcome to Our Platform',
        templateName: 'welcome',
        context: {
          name: user.firstName,
          year: new Date().getFullYear(),
        },
      });
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }

    return user;
  }

  async validatePassword(password: string): Promise<boolean> {
    const validationResult = this.passwordValidationService.validatePassword(password);
    if (!validationResult.isValid) {
      throw new BadRequestException({
        message: 'Password does not meet requirements',
        errors: validationResult.errors,
      });
    }
    return true;
  }

  async register(credentials: any): Promise<AuthResponseDto> {
    const { email, password, ...userData } = credentials;
    await this.validatePassword(password);

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) throw new BadRequestException('User already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      ...userData,
    });

    return this.login(user);
  }

  async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '1h',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
  }

  async login(user: any): Promise<AuthResponseDto> {
    const tokens = await this.generateTokens(user);
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
    };
  }

  async refreshToken(userId: string, refreshToken: string) {
    try {
      await this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      });

      const tokenEntity = await this.refreshTokenRepository.findOne({
        where: {
          userId,
          isRevoked: false,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (!tokenEntity) throw new UnauthorizedException('Invalid or expired refresh token');

      const isTokenValid = await bcrypt.compare(refreshToken, tokenEntity.token);
      if (!isTokenValid) throw new UnauthorizedException('Invalid refresh token');

      await this.refreshTokenRepository.update(tokenEntity.id, { isRevoked: true });

      const user = await this.usersService.findOne(userId);
      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async revokeUserRefreshTokens(userId: string): Promise<void> {
    try {
      await this.refreshTokenRepository.update(
        { userId, isRevoked: false },
        { isRevoked: true },
      );
    } catch (error) {
      throw new InternalServerErrorException('Error revoking refresh tokens');
    }
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  async validateToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOne(email);
    if (!user) throw new NotFoundException('User with this email does not exist.');

    const token = uuidv4();
    const expiresAt = addMinutes(new Date(), 15);

    const resetToken = this.authTokenRepository.create({
      user,
      token,
      expiresAt,
      purpose: 'reset_password',
      isRevoked: false,
    });

    await this.authTokenRepository.save(resetToken);

    await this.emailService.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      templateName: 'reset-password',
      context: {
        name: user.firstName,
        token,
      },
    });

    return { message: 'Password reset email sent' };
  }

  async validateResetToken(token: string) {
    const authToken = await this.authTokenRepository.findOne({
      where: { token, purpose: 'reset_password', isRevoked: false },
      relations: ['user'],
    });

    if (!authToken || authToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    return authToken.user;
  }

  async resetPassword(token: string, newPassword: string) {
    const authToken = await this.authTokenRepository.findOne({
      where: { token, purpose: 'reset_password', isRevoked: false },
      relations: ['user'],
    });

    if (!authToken || authToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    const user = authToken.user;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    authToken.isRevoked = true;
    await this.authTokenRepository.save(authToken);

    return { message: 'Password successfully reset' };
  }


  async requestPasswordReset(email: string): Promise<any> {
    // Implement your password reset logic here, e.g., generate token, send email, etc.
    // For now, just return a placeholder response.
    return { message: `Password reset link sent to ${email}` };
  }
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) throw new BadRequestException('Current password is incorrect');

    await this.validatePassword(newPassword);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.revokeUserRefreshTokens(userId);

    return true;
  }
}
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

