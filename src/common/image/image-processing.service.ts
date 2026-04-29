import { Injectable, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
}

export interface ProcessedImage {
  buffer: Buffer;
  mimeType: string;
  size: number;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class ImageProcessingService {
  async process(
    input: Buffer,
    mimeType: string,
    options: ImageProcessingOptions = {},
  ): Promise<ProcessedImage> {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(`Unsupported image type: ${mimeType}`);
    }
    if (input.length > MAX_SIZE_BYTES) {
      throw new BadRequestException('Image exceeds maximum allowed size of 10 MB');
    }

    const { width = 1920, height, quality = 80, format = 'webp' } = options;

    const pipeline = sharp(input).resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true,
    });

    let buffer: Buffer;
    switch (format) {
      case 'jpeg':
        buffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
        break;
      case 'png':
        buffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
        break;
      case 'avif':
        buffer = await pipeline.avif({ quality }).toBuffer();
        break;
      case 'webp':
      default:
        buffer = await pipeline.webp({ quality }).toBuffer();
        break;
    }

    return { buffer, mimeType: `image/${format}`, size: buffer.length };
  }

  async generateThumbnail(input: Buffer, size = 200): Promise<Buffer> {
    return sharp(input)
      .resize(size, size, { fit: 'cover' })
      .webp({ quality: 70 })
      .toBuffer();
  }
}
