import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Repository } from 'typeorm';

import type { Dashboard } from '../entities/dashboard.entity';
import type { RealTimeAnalyticsService } from '../services/real-time-analytics.service';
import type { BusinessIntelligenceService } from '../services/business-intelligence.service';

@ApiTags('Dashboard')
@Controller('analytics/dashboards')
export class DashboardController {
  constructor(
    private readonly dashboardRepository: Repository<Dashboard>,
    private readonly realTimeAnalyticsService: RealTimeAnalyticsService,
    private readonly businessIntelligenceService: BusinessIntelligenceService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new dashboard' })
  @ApiResponse({ status: 201, description: 'Dashboard created successfully' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createDashboard(@Body() dashboardData: Partial<Dashboard>) {
    const dashboard = this.dashboardRepository.create(dashboardData);
    return this.dashboardRepository.save(dashboard);
  }

  @Get()
  @ApiOperation({ summary: 'Get all dashboards' })
  @ApiResponse({ status: 200, description: 'Dashboards retrieved successfully' })
  async getDashboards(
    @Query('createdBy') createdBy?: string,
    @Query('isPublic') isPublic?: boolean,
  ) {
    const query = this.dashboardRepository.createQueryBuilder('dashboard');

    if (createdBy) {
      query.andWhere('dashboard.createdBy = :createdBy', { createdBy });
    }

    if (isPublic !== undefined) {
      query.andWhere('dashboard.isPublic = :isPublic', { isPublic });
    }

    return query.orderBy('dashboard.createdAt', 'DESC').getMany();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dashboard by ID' })
  @ApiResponse({ status: 200, description: 'Dashboard retrieved successfully' })
  async getDashboard(@Param('id') id: string) {
    const dashboard = await this.dashboardRepository.findOne({
      where: { id },
    });

    if (!dashboard) {
      throw new Error(`Dashboard ${id} not found`);
    }

    return dashboard;
  }

  @Get(':id/data')
  @ApiOperation({ summary: 'Get dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboardData(@Param('id') id: string) {
    const dashboard = await this.getDashboard(id);
    const widgetData = {};

    for (const widget of dashboard.widgets) {
      try {
        let data;

        switch (widget.type) {
          case 'metric':
            data = await this.getMetricWidgetData(widget.configuration);
            break;
          case 'chart':
            data = await this.getChartWidgetData(widget.configuration);
            break;
          case 'table':
            data = await this.getTableWidgetData(widget.configuration);
            break;
          case 'gauge':
            data = await this.getGaugeWidgetData(widget.configuration);
            break;
          default:
            data = null;
        }

        widgetData[widget.id] = data;
      } catch (error) {
        widgetData[widget.id] = { error: error.message };
      }
    }

    return {
      dashboard,
      data: widgetData,
      timestamp: new Date(),
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard updated successfully' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateDashboard(@Param('id') id: string, @Body() updateData: Partial<Dashboard>) {
    await this.dashboardRepository.update(id, updateData);
    return this.getDashboard(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard deleted successfully' })
  async deleteDashboard(@Param('id') id: string) {
    const result = await this.dashboardRepository.delete(id);

    if (result.affected === 0) {
      throw new Error(`Dashboard ${id} not found`);
    }

    return { success: true, message: 'Dashboard deleted successfully' };
  }

  private async getMetricWidgetData(config: any) {
    const { metric, timeRange, filters } = config;

    const query = {
      metrics: [metric],
      timeRange: {
        start: new Date(timeRange.start),
        end: new Date(timeRange.end),
      },
      filters,
    };

    const result = await this.businessIntelligenceService.executeQuery(query);

    return {
      value: result.summary.aggregations[`${metric}_total`] || 0,
      change: 0, // Calculate change from previous period
      trend: 'up', // Calculate trend
    };
  }

  private async getChartWidgetData(config: any) {
    const { metrics, timeRange, chartType, groupBy } = config;

    const query = {
      metrics,
      timeRange: {
        start: new Date(timeRange.start),
        end: new Date(timeRange.end),
      },
      dimensions: groupBy,
    };

    const result = await this.businessIntelligenceService.executeQuery(query);

    return {
      type: chartType,
      data: result.data.map((point) => ({
        x: point.timestamp,
        ...point.metrics,
      })),
    };
  }

  private async getTableWidgetData(config: any) {
    const { metrics, timeRange, dimensions, limit } = config;

    const query = {
      metrics,
      timeRange: {
        start: new Date(timeRange.start),
        end: new Date(timeRange.end),
      },
      dimensions,
      limit,
    };

    const result = await this.businessIntelligenceService.executeQuery(query);

    return {
      columns: ['timestamp', ...dimensions, ...metrics],
      rows: result.data.map((point) => [
        point.timestamp,
        ...dimensions.map((dim) => point.dimensions[dim]),
        ...metrics.map((metric) => point.metrics[metric]),
      ]),
    };
  }

  private async getGaugeWidgetData(config: any) {
    const { metric, timeRange, target, thresholds } = config;

    const query = {
      metrics: [metric],
      timeRange: {
        start: new Date(timeRange.start),
        end: new Date(timeRange.end),
      },
    };

    const result = await this.businessIntelligenceService.executeQuery(query);
    const value = result.summary.aggregations[`${metric}_total`] || 0;

    return {
      value,
      target,
      percentage: target > 0 ? (value / target) * 100 : 0,
      status: this.getGaugeStatus(value, thresholds),
    };
  }

  private getGaugeStatus(value: number, thresholds: any) {
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.warning) return 'warning';
    return 'critical';
  }
}
