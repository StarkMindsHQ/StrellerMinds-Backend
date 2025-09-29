import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for user registration.
 */
export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'StrongPassword123', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'John', required: false, description: 'First name (optional)' })
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false, description: 'Last name (optional)' })
  @IsString()
  lastName?: string;
}

