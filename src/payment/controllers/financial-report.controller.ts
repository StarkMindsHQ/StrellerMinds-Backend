import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { FinancialReportingService } from '../services';
import { GenerateReportDto, FinancialReportResponseDto } from '../dto';

@Controller('financial-reports')
export class FinancialReportController {
  constructor(private financialReportingService: FinancialReportingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async generateReport(
    @Body() dto: GenerateReportDto,
  ): Promise<FinancialReportResponseDto> {
    return this.financialReportingService.generateReport(dto);
  }

  @Get(':id')
  async getReport(@Param('id') id: string): Promise<FinancialReportResponseDto> {
    return this.financialReportingService.getReport(id);
  }

  @Get()
  async listReports(
    @Query('period') period?: string,
  ): Promise<FinancialReportResponseDto[]> {
    return this.financialReportingService.listReports(period);
  }
}
