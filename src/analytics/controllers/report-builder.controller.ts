import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { ReportBuilderService } from '../services/report-builder.service';
import { CreateReportDto } from '../dto/analytics.dto';
import { ReportType } from '../entities/analytics-report.entity';

@ApiTags('Report Builder')
@Controller('analytics/builder')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportBuilderController {
  constructor(private readonly reportBuilderService: ReportBuilderService) {}

  @Post('reports')
  @ApiOperation({ summary: 'Create a new report' })
  @ApiResponse({ status: 201, description: 'Report created successfully' })
  async createReport(@Request() req, @Body() createReportDto: CreateReportDto) {
    const report = await this.reportBuilderService.createReport(
      req.user.id,
      createReportDto,
    );
    return {
      success: true,
      data: report,
    };
  }

  @Put('reports/:reportId')
  @ApiOperation({ summary: 'Update report configuration' })
  @ApiResponse({ status: 200, description: 'Report updated successfully' })
  async updateReport(
    @Request() req,
    @Param('reportId') reportId: string,
    @Body() updateData: Partial<CreateReportDto>,
  ) {
    const report = await this.reportBuilderService.updateReport(
      reportId,
      req.user.id,
      updateData,
    );
    return {
      success: true,
      data: report,
    };
  }

  @Post('reports/:reportId/clone')
  @ApiOperation({ summary: 'Clone an existing report' })
  @ApiResponse({ status: 201, description: 'Report cloned successfully' })
  async cloneReport(@Request() req, @Param('reportId') reportId: string) {
    const report = await this.reportBuilderService.cloneReport(reportId, req.user.id);
    return {
      success: true,
      data: report,
    };
  }

  @Get('metrics/:reportType')
  @ApiOperation({ summary: 'Get available metrics for report type' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getAvailableMetrics(@Param('reportType') reportType: ReportType) {
    const metrics = this.reportBuilderService.getAvailableMetrics(reportType);
    return {
      success: true,
      data: metrics,
    };
  }

  @Get('dimensions/:reportType')
  @ApiOperation({ summary: 'Get available dimensions for report type' })
  @ApiResponse({ status: 200, description: 'Dimensions retrieved successfully' })
  async getAvailableDimensions(@Param('reportType') reportType: ReportType) {
    const dimensions = this.reportBuilderService.getAvailableDimensions(reportType);
    return {
      success: true,
      data: dimensions,
    };
  }
}
