import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { SecureLoggerService } from '../../common/secure-logging/secure-logger.service';
import {
  InvalidCredentialsException,
  UserAlreadyExistsException,
  UserNotFoundException,
} from '../domain/exceptions/auth-exceptions';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly secureLogger: SecureLoggerService;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    this.secureLogger = new SecureLoggerService();
  }

  async login(email: string, password: string) {
    // Log login attempt without sensitive data
    this.secureLogger.log(`Login attempt for email: ${email}`);

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists or not for security
      this.secureLogger.warn(`Login failed: Invalid credentials for email: ${email}`);
      throw new InvalidCredentialsException();
    }

    // TODO: Compare password with hashed password
    // if (!await bcrypt.compare(password, user.password)) {
    //   this.secureLogger.warn(`Login failed: Invalid password for user: ${user.id}`);
    //   throw new Error('Invalid credentials');
    // }

    this.secureLogger.log(`Login successful for user: ${user.id}`);
    // Don't log the full user object as it may contain sensitive data
    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  }

  async register(email: string, password: string, firstName: string, lastName: string) {
    // Log registration attempt without sensitive data
    this.secureLogger.log(`Registration attempt for email: ${email}`);

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      this.secureLogger.warn(`Registration failed: Email already in use: ${email}`);
      throw new UserAlreadyExistsException(email);
    }

    // TODO: Hash password before storing
    // const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      email,
      password, // TODO: Replace with hashedPassword
      firstName,
      lastName,
    });
    await this.userRepository.save(user);

    this.secureLogger.log(`Registration successful for user: ${user.id}`);
    // Don't return the password in the response
    return {
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    // Log token refresh attempt without logging the actual token
    this.secureLogger.log('Token refresh attempt');

    // TODO: Validate and decode JWT token
    return { message: 'Token refreshed', accessToken: 'new-token' };
  }

  async forgotPassword(email: string) {
    // Log password reset attempt without sensitive data
    this.secureLogger.log(`Password reset request for email: ${email}`);

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists for security
      this.secureLogger.log(
        `Password reset request: Email not found (intentionally not revealing)`,
      );
      return { message: 'If email exists, reset link sent' };
    }
    // TODO: Generate reset token and send email
    // Don't log the reset token
    this.secureLogger.log(`Password reset email sent to: ${email}`);
    return { message: 'If email exists, reset link sent' };
  }

  async resetPassword(email: string, resetToken: string, newPassword: string) {
    // Log password reset attempt without sensitive data
    this.secureLogger.log(`Password reset attempt for email: ${email}`);

    // TODO: Validate reset token
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      this.secureLogger.warn(`Password reset failed: User not found for email: ${email}`);
      throw new UserNotFoundException(email);
    }

    // TODO: Hash new password before storing
    // const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = newPassword; // TODO: Replace with hashedPassword
    await this.userRepository.save(user);

    this.secureLogger.log(`Password reset successful for user: ${user.id}`);
    return { message: 'Password reset successful' };
  }

  async verifyEmail(token: string) {
    // Log email verification attempt without logging the actual token
    this.secureLogger.log('Email verification attempt');

    // TODO: Validate verification token and mark user as verified
    return { message: 'Email verified successfully' };
  }

  async updatePassword(currentPassword: string, newPassword: string) {
    // Log password update attempt without logging the actual passwords
    this.secureLogger.log('Password update attempt');

    // TODO: Get current user from context
    // TODO: Validate current password
    // TODO: Hash new password before storing
    return { message: 'Password updated successfully' };
  }
}
