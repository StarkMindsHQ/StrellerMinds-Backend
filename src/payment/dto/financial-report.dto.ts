import { IsString, IsOptional, IsDate } from 'class-validator';

export class GenerateReportDto {
  @IsString()
  reportType: string;

  @IsString()
  @IsOptional()
  period?: string;

  @IsDate()
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @IsOptional()
  endDate?: Date;

  @IsOptional()
  filters?: Record<string, any>;
}

export class ReportFiltersDto {
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  subscriptionId?: string;
}

export class FinancialReportResponseDto {
  id: string;
  reportType: string;
  period: string;
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  transactionCount: number;
  generatedAt: Date;
}
