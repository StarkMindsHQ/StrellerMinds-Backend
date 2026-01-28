import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { BackupType } from '../entities';

export class CreateBackupScheduleDto {
  @ApiProperty({
    description: 'Name of the schedule',
    example: 'Daily Production Backup',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Cron expression for the schedule',
    example: '0 2 * * *',
  })
  @IsString()
  cronExpression: string;

  @ApiPropertyOptional({
    enum: BackupType,
    default: BackupType.FULL,
    description: 'Type of backup',
  })
  @IsOptional()
  @IsEnum(BackupType)
  backupType?: BackupType;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether the schedule is enabled',
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether to compress backups',
  })
  @IsOptional()
  @IsBoolean()
  compress?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether to encrypt backups',
  })
  @IsOptional()
  @IsBoolean()
  encrypt?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether to verify backups',
  })
  @IsOptional()
  @IsBoolean()
  verify?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether to upload to cloud',
  })
  @IsOptional()
  @IsBoolean()
  uploadToCloud?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether to replicate cross-region',
  })
  @IsOptional()
  @IsBoolean()
  replicateCrossRegion?: boolean;

  @ApiPropertyOptional({
    default: 30,
    description: 'Number of days to retain backups',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  retentionDays?: number;

  @ApiPropertyOptional({
    description: 'Description of the schedule',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateBackupScheduleDto extends PartialType(CreateBackupScheduleDto) {}
