import { ImageProcessingService } from './image-processing.service';
import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

describe('ImageProcessingService', () => {
  let service: ImageProcessingService;

  beforeEach(() => {
    service = new ImageProcessingService();
  });

  const createValidImage = async (format: 'jpeg' | 'png' | 'webp' | 'gif' | 'avif' = 'png'): Promise<Buffer> => {
    const img = sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 100, b: 50, alpha: 1 },
      },
    });
    switch (format) {
      case 'jpeg':
        return img.jpeg().toBuffer();
      case 'webp':
        return img.webp().toBuffer();
      case 'gif':
        return img.gif().toBuffer();
      case 'avif':
        return img.avif().toBuffer();
      default:
        return img.png().toBuffer();
    }
  };

  describe('file type validation', () => {
    const allowedTypes = [
      { mime: 'image/jpeg', format: 'jpeg' as const },
      { mime: 'image/png', format: 'png' as const },
      { mime: 'image/webp', format: 'webp' as const },
      { mime: 'image/avif', format: 'avif' as const },
    ];
    const disallowedTypes = ['application/pdf', 'text/plain', 'image/svg+xml', 'video/mp4', 'application/json'];

    allowedTypes.forEach(({ mime, format }) => {
      it(`should accept allowed mime type: ${mime}`, async () => {
        const buffer = await createValidImage(format);
        const result = await service.process(buffer, mime);
        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Buffer);
      });
    });

    it('should accept image/gif mime type', async () => {
      const buffer = await createValidImage('gif');
      const result = await service.process(buffer, 'image/gif');
      expect(result).toBeDefined();
    });

    disallowedTypes.forEach((mimeType) => {
      it(`should reject disallowed mime type: ${mimeType}`, async () => {
        const buffer = Buffer.from('fake-file-data');
        await expect(service.process(buffer, mimeType)).rejects.toThrow(BadRequestException);
        await expect(service.process(buffer, mimeType)).rejects.toThrow(`Unsupported image type: ${mimeType}`);
      });
    });
  });

  describe('file size validation', () => {
    const MAX_SIZE = 10 * 1024 * 1024;

    it('should accept file under 10MB', async () => {
      const buffer = await createValidImage('jpeg');
      const result = await service.process(buffer, 'image/jpeg');
      expect(result).toBeDefined();
    });

    it('should reject file over 10MB', async () => {
      const buffer = Buffer.alloc(MAX_SIZE + 1);
      await expect(service.process(buffer, 'image/jpeg')).rejects.toThrow(BadRequestException);
      await expect(service.process(buffer, 'image/jpeg')).rejects.toThrow('Image exceeds maximum allowed size of 10 MB');
    });

    it('should reject file significantly over 10MB', async () => {
      const buffer = Buffer.alloc(50 * 1024 * 1024);
      await expect(service.process(buffer, 'image/png')).rejects.toThrow(BadRequestException);
    });
  });

  describe('image processing with different formats', () => {
    it('should process jpeg format', async () => {
      const buffer = await createValidImage('png');
      const result = await service.process(buffer, 'image/png', { format: 'jpeg', quality: 90 });
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should process png format', async () => {
      const buffer = await createValidImage('jpeg');
      const result = await service.process(buffer, 'image/jpeg', { format: 'png' });
      expect(result.mimeType).toBe('image/png');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should process webp format', async () => {
      const buffer = await createValidImage('jpeg');
      const result = await service.process(buffer, 'image/jpeg', { format: 'webp', quality: 80 });
      expect(result.mimeType).toBe('image/webp');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should process avif format', async () => {
      const buffer = await createValidImage('jpeg');
      const result = await service.process(buffer, 'image/jpeg', { format: 'avif', quality: 80 });
      expect(result.mimeType).toBe('image/avif');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should default to webp when no format specified', async () => {
      const buffer = await createValidImage('png');
      const result = await service.process(buffer, 'image/png');
      expect(result.mimeType).toBe('image/webp');
    });
  });

  describe('image resizing', () => {
    it('should resize image to specified dimensions', async () => {
      const buffer = await sharp({
        create: {
          width: 1920,
          height: 1080,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
      const result = await service.process(buffer, 'image/png', { width: 800, height: 600 });
      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.width).toBeLessThanOrEqual(800);
      expect(metadata.height).toBeLessThanOrEqual(600);
    });

    it('should not enlarge small images', async () => {
      const buffer = await createValidImage('png');
      const result = await service.process(buffer, 'image/png', { width: 1920, height: 1080 });
      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
    });

    it('should use default dimensions when not specified', async () => {
      const buffer = await sharp({
        create: {
          width: 2000,
          height: 2000,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
      const result = await service.process(buffer, 'image/png');
      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.width).toBeLessThanOrEqual(1920);
    });
  });

  describe('thumbnail generation', () => {
    it('should generate thumbnail with default size', async () => {
      const buffer = await sharp({
        create: {
          width: 1000,
          height: 1000,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
      const thumbnail = await service.generateThumbnail(buffer);
      const metadata = await sharp(thumbnail).metadata();
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(200);
      expect(metadata.format).toBe('webp');
    });

    it('should generate thumbnail with custom size', async () => {
      const buffer = await sharp({
        create: {
          width: 1000,
          height: 1000,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
      const thumbnail = await service.generateThumbnail(buffer, 100);
      const metadata = await sharp(thumbnail).metadata();
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
    });

    it('should generate square thumbnail with cover fit', async () => {
      const buffer = await sharp({
        create: {
          width: 1920,
          height: 1080,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
      const thumbnail = await service.generateThumbnail(buffer, 300);
      const metadata = await sharp(thumbnail).metadata();
      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(300);
    });
  });

  describe('quality settings', () => {
    const createComplexImage = async (): Promise<Buffer> => {
      const width = 1000;
      const height = 1000;
      const channels = 4;
      const noise = Buffer.alloc(width * height * channels, 0);
      for (let i = 0; i < noise.length; i++) {
        noise[i] = Math.floor(Math.random() * 256);
      }
      return sharp(noise, { raw: { width, height, channels } })
        .png()
        .toBuffer();
    };

    it('should apply quality setting for jpeg', async () => {
      const buffer = await createComplexImage();
      const highQuality = await service.process(buffer, 'image/png', { format: 'jpeg', quality: 100 });
      const lowQuality = await service.process(buffer, 'image/png', { format: 'jpeg', quality: 10 });
      expect(highQuality.size).toBeGreaterThan(lowQuality.size);
    });

    it('should apply quality setting for webp', async () => {
      const buffer = await createComplexImage();
      const highQuality = await service.process(buffer, 'image/png', { format: 'webp', quality: 100 });
      const lowQuality = await service.process(buffer, 'image/png', { format: 'webp', quality: 10 });
      expect(highQuality.size).toBeGreaterThan(lowQuality.size);
    });
  });

  describe('ProcessedImage interface', () => {
    it('should return correct ProcessedImage structure', async () => {
      const buffer = await createValidImage('png');
      const result = await service.process(buffer, 'image/png');
      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('mimeType');
      expect(result).toHaveProperty('size');
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(typeof result.mimeType).toBe('string');
      expect(typeof result.size).toBe('number');
      expect(result.size).toBe(result.buffer.length);
    });
  });
});
