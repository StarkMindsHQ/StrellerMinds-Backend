import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ErrorDashboardService } from './error-dashboard.service';

@ApiTags('Error Dashboard')
@Controller('error-dashboard')
export class ErrorDashboardController {
  constructor(private readonly errorDashboardService: ErrorDashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get error summary dashboard' })
  @ApiResponse({ status: 200, description: 'Error summary retrieved successfully' })
  @ApiQuery({
    name: 'timeRange',
    required: false,
    description: 'Time range in hours (default: 24)',
  })
  @ApiQuery({ name: 'errorCode', required: false, description: 'Filter by specific error code' })
  async getErrorSummary(
    @Query('timeRange') timeRange?: number,
    @Query('errorCode') errorCode?: string,
  ) {
    return this.errorDashboardService.getErrorSummary(timeRange, errorCode);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get error trends dashboard' })
  @ApiResponse({ status: 200, description: 'Error trends retrieved successfully' })
  @ApiQuery({
    name: 'timeRange',
    required: false,
    description: 'Time range in hours (default: 168 - 1 week)',
  })
  @ApiQuery({
    name: 'interval',
    required: false,
    description: 'Grouping interval in hours (default: 1)',
  })
  async getErrorTrends(
    @Query('timeRange') timeRange?: number,
    @Query('interval') interval?: number,
  ) {
    return this.errorDashboardService.getErrorTrends(timeRange, interval);
  }

  @Get('top-errors')
  @ApiOperation({ summary: 'Get top errors dashboard' })
  @ApiResponse({ status: 200, description: 'Top errors retrieved successfully' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of top errors to return (default: 10)',
  })
  @ApiQuery({
    name: 'timeRange',
    required: false,
    description: 'Time range in hours (default: 24)',
  })
  async getTopErrors(@Query('limit') limit?: number, @Query('timeRange') timeRange?: number) {
    return this.errorDashboardService.getTopErrors(limit, timeRange);
  }

  @Get('error-details')
  @ApiOperation({ summary: 'Get detailed error information' })
  @ApiResponse({ status: 200, description: 'Error details retrieved successfully' })
  @ApiQuery({ name: 'correlationId', required: true, description: 'Correlation ID of the error' })
  async getErrorDetails(@Query('correlationId') correlationId: string) {
    return this.errorDashboardService.getErrorDetails(correlationId);
  }

  @Get('alert-history')
  @ApiOperation({ summary: 'Get error alert history' })
  @ApiResponse({ status: 200, description: 'Alert history retrieved successfully' })
  @ApiQuery({
    name: 'timeRange',
    required: false,
    description: 'Time range in hours (default: 168 - 1 week)',
  })
  @ApiQuery({
    name: 'severity',
    required: false,
    description: 'Filter by severity (low, medium, high, critical)',
  })
  async getAlertHistory(
    @Query('timeRange') timeRange?: number,
    @Query('severity') severity?: string,
  ) {
    return this.errorDashboardService.getAlertHistory(timeRange, severity);
  }
}
