import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token received via email',
    example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    maxLength: 500,
  })
  @IsString({ message: 'Verification token must be a string' })
  @IsNotEmpty({ message: 'Verification token is required' })
  @MaxLength(500, { message: 'Verification token must not exceed 500 characters' })
  token: string;
}
