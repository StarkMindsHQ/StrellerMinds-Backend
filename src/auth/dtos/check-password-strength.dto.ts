import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckPasswordStrengthDto {
  @ApiProperty({
    description: 'Password to evaluate for strength',
    example: 'MyP@ssword1',
    minLength: 1,
    maxLength: 128,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(1, { message: 'Password must not be empty' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password: string;
}
