export interface CompressionOptions {
  quality?: number;
  progressive?: boolean;
  optimize?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
}

export interface CompressionResult {
  buffer: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
}

export interface IFileCompressor {
  compressImage(buffer: Buffer, options: CompressionOptions): Promise<CompressionResult>;
  compressVideo(buffer: Buffer, options: CompressionOptions): Promise<CompressionResult>;
  compressDocument(buffer: Buffer, mimeType: string): Promise<CompressionResult>;
  isCompressible(mimeType: string): boolean;
}
