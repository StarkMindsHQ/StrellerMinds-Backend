import { IsNumber, IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  courseId: string;
}
