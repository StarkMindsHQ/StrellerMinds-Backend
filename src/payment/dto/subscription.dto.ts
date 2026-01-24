import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsDate } from 'class-validator';
import { SubscriptionStatus, BillingCycle } from '../enums';

export class CreateSubscriptionDto {
  @IsString()
  paymentPlanId: string;

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateSubscriptionDto {
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @IsString()
  @IsOptional()
  cancellationReason?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CancelSubscriptionDto {
  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class SubscriptionResponseDto {
  id: string;
  userId: string;
  paymentPlanId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  startDate: Date;
  nextBillingDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
