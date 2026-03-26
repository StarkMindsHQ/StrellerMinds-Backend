import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SdkLanguage } from '../entities/sdk-download.entity';

export class GenerateSdkDto {
  @ApiProperty({ enum: SdkLanguage, description: 'Programming language for SDK' })
  @IsEnum(SdkLanguage)
  language: SdkLanguage;

  @ApiPropertyOptional({ description: 'API version', default: 'v1' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'Package name (for npm, pip, etc.)' })
  @IsOptional()
  @IsString()
  packageName?: string;
}

export class SdkDownloadResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: SdkLanguage })
  language: SdkLanguage;

  @ApiProperty()
  version: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  downloadUrl?: string;

  @ApiPropertyOptional()
  fileSize?: number;

  @ApiProperty()
  downloadCount: number;

  @ApiProperty()
  createdAt: Date;
}
