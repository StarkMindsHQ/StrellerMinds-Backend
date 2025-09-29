import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsNumber,
  IsObject,
  ValidateNested,
  Min,
  Max,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VideoVisibility } from '../entities/video.entity';

export class VideoSecuritySettingsDto {
  @ApiPropertyOptional({ description: 'Require authentication to view' })
  @IsOptional()
  @IsBoolean()
  requireAuth?: boolean;

  @ApiPropertyOptional({ description: 'Allowed domains for embedding' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDomains?: string[];

  @ApiPropertyOptional({ description: 'Geographic restrictions' })
  @IsOptional()
  @IsObject()
  geoRestrictions?: {
    allowedCountries?: string[];
    blockedCountries?: string[];
  };

  @ApiPropertyOptional({ description: 'Enable DRM protection' })
  @IsOptional()
  @IsBoolean()
  drmEnabled?: boolean;

  @ApiPropertyOptional({ description: 'DRM provider' })
  @IsOptional()
  @IsString()
  drmProvider?: string;

  @ApiPropertyOptional({ description: 'Signed URL expiry in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(86400)
  signedUrlExpiry?: number;

  @ApiPropertyOptional({ description: 'Allow video downloads' })
  @IsOptional()
  @IsBoolean()
  downloadEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Allow video embedding' })
  @IsOptional()
  @IsBoolean()
  embedEnabled?: boolean;
}

export class VideoWatermarkDto {
  @ApiProperty({ description: 'Enable watermark' })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Watermark image URL' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Watermark position' })
  @IsOptional()
  @IsEnum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'])
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

  @ApiPropertyOptional({ description: 'Watermark opacity' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;
}

export class VideoProcessingSettingsDto {
  @ApiPropertyOptional({ description: 'Generate thumbnails' })
  @IsOptional()
  @IsBoolean()
  generateThumbnails?: boolean;

  @ApiPropertyOptional({ description: 'Number of thumbnails to generate' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  thumbnailCount?: number;

  @ApiPropertyOptional({ description: 'Generate preview GIF' })
  @IsOptional()
  @IsBoolean()
  generatePreview?: boolean;

  @ApiPropertyOptional({ description: 'Enable adaptive streaming' })
  @IsOptional()
  @IsBoolean()
  adaptiveStreaming?: boolean;

  @ApiPropertyOptional({ description: 'Quality levels to generate' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualityLevels?: string[];

  @ApiPropertyOptional({ description: 'Watermark settings' })
  @IsOptional()
  @ValidateNested()
  @Type(() => VideoWatermarkDto)
  watermark?: VideoWatermarkDto;
}

export class CreateVideoDto {
  @ApiProperty({ description: 'Video title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Video description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Original filename' })
  @IsString()
  originalFilename: string;

  @ApiPropertyOptional({ description: 'Video visibility', enum: VideoVisibility })
  @IsOptional()
  @IsEnum(VideoVisibility)
  visibility?: VideoVisibility;

  @ApiPropertyOptional({ description: 'Video tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Video chapters' })
  @IsOptional()
  @IsArray()
  chapters?: Array<{
    title: string;
    startTime: number;
    endTime: number;
  }>;

  @ApiPropertyOptional({ description: 'Security settings' })
  @IsOptional()
  @ValidateNested()
  @Type(() => VideoSecuritySettingsDto)
  securitySettings?: VideoSecuritySettingsDto;

  @ApiPropertyOptional({ description: 'Processing settings' })
  @IsOptional()
  @ValidateNested()
  @Type(() => VideoProcessingSettingsDto)
  processingSettings?: VideoProcessingSettingsDto;

  @ApiPropertyOptional({ description: 'Associated lesson ID' })
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiPropertyOptional({ description: 'Custom metadata' })
  @IsOptional()
  @IsObject()
  customData?: Record<string, any>;
}
