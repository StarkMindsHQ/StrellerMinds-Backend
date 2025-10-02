/**
 * AnalyticsController handles analytics data export and reporting endpoints.
 */
import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { AnalyticsService } from './analytics.service';
import { ExportAnalyticsDto } from './dto/export-analytics.dto';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Export analytics data as CSV or JSON' })
  @ApiQuery({
    name: 'format',
    enum: ['csv', 'json'],
    required: false,
    description: 'Export format',
  })
  @ApiResponse({ status: 200, description: 'Analytics data exported.' })
  @Get('export')
  async exportAnalyticsData(@Query() query: ExportAnalyticsDto, @Res() res: Response) {
    const data = await this.analyticsService.getAllAnalytics();

    if (query.format === 'csv') {
      const csvData = this.analyticsService.convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
      return res.send(csvData);
    }

    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  }

  @ApiOperation({ summary: 'Get credential issuance analytics' })
  @ApiResponse({ status: 200, description: 'Credential issuance analytics.' })
  @Get('credential-issuance')
  getCredentialIssuance() {
    return this.analyticsService.getCredentialIssuance();
  }

  @ApiOperation({ summary: 'Get transaction volumes analytics' })
  @ApiResponse({ status: 200, description: 'Transaction volumes analytics.' })
  @Get('transactions')
  getTransactionVolumes() {
    return this.analyticsService.getTransactionVolumes();
  }

  @ApiOperation({ summary: 'Get cost analysis analytics' })
  @ApiResponse({ status: 200, description: 'Cost analysis analytics.' })
  @Get('costs')
  getCostAnalysis() {
    return this.analyticsService.getCostAnalysis();
  }

  @ApiOperation({ summary: 'Get usage reports analytics' })
  @ApiResponse({ status: 200, description: 'Usage reports analytics.' })
  @Get('usage-reports')
  getUsageReports() {
    return this.analyticsService.getUsageReports();
  }
}
