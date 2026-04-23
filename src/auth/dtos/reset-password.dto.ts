import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { IsStrongPassword } from '../validators';
import { Match } from '../decorators/match.decorator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @IsString({ message: 'Reset token must be a string' })
  @IsNotEmpty({ message: 'Reset token is required' })
  @MaxLength(500, { message: 'Reset token must not exceed 500 characters' })
  resetToken: string;

  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @IsStrongPassword({
    message: 'Password must contain uppercase, lowercase, numbers, and special characters',
  })
  newPassword: string;

  @IsString({ message: 'Password confirmation must be a string' })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  @Match('newPassword', { message: 'Passwords do not match' })
  passwordConfirm: string;
}
