import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsentType, ConsentStatus } from '../entities/user-consent.entity';

/**
 * DTO for updating a user's consent.
 */
export class UpdateConsentDto {
  /** Consent type */
  @ApiProperty({ enum: ConsentType, description: 'Consent type' })
  @IsEnum(ConsentType)
  consentType: ConsentType;

  /** Consent status */
  @ApiProperty({ enum: ConsentStatus, description: 'Consent status' })
  @IsEnum(ConsentStatus)
  status: ConsentStatus;

  /** Purpose of consent (optional) */
  @ApiPropertyOptional({ description: 'Purpose of consent' })
  @IsOptional()
  @IsString()
  purpose?: string;

  /** Legal basis for consent (optional) */
  @ApiPropertyOptional({ description: 'Legal basis for consent' })
  @IsOptional()
  @IsString()
  legalBasis?: string;

  /** Expiry date for consent (optional) */
  @ApiPropertyOptional({
    description: 'Expiry date for consent',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

/**
 * DTO for updating consent preferences.
 */
export class ConsentPreferencesDto {
  /** Marketing consent status (optional) */
  @ApiPropertyOptional({ enum: ConsentStatus, description: 'Marketing consent status' })
  @IsOptional()
  @IsEnum(ConsentStatus)
  marketing?: ConsentStatus;

  /** Analytics consent status (optional) */
  @ApiPropertyOptional({ enum: ConsentStatus, description: 'Analytics consent status' })
  @IsOptional()
  @IsEnum(ConsentStatus)
  analytics?: ConsentStatus;

  /** Functional consent status (optional) */
  @ApiPropertyOptional({ enum: ConsentStatus, description: 'Functional consent status' })
  @IsOptional()
  @IsEnum(ConsentStatus)
  functional?: ConsentStatus;
}
