import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { User, UserStatus } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { RegisterDto, LoginDto, RefreshTokenDto } from '../dto/auth.dto';
import { BcryptService } from './bcrypt.service';
import { v4 as uuidv4 } from 'uuid';

// Type for user response without sensitive data
export type UserResponse = Omit<User, 'password'> & {
  fullName: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly bcryptService: BcryptService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user: UserResponse; message: string }> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const hashedPassword = await this.bcryptService.hash(registerDto.password);
    const verificationToken = uuidv4();

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
      emailVerificationToken: verificationToken,
    });

    const savedUser = await this.userRepository.save(user);
    
    // Remove password from response
    const { password, ...userWithoutPassword } = savedUser;
    const userResponse: UserResponse = {
      ...userWithoutPassword,
      fullName: `${userWithoutPassword.firstName} ${userWithoutPassword.lastName}`,
    };

    return {
      user: userResponse,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<{
    user: UserResponse;
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: ['refreshTokens'],
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.status === UserStatus.PENDING) {
      throw new Error('Please verify your email before logging in');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new Error('Account suspended');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new Error('Account inactive');
    }

    const isPasswordValid = await this.bcryptService.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user, loginDto.deviceId, ipAddress, userAgent);

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    const userResponse: UserResponse = {
      ...userWithoutPassword,
      fullName: `${userWithoutPassword.firstName} ${userWithoutPassword.lastName}`,
    };

    return {
      user: userResponse,
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto, ipAddress?: string, userAgent?: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const token = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenDto.refreshToken },
      relations: ['user'],
    });

    if (!token || !token.isValid) {
      throw new Error('Invalid or expired refresh token');
    }

    // Revoke old token
    await this.refreshTokenRepository.update(token.id, { isRevoked: true });

    // Generate new tokens
    const accessToken = this.generateAccessToken(token.user);
    const refreshToken = await this.generateRefreshToken(token.user, token.deviceId, ipAddress, userAgent);

    return {
      accessToken,
      refreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { token: refreshToken },
      { isRevoked: true }
    );
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId },
      { isRevoked: true }
    );
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    
    if (!user) {
      // Don't reveal if user exists
      return;
    }

    const resetToken = uuidv4();
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiry

    await this.userRepository.update(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetTokenExpiry,
    });

    // TODO: Send email with reset token
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: resetToken,
        passwordResetExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    const hashedPassword = await this.bcryptService.hash(newPassword);

    await this.userRepository.update(user.id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    // Revoke all refresh tokens for this user
    await this.refreshTokenRepository.update(
      { userId: user.id },
      { isRevoked: true }
    );
  }

  async verifyEmail(verificationToken: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: verificationToken },
    });

    if (!user) {
      throw new Error('Invalid verification token');
    }

    await this.userRepository.update(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null,
      status: UserStatus.ACTIVE,
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    const isCurrentPasswordValid = await this.bcryptService.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    const hashedNewPassword = await this.bcryptService.hash(newPassword);

    await this.userRepository.update(user.id, {
      password: hashedNewPassword,
    });

    // Revoke all refresh tokens for this user
    await this.refreshTokenRepository.update(
      { userId },
      { isRevoked: true }
    );
  }

  private generateAccessToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });
  }

  private async generateRefreshToken(
    user: User,
    deviceId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const payload = {
      sub: user.id,
      type: 'refresh',
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const refreshTokenEntity = this.refreshTokenRepository.create({
      token,
      userId: user.id,
      expiresAt,
      deviceId,
      ipAddress,
      userAgent,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return token;
  }

  async validateUser(email: string, password: string): Promise<UserResponse | null> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      return null;
    }

    const isPasswordValid = await this.bcryptService.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    const userResponse: UserResponse = {
      ...userWithoutPassword,
      fullName: `${userWithoutPassword.firstName} ${userWithoutPassword.lastName}`,
    };
    return userResponse;
  }

  async getUserById(id: string): Promise<UserResponse | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    
    if (!user) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    const userResponse: UserResponse = {
      ...userWithoutPassword,
      fullName: `${userWithoutPassword.firstName} ${userWithoutPassword.lastName}`,
    };
    return userResponse;
  }
}
