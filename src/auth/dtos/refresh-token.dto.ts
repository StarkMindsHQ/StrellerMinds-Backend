import { IsNotEmpty, IsString, IsJWT } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  @IsJWT({ message: 'Refresh token must be a valid JWT' })
  refreshToken: string;
}
