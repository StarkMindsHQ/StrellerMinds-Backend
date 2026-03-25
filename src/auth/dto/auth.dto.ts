import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class RegisterDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @Sanitize('email')
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  @MaxLength(100, { message: 'Email address cannot exceed 100 characters' })
  email: string;

  @ApiProperty({ description: 'User password', example: 'Password123!' })
  @Sanitize('password')
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password is too weak. Must contain uppercase, lowercase, and number/special character.',
  })
  password: string;

  @ApiProperty({ description: 'User first name', example: 'John' })
  @Sanitize('text')
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  @Matches(/^[a-zA-Z\s\-']+$/, { message: 'First name contains invalid characters' })
  firstName: string;

  @ApiProperty({ description: 'User last name', example: 'Doe' })
  @Sanitize('text')
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  @Matches(/^[a-zA-Z\s\-']+$/, { message: 'Last name contains invalid characters' })
  lastName: string;

  @ApiPropertyOptional({ description: 'User role', enum: UserRole, example: UserRole.STUDENT })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role?: UserRole;
}

export class LoginDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @Sanitize('email')
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;

  @ApiProperty({ description: 'User password', example: 'Password123!' })
  @Sanitize('password')
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiPropertyOptional({ description: 'Device identifier for multi-device support' })
  @IsOptional()
  @Sanitize('token')
  @IsString({ message: 'Device ID must be a string' })
  @MaxLength(255, { message: 'Device ID is too long' })
  deviceId?: string;

  @ApiPropertyOptional({ description: '2FA code if enabled' })
  @IsOptional()
  @IsString({ message: '2FA code must be a string' })
  @MinLength(6, { message: '2FA code must be 6 digits' })
  @MaxLength(6, { message: '2FA code must be 6 digits' })
  @Matches(/^\d{6}$/, { message: '2FA code must be numeric' })
  twoFactorAuthenticationCode?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @Sanitize('token')
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @Sanitize('email')
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token' })
  @Sanitize('token')
  @IsString({ message: 'Reset token must be a string' })
  @IsNotEmpty({ message: 'Reset token is required' })
  resetToken: string;

  @ApiProperty({ description: 'New password', example: 'NewPassword123!' })
  @Sanitize('password')
  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @MaxLength(128, { message: 'New password cannot exceed 128 characters' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'New password is too weak. Must contain uppercase, lowercase, and number/special character.',
  })
  newPassword: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token' })
  @Sanitize('token')
  @IsString({ message: 'Verification token must be a string' })
  @IsNotEmpty({ message: 'Verification token is required' })
  verificationToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @Sanitize('password')
  @IsString({ message: 'Current password must be a string' })
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({ description: 'New password', example: 'NewPassword123!' })
  @Sanitize('password')
  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @MaxLength(128, { message: 'New password cannot exceed 128 characters' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'New password is too weak. Must contain uppercase, lowercase, and number/special character.',
  })
  newPassword: string;
}
