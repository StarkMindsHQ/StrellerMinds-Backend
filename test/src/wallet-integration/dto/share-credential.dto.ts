import { IsString, IsOptional, IsArray } from 'class-validator';

export class ShareCredentialDto {
  @IsArray()
  @IsString({ each: true })
  credentialIds: string[];

  @IsString()
  recipientAddress: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  expirationDate?: string;
}

