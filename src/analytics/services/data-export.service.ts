import { Injectable } from '@nestjs/common';
import { Parser } from 'json2csv';

@Injectable()
export class DataExportService {
  async exportToCSV(data: any[]): Promise<string> {
    if (!data || data.length === 0) {
      return '';
    }

    const fields = Object.keys(data[0]);
    const parser = new Parser({ fields });
    return parser.parse(data);
  }

  async exportToJSON(data: any): Promise<string> {
    return JSON.stringify(data, null, 2);
  }

  async exportToXLSX(data: any[]): Promise<Buffer> {
    // Placeholder for XLSX export
    // In production, use libraries like 'xlsx' or 'exceljs'
    const csv = await this.exportToCSV(data);
    return Buffer.from(csv, 'utf-8');
  }

  async exportToPDF(reportData: any): Promise<Buffer> {
    // Placeholder for PDF export
    // In production, use libraries like 'pdfkit' or 'puppeteer'
    const json = await this.exportToJSON(reportData);
    return Buffer.from(json, 'utf-8');
  }

  async exportReport(
    reportData: any,
    format: 'csv' | 'xlsx' | 'pdf' | 'json',
  ): Promise<{ data: Buffer | string; mimeType: string; extension: string }> {
    switch (format) {
      case 'csv':
        return {
          data: await this.exportToCSV(this.flattenData(reportData)),
          mimeType: 'text/csv',
          extension: 'csv',
        };
      case 'xlsx':
        return {
          data: await this.exportToXLSX(this.flattenData(reportData)),
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          extension: 'xlsx',
        };
      case 'pdf':
        return {
          data: await this.exportToPDF(reportData),
          mimeType: 'application/pdf',
          extension: 'pdf',
        };
      case 'json':
        return {
          data: await this.exportToJSON(reportData),
          mimeType: 'application/json',
          extension: 'json',
        };
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private flattenData(data: any): any[] {
    if (Array.isArray(data)) {
      return data;
    }

    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }

    if (data.summary) {
      return [data.summary];
    }

    return [data];
  }
}
