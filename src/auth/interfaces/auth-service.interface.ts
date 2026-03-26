import { User } from '../entities/user.entity';

// Type for user response without sensitive data
export type UserResponse = Omit<User, 'password'> & {
  fullName: string;
};
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ChangePasswordDto,
} from '../dto/auth.dto';

/**
 * Interface for Authentication Service operations
 */
export interface IAuthService {
  /**
   * Register a new user
   */
  register(registerDto: RegisterDto): Promise<{ user: UserResponse; message: string }>;

  /**
   * Authenticate user and generate tokens
   */
  login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    user: UserResponse;
    accessToken: string | null;
    refreshToken: string | null;
    isTwoFactorAuthenticationEnabled: boolean;
  }>;

  /**
   * Refresh access token using refresh token
   */
  refreshTokens(
    refreshTokenDto: RefreshTokenDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }>;

  /**
   * Logout user and invalidate refresh token
   */
  logout(refreshToken: string): Promise<void>;

  /**
   * Logout user from all devices
   */
  logoutAllDevices(userId: string): Promise<void>;

  /**
   * Initiate password reset process
   */
  forgotPassword(email: string): Promise<void>;

  /**
   * Reset password using reset token
   */
  resetPassword(resetToken: string, newPassword: string): Promise<void>;

  /**
   * Verify user email address
   */
  verifyEmail(verificationToken: string): Promise<void>;

  /**
   * Change user password
   */
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;

  /**
   * Get user by ID
   */
  getUserById(userId: string): Promise<UserResponse>;

  /**
   * Generate 2FA secret and QR code
   */
  generateTwoFactorSecret(user: UserResponse): Promise<{ otpauthUrl: string; secret: string }>;

  /**
   * Generate QR code stream
   */
  generateQrCodeStream(res: any, otpauthUrl: string): Promise<string>;

  /**
   * Enable two-factor authentication
   */
  turnOnTwoFactorAuthentication(userId: string, code: string): Promise<void>;

  /**
   * Disable two-factor authentication
   */
  turnOffTwoFactorAuthentication(userId: string, code: string): Promise<void>;

  /**
   * Validate two-factor authentication code
   */
  isTwoFactorAuthenticationCodeValid(code: string, secret: string): Promise<boolean>;

  /**
   * Get security audit logs
   */
  getAuditLogs(userId: string): Promise<any[]>;

  /**
   * Validate authentication credentials
   */
  validateCredentials(email: string, password: string): Promise<User | null>;

  /**
   * Check if account is locked
   */
  isAccountLocked(email: string): Promise<boolean>;

  /**
   * Lock user account
   */
  lockAccount(userId: string, reason: string): Promise<void>;

  /**
   * Unlock user account
   */
  unlockAccount(userId: string): Promise<void>;

  /**
   * Get user sessions
   */
  getUserSessions(userId: string): Promise<any[]>;

  /**
   * Revoke specific session
   */
  revokeSession(sessionId: string): Promise<void>;
}
