import { Inject, Injectable, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { v4 as uuid } from 'uuid';
import { StorageProvider } from '../storage/storage.interface';
import { File } from 'multer';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath = require('ffmpeg-static');

@Injectable()
export class VideoProcessor {
  private readonly logger = new Logger(VideoProcessor.name);

  constructor(
    @Inject('StorageProvider')
    private readonly storage: StorageProvider,
  ) {
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
    }
  }

  async process(file: File, ownerId: string): Promise<string> {
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
      
      await this.storage.upload(thumbnailBuffer, thumbnailPath, 'image/png');
      
      return thumbnailPath;
    } catch (error) {
      this.logger.error('Video processing failed', error);
      return null;
    } finally {
      // Cleanup
      try {
        if (fs.existsSync(tempInputPath)) await fs.promises.unlink(tempInputPath);
        if (fs.existsSync(tempOutputPath)) await fs.promises.unlink(tempOutputPath);
      } catch (e) {
        this.logger.warn('Failed to cleanup temp files', e);
      }
    }
  }

  // Keep old method for backward compatibility or future queue implementation
  async queueTranscoding(path: string) {
     this.logger.log(`Queued video for transcoding: ${path}`);
  }
}
