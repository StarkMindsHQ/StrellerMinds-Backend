import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  IsDateString,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnalyticsEventType } from '../entities/video-analytics.entity';

export class CreateVideoAnalyticsDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Video ID' })
  @IsString()
  videoId: string;

  @ApiProperty({ description: 'Event type', enum: AnalyticsEventType })
  @IsEnum(AnalyticsEventType)
  eventType: AnalyticsEventType;

  @ApiPropertyOptional({ description: 'Playback position in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  playbackPosition?: number;

  @ApiPropertyOptional({ description: 'Video quality' })
  @IsOptional()
  @IsString()
  quality?: string;

  @ApiPropertyOptional({ description: 'Playback rate' })
  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(4.0)
  playbackRate?: number;

  @ApiPropertyOptional({ description: 'Volume level' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  volume?: number;

  @ApiPropertyOptional({ description: 'Fullscreen status' })
  @IsOptional()
  @IsBoolean()
  isFullscreen?: boolean;

  @ApiPropertyOptional({ description: 'Buffer health percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  bufferHealth?: number;

  @ApiPropertyOptional({ description: 'Network bandwidth in kbps' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bandwidth?: number;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'IP address' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Geographic location' })
  @IsOptional()
  @IsObject()
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  };

  @ApiPropertyOptional({ description: 'Device information' })
  @IsOptional()
  @IsObject()
  deviceInfo?: {
    type?: 'desktop' | 'mobile' | 'tablet' | 'tv' | 'unknown';
    os?: string;
    osVersion?: string;
    browser?: string;
    browserVersion?: string;
    screenResolution?: string;
    devicePixelRatio?: number;
  };

  @ApiPropertyOptional({ description: 'Player information' })
  @IsOptional()
  @IsObject()
  playerInfo?: {
    version?: string;
    type?: 'html5' | 'flash' | 'native';
    features?: string[];
    plugins?: string[];
  };

  @ApiPropertyOptional({ description: 'Network information' })
  @IsOptional()
  @IsObject()
  networkInfo?: {
    connectionType?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };

  @ApiPropertyOptional({ description: 'Performance metrics' })
  @IsOptional()
  @IsObject()
  performanceMetrics?: {
    loadTime?: number;
    firstFrame?: number;
    bufferEvents?: number;
    qualityChanges?: number;
    errors?: number;
    averageBitrate?: number;
    droppedFrames?: number;
  };

  @ApiPropertyOptional({ description: 'Event-specific data' })
  @IsOptional()
  @IsObject()
  eventData?: {
    seekFrom?: number;
    seekTo?: number;
    previousQuality?: string;
    newQuality?: string;
    errorCode?: string;
    errorMessage?: string;
    bufferDuration?: number;
    [key: string]: any;
  };

  @ApiPropertyOptional({ description: 'Referrer URL' })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiPropertyOptional({ description: 'Page URL' })
  @IsOptional()
  @IsString()
  pageUrl?: string;
}

export class VideoAnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Video ID' })
  @IsOptional()
  @IsString()
  videoId?: string;

  @ApiPropertyOptional({ description: 'User ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Event types to filter', isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(AnalyticsEventType, { each: true })
  eventTypes?: AnalyticsEventType[];

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

export class VideoAnalyticsReportDto {
  @ApiPropertyOptional({ description: 'Report type' })
  @IsOptional()
  @IsEnum(['engagement', 'performance', 'geographic', 'device', 'quality'])
  reportType?: 'engagement' | 'performance' | 'geographic' | 'device' | 'quality';

  @ApiPropertyOptional({ description: 'Time period' })
  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month'])
  timePeriod?: 'hour' | 'day' | 'week' | 'month';

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Video IDs to include' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videoIds?: string[];

  @ApiPropertyOptional({ description: 'Group by field' })
  @IsOptional()
  @IsString()
  groupBy?: string;

  @ApiPropertyOptional({ description: 'Include detailed metrics' })
  @IsOptional()
  @IsBoolean()
  includeDetails?: boolean;
}
