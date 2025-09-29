/**
 * DTO for authentication response.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  access_token: string;

  @ApiPropertyOptional({ description: 'Refresh token (optional)' })
  refresh_token?: string;

  @ApiProperty({ description: 'Token expiration in seconds', example: 3600 })
  expires_in: number;

  @ApiProperty({
    description: 'User info',
    type: 'object',
    example: { id: 'uuid', email: 'user@example.com', roles: ['user'] },
  })
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}
