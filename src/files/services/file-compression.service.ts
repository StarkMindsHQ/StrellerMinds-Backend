import { Injectable, Logger } from '@nestjs/common';
import { IFileCompressor, CompressionOptions, CompressionResult } from '../interfaces/file-compression.interface';
import * as sharp from 'sharp';
import * as zlib from 'zlib';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

@Injectable()
export class FileCompressionService implements IFileCompressor {
  private readonly logger = new Logger(FileCompressionService.name);

  async compressImage(buffer: Buffer, options: CompressionOptions): Promise<CompressionResult> {
    try {
      let sharpInstance = sharp(buffer);
      const metadata = await sharpInstance.metadata();

      // Resize if dimensions are specified
      if (options.maxWidth || options.maxHeight) {
        sharpInstance = sharpInstance.resize({
          width: options.maxWidth,
          height: options.maxHeight,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Apply format-specific optimizations
      const format = options.format || this.getOptimalFormat(metadata.format);
      
      switch (format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({
            quality: options.quality || 85,
            progressive: options.progressive !== false,
            optimize: options.optimize !== false,
          });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({
            progressive: options.progressive !== false,
            compressionLevel: 9,
            adaptiveFiltering: true,
          });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({
            quality: options.quality || 85,
            effort: 6,
          });
          break;
        case 'avif':
          sharpInstance = sharpInstance.avif({
            quality: options.quality || 85,
            effort: 6,
          });
          break;
        default:
          sharpInstance = sharpInstance.jpeg({ quality: 85 });
      }

      const compressedBuffer = await sharpInstance.toBuffer();
      const originalSize = buffer.length;
      const compressedSize = compressedBuffer.length;

      return {
        buffer: compressedBuffer,
        originalSize,
        compressedSize,
        compressionRatio: originalSize > 0 ? (originalSize - compressedSize) / originalSize : 0,
        format,
      };
    } catch (error) {
      this.logger.error('Image compression failed', error);
      throw new Error(`Image compression failed: ${error.message}`);
    }
  }

  async compressVideo(buffer: Buffer, options: CompressionOptions): Promise<CompressionResult> {
    // Video compression would require ffmpeg integration
    // For now, return the original buffer with no compression
    this.logger.warn('Video compression not implemented yet, returning original buffer');
    return {
      buffer,
      originalSize: buffer.length,
      compressedSize: buffer.length,
      compressionRatio: 0,
      format: 'video',
    };
  }

  async compressDocument(buffer: Buffer, mimeType: string): Promise<CompressionResult> {
    try {
      // Compress text-based documents
      if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml')) {
        const compressedBuffer = await this.gzipCompress(buffer);
        return {
          buffer: compressedBuffer,
          originalSize: buffer.length,
          compressedSize: compressedBuffer.length,
          compressionRatio: (buffer.length - compressedBuffer.length) / buffer.length,
          format: 'gzip',
        };
      }

      // For PDFs and other binary documents, return original
      return {
        buffer,
        originalSize: buffer.length,
        compressedSize: buffer.length,
        compressionRatio: 0,
        format: 'original',
      };
    } catch (error) {
      this.logger.error('Document compression failed', error);
      throw new Error(`Document compression failed: ${error.message}`);
    }
  }

  isCompressible(mimeType: string): boolean {
    const compressibleTypes = [
      'image/',
      'text/',
      'application/json',
      'application/xml',
      'application/javascript',
    ];
    
    return compressibleTypes.some(type => mimeType.includes(type));
  }

  private getOptimalFormat(originalFormat: string): 'jpeg' | 'png' | 'webp' | 'avif' {
    // Choose the most efficient format based on the original
    switch (originalFormat) {
      case 'jpeg':
      case 'jpg':
        return 'jpeg';
      case 'png':
        return 'webp'; // WebP usually provides better compression than PNG
      case 'gif':
        return 'webp';
      default:
        return 'webp'; // Default to WebP for modern browsers
    }
  }

  private async gzipCompress(buffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gzip(buffer, { level: 9 }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  async compressStream(
    inputStream: NodeJS.ReadableStream,
    mimeType: string,
    options: CompressionOptions = {}
  ): Promise<NodeJS.ReadableStream> {
    if (mimeType.startsWith('image/')) {
      // For images, we need to buffer the entire stream for Sharp processing
      const chunks: Buffer[] = [];
      for await (const chunk of inputStream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const result = await this.compressImage(buffer, options);
      return Readable.from([result.buffer]);
    }

    if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml')) {
      // Create gzip stream for text content
      const gzipStream = zlib.createGzip({ level: 9 });
      return inputStream.pipe(gzipStream);
    }

    // Return original stream for non-compressible content
    return inputStream;
  }
}
