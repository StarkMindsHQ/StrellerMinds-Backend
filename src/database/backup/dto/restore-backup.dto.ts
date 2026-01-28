import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class RestoreBackupDto {
  @ApiProperty({
    description: 'ID of the backup to restore',
  })
  @IsUUID()
  backupId: string;

  @ApiPropertyOptional({
    description: 'Target database name (defaults to main database)',
  })
  @IsOptional()
  @IsString()
  targetDatabase?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether to verify data after restore',
  })
  @IsOptional()
  @IsBoolean()
  verifyAfterRestore?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Whether to restore from replica region',
  })
  @IsOptional()
  @IsBoolean()
  fromReplica?: boolean;
}

export class PointInTimeRestoreDto {
  @ApiProperty({
    description: 'Target point in time for recovery (ISO 8601 format)',
  })
  @IsDateString()
  targetTime: string;

  @ApiPropertyOptional({
    description: 'Target database name (defaults to main database)',
  })
  @IsOptional()
  @IsString()
  targetDatabase?: string;
}
