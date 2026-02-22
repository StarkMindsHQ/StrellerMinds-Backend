import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { StorageProviderFactory } from '../storage/storage-provider.factory';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ImageProcessor {
  private readonly logger = new Logger(ImageProcessor.name);

  constructor(private readonly storageFactory: StorageProviderFactory) {}

  async process(file: Express.Multer.File, ownerId: string) {
    const storage = this.storageFactory.getProvider();
    const fileId = uuid();

    // Process multiple variants
    const variants = [
      { name: 'thumb', size: 300 },
      { name: 'medium', size: 800 },
      { name: 'large', size: 1600 },
    ];

    let thumbnailPath = null;

    for (const variant of variants) {
      try {
        const buffer = await sharp(file.buffer)
          .resize(variant.size, variant.size, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();

        const path = `${ownerId}/processed/${fileId}_${variant.name}.webp`;
        await storage.upload(buffer, path, 'image/webp');

        if (variant.name === 'thumb') {
          thumbnailPath = path;
        }
      } catch (e) {
        this.logger.error(`Failed to process variant ${variant.name}`, e);
      }
    }

    return thumbnailPath;
  }
}
