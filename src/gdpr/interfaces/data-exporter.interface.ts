export interface DataExportResult {
  data: string;
  mimeType: string;
  filename: string;
}

export interface IDataExporter {
  export(userData: Record<string, unknown>): DataExportResult;
}

export const DATA_EXPORTER = 'DATA_EXPORTER';
