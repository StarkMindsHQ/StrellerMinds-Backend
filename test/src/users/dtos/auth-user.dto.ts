/**
 * DTO for user authentication (login)
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AuthUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'StrongPassword123', minLength: 8, description: 'User password' })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;
}