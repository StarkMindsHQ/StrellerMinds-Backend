import { Inject, Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { StorageProvider } from '../storage/storage.interface';
import { v4 as uuid } from 'uuid';
import { File } from 'multer';

@Injectable()
export class ImageProcessor {
  constructor(
    @Inject('StorageProvider')
    private readonly storage: StorageProvider,
  ) {}

  async process(file: File, ownerId: string) {
    const buffer = await sharp(file.buffer).resize(300).webp().toBuffer();

    const path = `${ownerId}/thumbnails/${uuid()}.webp`;
    await this.storage.upload(buffer, path, 'image/webp');

    return path;
  }
}
