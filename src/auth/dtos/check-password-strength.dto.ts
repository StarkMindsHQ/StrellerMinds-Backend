import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class CheckPasswordStrengthDto {
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(1, { message: 'Password must not be empty' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password: string;
}
