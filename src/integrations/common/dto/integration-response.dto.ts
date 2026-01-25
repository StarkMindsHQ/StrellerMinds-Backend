import { IsString, IsEnum, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export enum IntegrationType {
  LTI = 'lti',
  ZOOM = 'zoom',
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  SSO = 'sso',
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export class IntegrationResponseDto {
  @IsString()
  id: string;

  @IsString()
  userId: string;

  @IsEnum(IntegrationType)
  integrationType: IntegrationType;

  @IsEnum(IntegrationStatus)
  status: IntegrationStatus;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  externalId?: string;

  @IsBoolean()
  isActive: boolean;

  @IsDateString()
  @IsOptional()
  lastSyncAt?: string;

  @IsString()
  @IsOptional()
  lastSyncStatus?: string;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class SyncStatusDto {
  @IsString()
  integrationId: string;

  @IsString()
  status: string;

  @IsDateString()
  @IsOptional()
  lastSyncAt?: string;

  @IsString()
  @IsOptional()
  errorMessage?: string;

  itemsProcessed: number;

  itemsFailed: number;
}
