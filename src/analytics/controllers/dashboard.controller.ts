import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { DataAggregationService } from '../services/data-aggregation.service';
import { DashboardQueryDto } from '../dto/analytics.dto';
import { ReportType } from '../entities/analytics-report.entity';

@ApiTags('Analytics Dashboard')
@Controller('analytics/dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dataAggregationService: DataAggregationService) {}

  @Get('user-engagement')
  @ApiOperation({ summary: 'Get real-time user engagement metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getUserEngagement(@Query() query: DashboardQueryDto) {
    const dateRange = this.getDateRange(query);
    const data = await this.dataAggregationService.aggregateData(
      ReportType.USER_ENGAGEMENT,
      {
        dateRange,
        metrics: ['totalUsers', 'activeUsers', 'engagementRate'],
        dimensions: ['date'],
        filters: {},
      },
    );

    return {
      success: true,
      data,
    };
  }

  @Get('financial')
  @ApiOperation({ summary: 'Get real-time financial metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getFinancialMetrics(@Query() query: DashboardQueryDto) {
    const dateRange = this.getDateRange(query);
    const data = await this.dataAggregationService.aggregateData(
      ReportType.FINANCIAL,
      {
        dateRange,
        metrics: ['totalRevenue', 'netRevenue', 'transactionCount'],
        dimensions: ['date'],
        filters: {},
      },
    );

    return {
      success: true,
      data,
    };
  }

  @Get('system-health')
  @ApiOperation({ summary: 'Get real-time system health metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getSystemHealth(@Query() query: DashboardQueryDto) {
    const dateRange = this.getDateRange(query);
    const data = await this.dataAggregationService.aggregateData(
      ReportType.SYSTEM_HEALTH,
      {
        dateRange,
        metrics: ['totalRequests', 'errorRate', 'uptime'],
        dimensions: ['date'],
        filters: {},
      },
    );

    return {
      success: true,
      data,
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get dashboard summary with all key metrics' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getDashboardSummary(@Query() query: DashboardQueryDto) {
    const dateRange = this.getDateRange(query);

    const [userEngagement, financial, systemHealth] = await Promise.all([
      this.dataAggregationService.aggregateData(ReportType.USER_ENGAGEMENT, {
        dateRange,
        metrics: ['totalUsers', 'activeUsers'],
        dimensions: [],
        filters: {},
      }),
      this.dataAggregationService.aggregateData(ReportType.FINANCIAL, {
        dateRange,
        metrics: ['totalRevenue', 'netRevenue'],
        dimensions: [],
        filters: {},
      }),
      this.dataAggregationService.aggregateData(ReportType.SYSTEM_HEALTH, {
        dateRange,
        metrics: ['totalRequests', 'errorRate'],
        dimensions: [],
        filters: {},
      }),
    ]);

    return {
      success: true,
      data: {
        userEngagement: userEngagement.summary,
        financial: financial.summary,
        systemHealth: systemHealth.summary,
      },
    };
  }

  private getDateRange(query: DashboardQueryDto): { start: string; end: string } {
    const end = query.endDate || new Date().toISOString();
    const start = query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    return { start, end };
  }
}
