/**
 * DTO for account deletion confirmation
 */
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmDeletionDto {
  @ApiProperty({ description: 'Account deletion confirmation token' })
  token: string;
}
