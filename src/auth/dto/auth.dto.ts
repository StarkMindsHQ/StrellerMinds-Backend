import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class RegisterDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @Sanitize('email')
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User password', example: 'Password123!' })
  @Sanitize('password')
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  password: string;

  @ApiProperty({ description: 'User first name', example: 'John' })
  @Sanitize('text')
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  firstName: string;

  @ApiProperty({ description: 'User last name', example: 'Doe' })
  @Sanitize('text')
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  lastName: string;

  @ApiPropertyOptional({ description: 'User role', enum: UserRole, example: UserRole.STUDENT })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class LoginDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @Sanitize('email')
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User password', example: 'Password123!' })
  @Sanitize('password')
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ description: 'Device identifier for multi-device support' })
  @IsOptional()
  @Sanitize('token')
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: '2FA code if enabled' })
  @IsOptional()
  @IsString()
  twoFactorAuthenticationCode?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @Sanitize('token')
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @Sanitize('email')
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token' })
  @Sanitize('token')
  @IsString()
  @IsNotEmpty()
  resetToken: string;

  @ApiProperty({ description: 'New password', example: 'NewPassword123!' })
  @Sanitize('password')
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  newPassword: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token' })
  @Sanitize('token')
  @IsString()
  @IsNotEmpty()
  verificationToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @Sanitize('password')
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ description: 'New password', example: 'NewPassword123!' })
  @Sanitize('password')
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  newPassword: string;
}
