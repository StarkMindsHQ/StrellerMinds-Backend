import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
  IsNotEmpty,
  IsAlphanumeric,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsStrongPassword,
  IsNotSqlInjection,
  IsNotXSS,
} from '../../common/decorators/validation.decorators';

enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
}

export class EnhancedRegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsStrongPassword({ message: 'Password does not meet security requirements' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @IsNotSqlInjection({ message: 'First name contains invalid characters' })
  @IsNotXSS({ message: 'First name contains potentially dangerous content' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message: 'First name can only contain letters, spaces, hyphens, and apostrophes',
  })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  @IsNotSqlInjection({ message: 'Last name contains invalid characters' })
  @IsNotXSS({ message: 'Last name contains potentially dangerous content' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message: 'Last name can only contain letters, spaces, hyphens, and apostrophes',
  })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ message: 'Stellar address must be a string' })
  @IsAlphanumeric('en-US', { message: 'Stellar address must be alphanumeric' })
  @MinLength(56, { message: 'Stellar address must be 56 characters long' })
  @MaxLength(56, { message: 'Stellar address must be 56 characters long' })
  stellarAddress?: string;

  @ApiProperty({ enum: UserRole, required: false, default: UserRole.STUDENT })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be one of: student, instructor, admin' })
  role?: UserRole;
}
