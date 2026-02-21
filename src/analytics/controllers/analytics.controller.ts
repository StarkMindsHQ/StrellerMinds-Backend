import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { AnalyticsService } from '../services/analytics.service';
import { DataExportService } from '../services/data-export.service';
import { ExportReportDto } from '../dto/analytics.dto';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly dataExportService: DataExportService,
  ) {}

  @Get('reports')
  @ApiOperation({ summary: 'List all reports' })
  @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
  async listReports(@Request() req, @Query() filters?: any) {
    const reports = await this.analyticsService.listReports(req.user.id, filters);
    return {
      success: true,
      data: reports,
    };
  }

  @Get('reports/:reportId')
  @ApiOperation({ summary: 'Get report by ID' })
  @ApiResponse({ status: 200, description: 'Report retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReport(@Request() req, @Param('reportId') reportId: string) {
    const report = await this.analyticsService.getReportById(reportId, req.user.id);
    return {
      success: true,
      data: report,
    };
  }

  @Post('reports/:reportId/generate')
  @ApiOperation({ summary: 'Generate report data' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  @HttpCode(HttpStatus.OK)
  async generateReport(@Param('reportId') reportId: string) {
    const report = await this.analyticsService.generateReport(reportId);
    return {
      success: true,
      data: report,
    };
  }

  @Post('reports/:reportId/export')
  @ApiOperation({ summary: 'Export report in specified format' })
  @ApiResponse({ status: 200, description: 'Report exported successfully' })
  async exportReport(
    @Request() req,
    @Param('reportId') reportId: string,
    @Body() exportDto: ExportReportDto,
    @Res() res: Response,
  ) {
    const report = await this.analyticsService.getReportById(reportId, req.user.id);

    const { data, mimeType, extension } = await this.dataExportService.exportReport(
      report.data,
      exportDto.format,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${report.id}.${extension}"`,
    );

    if (Buffer.isBuffer(data)) {
      res.send(data);
    } else {
      res.send(data);
    }
  }

  @Delete('reports/:reportId')
  @ApiOperation({ summary: 'Delete report' })
  @ApiResponse({ status: 200, description: 'Report deleted successfully' })
  @HttpCode(HttpStatus.OK)
  async deleteReport(@Request() req, @Param('reportId') reportId: string) {
    await this.analyticsService.deleteReport(reportId, req.user.id);
    return {
      success: true,
      message: 'Report deleted successfully',
    };
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get analytics dashboard overview' })
  @ApiResponse({ status: 200, description: 'Overview retrieved successfully' })
  async getDashboardOverview(@Request() req, @Query() query?: any) {
    const dateRange = query.startDate && query.endDate
      ? { start: new Date(query.startDate), end: new Date(query.endDate) }
      : undefined;

    const overview = await this.analyticsService.getDashboardOverview(
      req.user.id,
      dateRange,
    );

    return {
      success: true,
      data: overview,
    };
  }
}
