/**
 * DTO for creating a new user.
 *
 * Used for user registration and admin user creation.
 *
 * All fields are documented for OpenAPI/Swagger UI.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../enums/userRole.enum';
import { AccountStatus } from '../enums/accountStatus.enum';

export class CreateUsersDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'StrongPassword123',
    minLength: 8,
    description: 'User password (min 8 chars)',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({
    example: 'https://cdn.com/profile.jpg',
    description: 'Profile image URL (optional)',
  })
  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @ApiPropertyOptional({ example: 'A short bio', description: 'User biography (optional)' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ enum: UserRole, description: 'User role (optional)' })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ enum: AccountStatus, description: 'Account status (optional)' })
  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;
}
