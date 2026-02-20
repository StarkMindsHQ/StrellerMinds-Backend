import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { BackupType, RetentionTier } from '../entities';

export class CreateBackupDto {
  @ApiPropertyOptional({
    enum: BackupType,
    default: BackupType.FULL,
    description: 'Type of backup to create',
  })
  @IsOptional()
  @IsEnum(BackupType)
  type?: BackupType;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether to compress the backup',
  })
  @IsOptional()
  @IsBoolean()
  compress?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether to encrypt the backup',
  })
  @IsOptional()
  @IsBoolean()
  encrypt?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether to verify the backup after creation',
  })
  @IsOptional()
  @IsBoolean()
  verify?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether to upload to cloud storage',
  })
  @IsOptional()
  @IsBoolean()
  uploadToCloud?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether to replicate to secondary region',
  })
  @IsOptional()
  @IsBoolean()
  replicateCrossRegion?: boolean;

  @ApiPropertyOptional({
    enum: RetentionTier,
    description: 'Retention tier for the backup',
  })
  @IsOptional()
  @IsEnum(RetentionTier)
  retentionTier?: RetentionTier;
}
