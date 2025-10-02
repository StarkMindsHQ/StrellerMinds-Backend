import { Injectable, Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';

import { type Report, ReportType, ReportFormat } from '../entities/report.entity';
import type { BusinessIntelligenceService } from './business-intelligence.service';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    private readonly reportRepository: Repository<Report>,
    private readonly businessIntelligenceService: BusinessIntelligenceService,
  ) {}

  async createReport(reportData: Partial<Report>): Promise<Report> {
    const report = this.reportRepository.create(reportData);
    return this.reportRepository.save(report);
  }

  async executeReport(reportId: string): Promise<any> {
    try {
      const report = await this.reportRepository.findOne({
        where: { id: reportId },
      });

      if (!report) {
        throw new Error(`Report ${reportId} not found`);
      }

      const query = {
        metrics: report.configuration.metrics,
        timeRange: {
          start: new Date(report.configuration.timeRange.start),
          end: new Date(report.configuration.timeRange.end),
        },
        dimensions: report.configuration.groupBy,
        filters: report.configuration.filters,
      };

      const result = await this.businessIntelligenceService.executeQuery(query);

      // Update report with last execution
      await this.reportRepository.update(reportId, {
        lastExecuted: new Date(),
        lastResult: result,
      });

      return this.formatReportResult(result, report.format);
    } catch (error) {
      this.logger.error(`Failed to execute report ${reportId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  private formatReportResult(result: any, format: ReportFormat): any {
    switch (format) {
      case ReportFormat.JSON:
        return result;
      case ReportFormat.CSV:
        return this.convertToCSV(result);
      case ReportFormat.PDF:
        return this.convertToPDF(result);
      case ReportFormat.EXCEL:
        return this.convertToExcel(result);
      default:
        return result;
    }
  }

  private convertToCSV(result: any): string {
    if (!result.data || result.data.length === 0) {
      return '';
    }

    const headers = ['timestamp', ...Object.keys(result.data[0].metrics)];
    const rows = result.data.map((row: any) => [
      row.timestamp.toISOString(),
      ...Object.values(row.metrics),
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  private convertToPDF(result: any): Buffer {
    // Implementation would use a PDF library like puppeteer or pdfkit
    // For now, return a placeholder
    return Buffer.from(JSON.stringify(result));
  }

  private convertToExcel(result: any): Buffer {
    // Implementation would use a library like exceljs
    // For now, return a placeholder
    return Buffer.from(JSON.stringify(result));
  }

  @Cron('0 */15 * * * *') // Every 15 minutes
  async executeScheduledReports(): Promise<void> {
    this.logger.log('Checking for scheduled reports');

    const scheduledReports = await this.reportRepository.find({
      where: { type: ReportType.SCHEDULED, isActive: true },
    });

    for (const report of scheduledReports) {
      if (this.shouldExecuteReport(report)) {
        try {
          await this.executeReport(report.id);
          this.logger.log(`Executed scheduled report: ${report.name}`);
        } catch (error) {
          this.logger.error(
            `Failed to execute scheduled report ${report.name}: ${error.message}`,
            error.stack,
          );
        }
      }
    }
  }

  private shouldExecuteReport(report: Report): boolean {
    if (!report.schedule?.cron) {
      return false;
    }

    // Simple cron check - in production, use a proper cron parser
    const now = new Date();
    const lastExecuted = report.lastExecuted;

    if (!lastExecuted) {
      return true;
    }

    // Check if enough time has passed based on cron schedule
    const timeDiff = now.getTime() - lastExecuted.getTime();
    const fifteenMinutes = 15 * 60 * 1000;

    return timeDiff >= fifteenMinutes;
  }

  async getReports(filters?: {
    type?: ReportType;
    createdBy?: string;
    isActive?: boolean;
  }): Promise<Report[]> {
    const query = this.reportRepository.createQueryBuilder('report');

    if (filters?.type) {
      query.andWhere('report.type = :type', { type: filters.type });
    }

    if (filters?.createdBy) {
      query.andWhere('report.createdBy = :createdBy', {
        createdBy: filters.createdBy,
      });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('report.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    return query.orderBy('report.createdAt', 'DESC').getMany();
  }
}
