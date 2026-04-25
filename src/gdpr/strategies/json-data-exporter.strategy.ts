import { Injectable } from '@nestjs/common';
import { IDataExporter, DataExportResult } from '../interfaces/data-exporter.interface';

@Injectable()
export class JsonDataExporter implements IDataExporter {
  export(userData: Record<string, unknown>): DataExportResult {
    return {
      data: JSON.stringify(userData, null, 2),
      mimeType: 'application/json',
      filename: 'user-data.json',
    };
  }
}
