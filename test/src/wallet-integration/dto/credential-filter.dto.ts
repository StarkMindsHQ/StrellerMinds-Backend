import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { CredentialType, CredentialStatus } from '../entities/credential.entity';

export class CredentialFilterDto {
  @IsOptional()
  @IsEnum(CredentialType)
  type?: CredentialType;

  @IsOptional()
  @IsEnum(CredentialStatus)
  status?: CredentialStatus;

  @IsOptional()
  @IsString()
  issuer?: string;

  @IsOptional()
  @IsBoolean()
  isShared?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
