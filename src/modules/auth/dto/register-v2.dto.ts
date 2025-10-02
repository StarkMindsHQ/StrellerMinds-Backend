import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
}

export class RegisterDtoV2 {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  stellarAddress?: string;

  @ApiProperty({ enum: UserRole, required: false, default: UserRole.STUDENT })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
