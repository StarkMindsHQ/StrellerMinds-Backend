import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaymentMethod, PaymentType } from '../entities/payment.entity';

export class ProcessPaymentDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @IsEnum(PaymentType)
  @IsNotEmpty()
  type: PaymentType;

  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  planName?: string;

  @IsString()
  @IsOptional()
  billingCycle?: string;

  // For XLM payments
  @IsString()
  @IsOptional()
  stellarPublicKey?: string;

  // For traditional payments
  @IsString()
  @IsOptional()
  paymentToken?: string;
}
