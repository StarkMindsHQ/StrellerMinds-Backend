import { IsString, IsNumber, IsOptional, IsArray, IsDate } from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  @IsOptional()
  tax?: number;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDate()
  @IsOptional()
  dueDate?: Date;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsOptional()
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateInvoiceDto {
  @IsNumber()
  @IsOptional()
  tax?: number;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsDate()
  @IsOptional()
  dueDate?: Date;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class SendInvoiceDto {
  @IsString()
  email: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  message?: string;
}

export class InvoiceResponseDto {
  id: string;
  invoiceNumber: string;
  userId: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  dueDate: Date;
  createdAt: Date;
}
