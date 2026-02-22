export interface StorageProvider {
  upload(buffer: Buffer, path: string, mimeType: string): Promise<{ path: string; versionId?: string }>;
  delete(path: string, versionId?: string): Promise<void>;
  getPublicUrl(path: string, versionId?: string): string;
  download(path: string, versionId?: string): Promise<Buffer>;
}
