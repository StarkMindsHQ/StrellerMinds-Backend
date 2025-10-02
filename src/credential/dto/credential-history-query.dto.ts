import { IsOptional, IsInt, Min, IsString, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

/**
 * Enum for credential status filter in history queries.
 */
export enum CredentialStatus {
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
  REVOKED = 'REVOKED',
  ALL = 'ALL',
}

/**
 * DTO for querying credential history with filters and pagination.
 */
export class CredentialHistoryQueryDto {
  /** Page number for pagination (default: 1) */
  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  /** Number of items per page (default: 10) */
  @ApiPropertyOptional({ description: 'Number of items per page', default: 10, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  /** Credential type filter */
  @ApiPropertyOptional({ description: 'Credential type filter' })
  @IsOptional()
  @IsString()
  credentialType?: string;

  /** Start date for issued credentials (ISO8601) */
  @ApiPropertyOptional({
    description: 'Start date for issued credentials',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  /** End date for issued credentials (ISO8601) */
  @ApiPropertyOptional({
    description: 'End date for issued credentials',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  /** Credential status filter */
  @ApiPropertyOptional({
    enum: CredentialStatus,
    description: 'Credential status filter',
    default: CredentialStatus.ALL,
  })
  @IsOptional()
  @IsEnum(CredentialStatus)
  status?: CredentialStatus = CredentialStatus.ALL;
}
