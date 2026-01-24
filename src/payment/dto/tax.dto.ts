import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTaxRateDto {
  @IsString()
  country: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsNumber()
  rate: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateTaxRateDto {
  @IsNumber()
  @IsOptional()
  rate?: number;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CalculateTaxDto {
  @IsNumber()
  amount: number;

  @IsString()
  country: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  currency?: string;
}

export class TaxResponseDto {
  amount: number;
  rate: number;
  tax: number;
  total: number;
  country: string;
  currency: string;
}
