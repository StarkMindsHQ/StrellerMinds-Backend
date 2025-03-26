import { Controller, Get, Query } from '@nestjs/common';
import { EmailService } from '../email.service';

@Controller('admin/email-analytics')
export class EmailAnalyticsController {
  constructor(private readonly emailService: EmailService) {}

  @Get('overview')
  async getOverview(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );
    const end = new Date(endDate || new Date());

    const analytics = await this.emailService.getEmailAnalytics(start, end);

    // Calculate overall metrics
    const totalSent = analytics.reduce((sum, item) => {
      return sum + (item.status === 'sent' ? Number.parseInt(item.count) : 0);
    }, 0);

    const totalOpened = analytics.reduce((sum, item) => {
      return sum + (item.status === 'opened' ? Number.parseInt(item.count) : 0);
    }, 0);

    const totalClicked = analytics.reduce((sum, item) => {
      return (
        sum + (item.status === 'clicked' ? Number.parseInt(item.count) : 0)
      );
    }, 0);

    const totalFailed = analytics.reduce((sum, item) => {
      return sum + (item.status === 'failed' ? Number.parseInt(item.count) : 0);
    }, 0);

    // Calculate open and click rates
    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;

    return {
      totalSent,
      totalOpened,
      totalClicked,
      totalFailed,
      openRate: openRate.toFixed(2) + '%',
      clickRate: clickRate.toFixed(2) + '%',
      byTemplate: analytics,
    };
  }

  @Get('by-template')
  async getByTemplate(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('templateName') templateName: string,
  ) {
    const start = new Date(
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );
    const end = new Date(endDate || new Date());

    return this.emailService.getEmailAnalytics(start, end, templateName);
  }

  @Get('daily')
  async getDailyStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('templateName') templateName?: string,
  ) {
    const start = new Date(
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );
    const end = new Date(endDate || new Date());

    // Get daily stats for the date range
    return this.emailService.getDailyEmailStats(start, end, templateName);
  }
}
