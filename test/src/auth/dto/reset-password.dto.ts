import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * DTO for resetting a user's password.
 */
export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token', example: 'reset-token-uuid' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'New password', minLength: 6, example: 'NewStrongPassword123' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
