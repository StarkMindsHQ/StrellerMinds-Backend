import { Controller, Post, Get, Put, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import type { DataQualityService } from '../services/data-quality.service';
import type { DataQualityMonitoringService } from '../services/data-quality-monitoring.service';
import type { DataCleansingService } from '../services/data-cleansing.service';
import type { DataQualityReportingService } from '../services/data-quality-reporting.service';

@ApiTags('Data Quality')
@Controller('data-quality')
export class DataQualityController {
  constructor(
    private readonly dataQualityService: DataQualityService,
    private readonly monitoringService: DataQualityMonitoringService,
    private readonly cleansingService: DataCleansingService,
    private readonly reportingService: DataQualityReportingService,
  ) {}

  @Post('check')
  @ApiOperation({ summary: 'Check data quality for given dataset' })
  @ApiResponse({ status: 200, description: 'Data quality check completed' })
  async checkDataQuality(body) {
    return this.dataQualityService.checkDataQuality(body.entityType, body.data);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create a new data quality rule' })
  @ApiResponse({ status: 201, description: 'Rule created successfully' })
  async createRule(ruleData) {
    return this.dataQualityService.createRule(ruleData);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get data quality rules' })
  @ApiResponse({ status: 200, description: 'Rules retrieved successfully' })
  async getRules(entityType, ruleType, status, severity) {
    return this.dataQualityService.getRules({
      entityType,
      ruleType,
      status: status as any,
      severity,
    });
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Update a data quality rule' })
  @ApiResponse({ status: 200, description: 'Rule updated successfully' })
  async updateRule(id, updates) {
    return this.dataQualityService.updateRule(id, updates);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete a data quality rule' })
  @ApiResponse({ status: 200, description: 'Rule deleted successfully' })
  async deleteRule(id) {
    await this.dataQualityService.deleteRule(id);
    return { success: true, message: 'Rule deleted successfully' };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get data quality metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getMetrics(entityType, startDate, endDate, metricCategory) {
    return this.dataQualityService.getQualityMetrics({
      entityType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      metricCategory,
    });
  }

  @Get('issues')
  @ApiOperation({ summary: 'Get data quality issues' })
  @ApiResponse({ status: 200, description: 'Issues retrieved successfully' })
  async getIssues(status, priority, entityType, assignedTo) {
    return this.dataQualityService.getQualityIssues({
      status,
      priority,
      entityType,
      assignedTo,
    });
  }

  @Put('issues/:id/resolve')
  @ApiOperation({ summary: 'Resolve a data quality issue' })
  @ApiResponse({ status: 200, description: 'Issue resolved successfully' })
  async resolveIssue(id, body) {
    await this.dataQualityService.resolveIssue(id, body.resolution, body.resolvedBy);
    return { success: true, message: 'Issue resolved successfully' };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get data quality dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard(entityType) {
    return this.monitoringService.getDashboard(entityType);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get data quality alerts' })
  @ApiResponse({ status: 200, description: 'Alerts retrieved successfully' })
  async getAlerts(entityType) {
    return this.monitoringService.getQualityAlerts(entityType);
  }

  @Post('cleanse')
  @ApiOperation({ summary: 'Cleanse data using specified rules' })
  @ApiResponse({ status: 200, description: 'Data cleansing completed' })
  async cleanseData(body) {
    return this.cleansingService.cleanseData(body.data, body.rules);
  }

  @Get('cleansing-rules/:entityType')
  @ApiOperation({ summary: 'Get cleansing rules for entity type' })
  @ApiResponse({ status: 200, description: 'Cleansing rules retrieved successfully' })
  async getCleansingRules(entityType) {
    return this.cleansingService.getCleansingRules(entityType);
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate a data quality report' })
  @ApiResponse({ status: 201, description: 'Report generation started' })
  async generateReport(body) {
    return this.reportingService.generateReport(
      body.reportType as any,
      new Date(body.startDate),
      new Date(body.endDate),
    );
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get data quality reports' })
  @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
  async getReports(reportType, status, startDate, endDate) {
    return this.reportingService.getReports({
      reportType: reportType as any,
      status: status as any,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
