import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../validators';
import { Match } from '../decorators/match.decorator';

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Current account password',
    example: 'P@ssw0rd!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString({ message: 'Current password must be a string' })
  @IsNotEmpty({ message: 'Current password is required' })
  @MinLength(8, { message: 'Current password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Current password must not exceed 128 characters' })
  currentPassword: string;

  @ApiProperty({
    description: 'New strong password',
    example: 'N3wP@ssw0rd!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @MaxLength(128, { message: 'New password must not exceed 128 characters' })
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
