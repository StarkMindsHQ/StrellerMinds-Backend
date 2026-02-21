import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsInt,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiKeyStatus, ApiKeyTier } from '../entities/api-key.entity';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'Name for the API key' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: ApiKeyTier, default: ApiKeyTier.FREE })
  @IsOptional()
  @IsEnum(ApiKeyTier)
  tier?: ApiKeyTier;

  @ApiPropertyOptional({ description: 'Rate limit (requests per hour)', default: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000)
  rateLimit?: number;

  @ApiPropertyOptional({ description: 'Allowed IP addresses', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIps?: string[];

  @ApiPropertyOptional({ description: 'Allowed origins', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedOrigins?: string[];

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateApiKeyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ApiKeyStatus })
  @IsOptional()
  @IsEnum(ApiKeyStatus)
  status?: ApiKeyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000)
  rateLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIps?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedOrigins?: string[];
}

export class ApiKeyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  keyPrefix: string;

  @ApiProperty({ enum: ApiKeyStatus })
  status: ApiKeyStatus;

  @ApiProperty({ enum: ApiKeyTier })
  tier: ApiKeyTier;

  @ApiProperty()
  rateLimit: number;

  @ApiProperty()
  requestCount: number;

  @ApiProperty()
  totalRequests: number;

  @ApiProperty()
  lastUsedAt?: Date;

  @ApiProperty()
  expiresAt?: Date;

  @ApiProperty()
  createdAt: Date;
}
