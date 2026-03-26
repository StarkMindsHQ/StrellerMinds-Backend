import { Injectable, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { v4 as uuid } from 'uuid';
import { StorageProviderFactory } from '../storage/storage-provider.factory';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath = require('ffmpeg-static');

@Injectable()
export class VideoProcessor {
  private readonly logger = new Logger(VideoProcessor.name);

  constructor(private readonly storageFactory: StorageProviderFactory) {
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
    }
  }

  async process(file: Express.Multer.File, ownerId: string): Promise<string> {
    const storage = this.storageFactory.getProvider();
    const tempInputPath = path.join(os.tmpdir(), `input-${uuid()}-${file.originalname}`);
    const tempOutputPath = path.join(os.tmpdir(), `thumb-${uuid()}.png`);

    try {
      await fs.promises.writeFile(tempInputPath, file.buffer);

      await new Promise((resolve, reject) => {
        ffmpeg(tempInputPath)
          .screenshots({
            count: 1,
            folder: os.tmpdir(),
            filename: path.basename(tempOutputPath),
            size: '320x?',
          })
          .on('end', resolve)
          .on('error', reject);
      });

      const thumbnailBuffer = await fs.promises.readFile(tempOutputPath);
      const thumbnailPath = `${ownerId}/thumbnails/${uuid()}.png`;

      await storage.upload(thumbnailBuffer, thumbnailPath, 'image/png');

      // Trigger background transcoding
      this.transcode(tempInputPath, ownerId);

      return thumbnailPath;
    } catch (error) {
      this.logger.error('Video processing failed', error);
      return null;
    } finally {
      // Cleanup happens after transcoding or here if failed
      if (fs.existsSync(tempOutputPath)) await fs.promises.unlink(tempOutputPath);
    }
  }

  private async transcode(inputPath: string, ownerId: string) {
    const storage = this.storageFactory.getProvider();
    const resolutions = [
      { name: '720p', size: '1280x720' },
      { name: '1080p', size: '1920x1080' },
    ];

    for (const res of resolutions) {
      const outputPath = path.join(os.tmpdir(), `transcoded-${uuid()}-${res.name}.mp4`);
      try {
        await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .size(res.size)
            .output(outputPath)
            .on('end', resolve)
            .on('error', reject)
            .run();
        });

        const buffer = await fs.promises.readFile(outputPath);
        const cloudPath = `${ownerId}/videos/${uuid()}_${res.name}.mp4`;
        await storage.upload(buffer, cloudPath, 'video/mp4');

        await fs.promises.unlink(outputPath);
      } catch (e) {
        this.logger.error(`Transcoding to ${res.name} failed`, e);
      }
    }
    // Final cleanup of input
    if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath);
  }
}
