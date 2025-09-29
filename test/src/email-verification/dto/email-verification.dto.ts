import { IsEmail, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for sending a verification email.
 */
export class SendVerificationEmailDto {
  /** User email address */
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email: string;
}

/**
 * DTO for verifying email with a token.
 */
export class VerifyEmailDto {
  /** Verification token */
  @ApiProperty({ description: 'Verification token (UUID)' })
  @IsString()
  @IsUUID()
  token: string;
}

/**
 * DTO for resending a verification email.
 */
export class ResendVerificationDto {
  /** User email address */
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email: string;
}
