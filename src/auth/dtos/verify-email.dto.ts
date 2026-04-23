import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @IsString({ message: 'Verification token must be a string' })
  @IsNotEmpty({ message: 'Verification token is required' })
  @MaxLength(500, { message: 'Verification token must not exceed 500 characters' })
  token: string;
}
