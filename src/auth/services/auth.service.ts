import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { SecurityAudit, SecurityEvent } from '../entities/security-audit.entity';
import { UserProfile } from '../../user/entities/user-profile.entity';
import { TransactionManager } from '../../common/database/transaction.manager';
import { SecureLoggerService } from '../../common/secure-logging/secure-logger.service';
import {
  InvalidCredentialsException,
  UserAlreadyExistsException,
  UserNotFoundException,
} from '../domain/exceptions/auth-exceptions';
import { EncryptionService } from '../../common/encryption.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly transactionManager: TransactionManager,
    private readonly secureLogger: SecureLoggerService,
    private readonly encryptionService: EncryptionService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Returns a SHA-256 hex digest of `token` used as a safe storable hash. */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private buildAudit(
    userId: string | null,
    event: SecurityEvent,
    extra: Partial<Pick<SecurityAudit, 'ipAddress' | 'userAgent' | 'metadata'>> = {},
  ): Partial<SecurityAudit> {
    return { userId: userId ?? undefined, event, ...extra };
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  // ─── Register ────────────────────────────────────────────────────────────────

  /**
   * Atomically:
   *  1. Creates the User row
   *  2. Creates the UserProfile row
   *  3. Writes a REGISTRATION SecurityAudit entry
   *
   * If any step fails the entire transaction is rolled back.
   */
  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.secureLogger.log(`Registration attempt for email: ${email}`);
    const emailHash = this.encryptionService.hash(email.toLowerCase());
    const existingUser = await this.userRepository.findOne({ where: { emailHash } as any });
    if (existingUser) {
      this.secureLogger.warn(`Registration failed: Email already in use: ${email}`);
      throw new UserAlreadyExistsException(email);
    }

    try {
      const { user } = await this.transactionManager.run(async (em) => {
        const hashedPassword = await bcrypt.hash(password, 12);
        // 1. Persist the new user
        const user = em.create(User, {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          isActive: true,
          isEmailVerified: false,
        });
        await em.save(User, user);

        // 2. Create an empty profile for the user
        const profile = em.create(UserProfile, { userId: user.id });
        await em.save(UserProfile, profile);

        // 3. Write security audit
        const audit = em.create(SecurityAudit, {
          userId: user.id,
          event: SecurityEvent.LOGIN_SUCCESS, // closest existing event; add REGISTER when enum is extended
          ipAddress,
          userAgent,
          metadata: { action: 'register' },
        });
        await em.save(SecurityAudit, audit);

        return { user, profile };
      });

      this.secureLogger.log(`Registration successful for user: ${user.id}`);
      return { message: 'Registration successful', user: this.sanitizeUser(user) };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error('Registration transaction failed', error);
      throw new InternalServerErrorException('Registration failed. Please try again.');
    }
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  /**
   * Validates credentials then atomically:
   *  1. Creates a RefreshToken row
   *  2. Writes a LOGIN_SUCCESS / LOGIN_FAILED SecurityAudit entry
   */
  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    this.secureLogger.log(`Login attempt for email: ${email}`);
    const emailHash = this.encryptionService.hash(email.toLowerCase());
    const user = await this.userRepository.findOne({ where: { emailHash } as any });
    const isPasswordValid = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isPasswordValid) {
      this.secureLogger.warn(`Login failed: Invalid credentials for email: ${email}`);
      // Still write an audit log for failed attempts – not inside a tx because
      // user may not exist, but we want the record regardless.
      try {
        await this.transactionManager.run(async (em) => {
          await em.save(
            SecurityAudit,
            em.create(SecurityAudit, {
              userId: user?.id,
              event: SecurityEvent.LOGIN_FAILED,
              ipAddress,
              userAgent,
              metadata: { email },
            }),
          );
        });
      } catch {
        // Non-critical – don't surface audit errors to the caller
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    try {
      const rawRefreshToken = crypto.randomBytes(40).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await this.transactionManager.run(async (em) => {
        // 1. Persist a new refresh token
        const refreshToken = em.create(RefreshToken, {
          token: this.hashToken(rawRefreshToken),
          userId: user.id,
          expiresAt,
          isRevoked: false,
        });
        await em.save(RefreshToken, refreshToken);

        // 2. Write success audit
        await em.save(
          SecurityAudit,
          em.create(SecurityAudit, {
            userId: user.id,
            event: SecurityEvent.LOGIN_SUCCESS,
            ipAddress,
            userAgent,
          }),
        );
      });

      this.secureLogger.log(`Login successful for user: ${user.id}`);
      return {
        message: 'Login successful',
        user: this.sanitizeUser(user),
        refreshToken: rawRefreshToken,
      };
    } catch (error) {
      this.logger.error('Login transaction failed', error);
      throw new InternalServerErrorException('Login failed. Please try again.');
    }
  }

  // ─── Refresh Token ───────────────────────────────────────────────────────────

  async refreshToken(rawRefreshToken: string) {
    this.secureLogger.log('Token refresh attempt');
    // TODO: integrate JwtService to verify & re-issue JWT pair
    const hashed = this.hashToken(rawRefreshToken);
    const stored = await this.refreshTokenRepository.findOne({
      where: { token: hashed, isRevoked: false },
      relations: ['user'],
    });

    if (!stored || stored.expiresAt < new Date()) {
      this.secureLogger.warn('Token refresh failed: Invalid or expired token');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return { message: 'Token refreshed', accessToken: 'new-token' };
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────────

  /**
   * Atomically stores the reset token on the user row and writes an audit log.
   */
  async forgotPassword(email: string, ipAddress?: string, userAgent?: string) {
    this.secureLogger.log(`Password reset request for email: ${email}`);
    const emailHash = this.encryptionService.hash(email.toLowerCase());
    const user = await this.userRepository.findOne({ where: { emailHash } as any });
    if (!user) {
      // Security: don't reveal whether the email exists
      this.secureLogger.log(`Password reset request: Email not found (intentionally not revealing)`);
      return { message: 'If email exists, a reset link has been sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    try {
      await this.transactionManager.run(async (em) => {
        // 1. Store hashed reset token on the user record
        await em.update(User, user.id, {
          passwordResetToken: this.hashToken(resetToken),
          passwordResetExpires: resetExpires,
        });

        // 2. Audit the request
        await em.save(
          SecurityAudit,
          em.create(SecurityAudit, {
            userId: user.id,
            event: SecurityEvent.PASSWORD_RESET_REQUEST,
            ipAddress,
            userAgent,
          }),
        );
      });
    } catch (error) {
      this.logger.error('Forgot-password transaction failed', error);
      throw new InternalServerErrorException('Could not process request. Please try again.');
    }

    // TODO: send reset email via EmailService (outside the transaction)
    return { message: 'If email exists, a reset link has been sent', resetToken };
  }

  // ─── Reset Password ──────────────────────────────────────────────────────────

  /**
   * Atomically:
   *  1. Validates reset token & expiry
   *  2. Updates the password & clears reset token fields
   *  3. Revokes all existing refresh tokens
   *  4. Writes a PASSWORD_RESET_SUCCESS audit log
   */
  async resetPassword(
    email: string,
    resetToken: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.secureLogger.log(`Password reset attempt for email: ${email}`);
    const emailHash = this.encryptionService.hash(email.toLowerCase());
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect(['user.passwordResetToken', 'user.passwordResetExpires'])
      .where('user.emailHash = :emailHash', { emailHash })
      .getOne();

    if (!user) {
      this.secureLogger.warn(`Password reset failed: User not found for email: ${email}`);
      throw new UserNotFoundException(email);
      throw new NotFoundException('User not found');
    }

    const hashedToken = this.hashToken(resetToken);
    if (
      !user.passwordResetToken ||
      user.passwordResetToken !== hashedToken ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      this.secureLogger.warn(`Password reset failed: Invalid or expired token for user: ${user.id}`);
      throw new BadRequestException('Invalid or expired reset token');
    }

    try {
      await this.transactionManager.run(async (em) => {
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        // 1. Update password, clear reset token fields
        await em.update(User, user.id, {
          password: hashedPassword,
          passwordResetToken: null as any,
          passwordResetExpires: null as any,
        });

        // 2. Revoke all active refresh tokens for this user
        await em.update(RefreshToken, { userId: user.id, isRevoked: false }, { isRevoked: true });

        // 3. Audit success
        await em.save(
          SecurityAudit,
          em.create(SecurityAudit, {
            userId: user.id,
            event: SecurityEvent.PASSWORD_RESET_SUCCESS,
            ipAddress,
            userAgent,
          }),
        );
      });

      this.secureLogger.log(`Password reset successful for user: ${user.id}`);
      return { message: 'Password reset successful' };
    } catch (error) {
      this.logger.error('Reset-password transaction failed', error);
      throw new InternalServerErrorException('Could not reset password. Please try again.');
    }
  }

  // ─── Verify Email ─────────────────────────────────────────────────────────────

  /**
   * Atomically marks the user as email-verified and writes an audit entry.
   */
  async verifyEmail(token: string, ipAddress?: string, userAgent?: string) {
    this.secureLogger.log('Email verification attempt');
    // TODO: validate JWT / HMAC email-verification token via JwtService
    // Stub: resolve email from token
    const email = 'user@example.com'; // replace with JwtService.verifyEmailVerificationToken(token).email
    const emailHash = this.encryptionService.hash(email.toLowerCase());

    const user = await this.userRepository.findOne({ where: { emailHash } as any });
    if (!user) {
      this.secureLogger.warn('Email verification failed: User not found');
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      return { message: 'Email already verified' };
    }

    try {
      await this.transactionManager.run(async (em) => {
        // 1. Mark email as verified
        await em.update(User, user.id, { isEmailVerified: true });

        // 2. Audit the verification
        await em.save(
          SecurityAudit,
          em.create(SecurityAudit, {
            userId: user.id,
            event: SecurityEvent.TWO_FACTOR_ENABLE, // nearest event; extend enum with EMAIL_VERIFIED
            ipAddress,
            userAgent,
            metadata: { action: 'email_verified' },
          }),
        );
      });

      this.secureLogger.log(`Email verified successfully for user: ${user.id}`);
      return { message: 'Email verified successfully' };
    } catch (error) {
      this.logger.error('Verify-email transaction failed', error);
      throw new InternalServerErrorException('Email verification failed. Please try again.');
    }
  }

  // ─── Update Password ──────────────────────────────────────────────────────────

  /**
   * Atomically:
   *  1. Validates the current password
   *  2. Updates to the new password
   *  3. Revokes all existing refresh tokens (forces re-login everywhere)
   *  4. Writes a PASSWORD_CHANGE SecurityAudit entry
   */
  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.secureLogger.log('Password update attempt');
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      this.secureLogger.warn(`Password update failed: User not found for ID: ${userId}`);
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      this.secureLogger.warn(`Password update failed: Incorrect current password for user: ${user.id}`);
      throw new UnauthorizedException('Current password is incorrect');
    }

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await this.transactionManager.run(async (em) => {
        // 1. Update password
        await em.update(User, user.id, {
          password: hashedPassword,
        });

        // 2. Revoke all active refresh tokens
        await em.update(RefreshToken, { userId: user.id, isRevoked: false }, { isRevoked: true });

        // 3. Audit
        await em.save(
          SecurityAudit,
          em.create(SecurityAudit, {
            userId: user.id,
            event: SecurityEvent.PASSWORD_CHANGE,
            ipAddress,
            userAgent,
          }),
        );
      });

      this.secureLogger.log(`Password updated successfully for user: ${user.id}`);
      return { message: 'Password updated successfully' };
    } catch (error) {
      this.logger.error('Update-password transaction failed', error);
      throw new InternalServerErrorException('Password update failed. Please try again.');
    }
  }
}
