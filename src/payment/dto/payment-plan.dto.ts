import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreatePaymentPlanDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  price: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  trialDays?: number;

  @IsNumber()
  @IsOptional()
  maxSubscribers?: number;

  @IsArray()
  @IsOptional()
  features?: string[];

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdatePaymentPlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  trialDays?: number;

  @IsNumber()
  @IsOptional()
  maxSubscribers?: number;

  @IsArray()
  @IsOptional()
  features?: string[];

  @IsOptional()
  metadata?: Record<string, any>;
}

export class PaymentPlanResponseDto {
  id: string;
  name: string;
  price: number;
  currency: string;
  trialDays?: number;
  features?: string[];
  createdAt: Date;
  updatedAt: Date;
}
