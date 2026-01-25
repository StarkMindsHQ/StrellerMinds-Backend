import { Inject, Injectable, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { v4 as uuid } from 'uuid';
import { StorageProvider } from '../files/storage/storage.interface';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath = require('ffmpeg-static');

@Injectable()
export class TranscodingService {
  private readonly logger = new Logger(TranscodingService.name);

  constructor(
    @Inject('StorageProvider')
    private readonly storage: StorageProvider,
  ) {
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
    }
  }

  async transcodeToHls(inputPath: string, outputDirName: string): Promise<string> {
    const tempOutputDir = path.join(os.tmpdir(), outputDirName);
    if (!fs.existsSync(tempOutputDir)) {
      fs.mkdirSync(tempOutputDir, { recursive: true });
    }

    const manifestName = 'master.m3u8';
    const outputPath = path.join(tempOutputDir, manifestName);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-preset veryfast',
          '-g 48',
          '-sc_threshold 0',
          '-map 0:0',
          '-map 0:1',
          '-map 0:0',
          '-map 0:1',
          '-map 0:0',
          '-map 0:1',
          '-s:v:0 1920x1080',
          '-c:v:0 libx264',
          '-b:v:0 5000k',
          '-s:v:1 1280x720',
          '-c:v:1 libx264',
          '-b:v:1 2800k',
          '-s:v:2 640x360',
          '-c:v:2 libx264',
          '-b:v:2 800k',
          '-c:a aac',
          '-b:a 128k',
          '-ac 2',
          '-f hls',
          '-hls_time 10',
          '-hls_playlist_type vod',
          '-master_pl_name ' + manifestName,
          `-var_stream_map v:0,a:0 v:1,a:1 v:2,a:2`,
        ])
        .output(path.join(tempOutputDir, 'stream_%v.m3u8'))
        .on('end', async () => {
             this.logger.log('Transcoding finished successfully');
             try {
                // Upload all files in tempOutputDir to storage
                const files = fs.readdirSync(tempOutputDir);
                for (const file of files) {
                    const buffer = fs.readFileSync(path.join(tempOutputDir, file));
                    await this.storage.upload(buffer, `${outputDirName}/${file}`, file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t');
                }
                // Return path to master manifest in storage
                resolve(`${outputDirName}/${manifestName}`);
             } catch (err) {
                 reject(err);
             } finally {
                 // Cleanup
                 fs.rmSync(tempOutputDir, { recursive: true, force: true });
             }
        })
        .on('error', (err) => {
          this.logger.error('Transcoding error', err);
          reject(err);
        })
        .run();
    });
  }
}
