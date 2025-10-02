/**
 * DTO for password requirements response.
 */
import { ApiProperty } from '@nestjs/swagger';

export class PasswordRequirementsDto {
  @ApiProperty({ type: [String], description: 'List of password requirements' })
  requirements: string[];
}
