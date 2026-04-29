import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../validators';
import { Match } from '../decorators/match.decorator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email address associated with the account',
    example: 'alice@example.com',
    maxLength: 255,
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    maxLength: 500,
  })
  @IsString({ message: 'Reset token must be a string' })
  @IsNotEmpty({ message: 'Reset token is required' })
  @MaxLength(500, { message: 'Reset token must not exceed 500 characters' })
  resetToken: string;

  @ApiProperty({
    description: 'New strong password',
    example: 'N3wP@ssw0rd!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @IsStrongPassword({
    message: 'Password must contain uppercase, lowercase, numbers, and special characters',
  })
  newPassword: string;

  @ApiProperty({
    description: 'Must match the newPassword field',
    example: 'N3wP@ssw0rd!',
  })
  @IsString({ message: 'Password confirmation must be a string' })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  @Match('newPassword', { message: 'Passwords do not match' })
  passwordConfirm: string;
}
