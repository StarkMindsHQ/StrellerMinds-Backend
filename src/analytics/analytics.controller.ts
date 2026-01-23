import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { toCSV } from './utils/csv-export.util';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Post('track')
  track(@Body() dto: TrackEventDto) {
    return this.analyticsService.track(dto.event, dto.userId, dto.metadata);
  }

  @Post('reports')
  createReport(@Body() dto: CreateReportDto) {
    return this.analyticsService.createReport(dto);
  }

  @Post('reports/generate')
  generate(@Body() body: any) {
    return this.analyticsService.generateReport(body);
  }

  @Get('predict/:event')
  predict(@Param('event') event: string) {
    return this.analyticsService.predict(event);
  }

  @Post('export/csv')
  async exportCSV(@Body() body: any, @Res() res: Response) {
    const report = await this.analyticsService.generateReport(body);
    const csv = toCSV(report.data);

    res.header('Content-Type', 'text/csv');
    res.attachment('report.csv');
    return res.send(csv);
  }
}
