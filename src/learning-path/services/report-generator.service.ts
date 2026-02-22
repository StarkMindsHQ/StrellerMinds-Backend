import { Injectable, Logger } from '@nestjs/common';
import { ReportTemplate, VisualizationType } from '../entities/report-template.entity';
import { ExportFormat } from '../entities/report-schedule.entity';

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);

  /**
   * Generates report data based on template configuration.
   * In a real implementation, this would query the analytics database/warehouse.
   */
  async generateData(template: ReportTemplate): Promise<any> {
    this.logger.log(`Generating data for report: ${template.name} (${template.type})`);
    
    // Mock data generation based on type
    const data = this.getMockData(template);
    
    return {
      meta: {
        reportName: template.name,
        generatedAt: new Date(),
        metrics: template.configuration.metrics,
        dimensions: template.configuration.dimensions,
      },
      visualization: this.formatForVisualization(data, template.configuration.visualization),
      data: data,
    };
  }

  async exportReport(template: ReportTemplate, format: ExportFormat): Promise<Buffer> {
    const reportData = await this.generateData(template);
    
    if (format === ExportFormat.CSV) {
      return this.convertToCSV(reportData.data);
    } else if (format === ExportFormat.JSON) {
      return Buffer.from(JSON.stringify(reportData, null, 2));
    }
    
    // Default to JSON for unsupported formats in this mock
    return Buffer.from(JSON.stringify(reportData));
  }

  private getMockData(template: ReportTemplate) {
    // Generate dummy rows
    const rows = [];
    const days = 30;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      
      rows.push({
        date: date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 1000) + 100,
        revenue: Math.floor(Math.random() * 5000) + 500,
        engagement: Math.floor(Math.random() * 100),
        courseId: `course-${Math.floor(Math.random() * 5)}`,
      });
    }
    return rows;
  }

  private formatForVisualization(data: any[], type: VisualizationType) {
    const labels = data.map(d => d.date);
    
    switch (type) {
      case VisualizationType.LINE_CHART:
      case VisualizationType.BAR_CHART:
        return {
          type: type.toLowerCase().replace('_chart', ''),
          data: {
            labels,
            datasets: [
              {
                label: 'Revenue',
                data: data.map(d => d.revenue),
              },
              {
                label: 'Users',
                data: data.map(d => d.users),
              }
            ]
          }
        };
      case VisualizationType.PIE_CHART:
        // Aggregate for pie chart
        return {
          type: 'pie',
          data: {
            labels: ['Course A', 'Course B', 'Course C'],
            datasets: [{ data: [300, 500, 100] }]
          }
        };
      default:
        return { type: 'table', data };
    }
  }

  private convertToCSV(data: any[]): Buffer {
    if (!data.length) return Buffer.from('');
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    return Buffer.from([headers, ...rows].join('\n'));
  }
}