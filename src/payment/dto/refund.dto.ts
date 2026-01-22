import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateRefundDto {
  @IsString()
  paymentId: string;

  @IsNumber()
  @IsOptional()
  amount?: number; // Partial refund

  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class ApproveRefundDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RejectRefundDto {
  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RefundResponseDto {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  createdAt: Date;
}
