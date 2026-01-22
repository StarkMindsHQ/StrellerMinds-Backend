export interface StorageProvider {
  upload(buffer: Buffer, path: string, mimeType: string): Promise<void>;
  delete(path: string): Promise<void>;
  getPublicUrl(path: string): string;
}
