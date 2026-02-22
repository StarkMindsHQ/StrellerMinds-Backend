import { Controller, Get, Post, Body, Param, Delete, Res, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportBuilderService } from '../services/report-builder.service';
import { ReportGeneratorService } from '../services/report-generator.service';
import { ReportSchedulerService } from '../services/report-scheduler.service';
import { CreateReportTemplateDto } from '../dto/create-report-template.dto';
import { ScheduleReportDto } from '../dto/schedule-report.dto';
import { ExportFormat } from '../entities/report-schedule.entity';

@ApiTags('Reports & Analytics')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportBuilder: ReportBuilderService,
    private readonly reportGenerator: ReportGeneratorService,
    private readonly reportScheduler: ReportSchedulerService,
  ) {}

  @Post('templates')
  @ApiOperation({ summary: 'Create a new report template' })
  createTemplate(@Body() dto: CreateReportTemplateDto, @Request() req) {
    const userId = req.user?.id || 'admin-user'; // Mock user ID
    return this.reportBuilder.createTemplate(dto, userId);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List report templates' })
  findAll(@Request() req) {
    const userId = req.user?.id || 'admin-user';
    return this.reportBuilder.findAll(userId);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get report template details' })
  findOne(@Param('id') id: string) {
    return this.reportBuilder.findOne(id);
  }

  @Post('templates/:id/generate')
  @ApiOperation({ summary: 'Generate report data for visualization' })
  async generateReport(@Param('id') id: string) {
    const template = await this.reportBuilder.findOne(id);
    return this.reportGenerator.generateData(template);
  }

  @Get('templates/:id/export')
  @ApiOperation({ summary: 'Export report to CSV/JSON' })
  async exportReport(
    @Param('id') id: string, 
    @Query('format') format: ExportFormat,
    @Res() res: Response
  ) {
    const template = await this.reportBuilder.findOne(id);
    const buffer = await this.reportGenerator.exportReport(template, format);
    
    res.set({
      'Content-Type': format === ExportFormat.CSV ? 'text/csv' : 'application/json',
      'Content-Disposition': `attachment; filename="${template.name}.${format.toLowerCase()}"`,
    });
    
    res.send(buffer);
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a report' })
  async scheduleReport(@Body() dto: ScheduleReportDto) {
    const template = await this.reportBuilder.findOne(dto.templateId);
    return this.reportScheduler.createSchedule(dto, template);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete a report template' })
  remove(@Param('id') id: string) {
    return this.reportBuilder.remove(id);
  }
}