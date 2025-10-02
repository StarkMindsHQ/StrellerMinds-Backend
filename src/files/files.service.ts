/**
 * FilesService provides logic for file management (upload, download, etc.).
 */
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UploadedFileLike } from '../common/types/uploaded-file-like';
import { RedisService } from '../shared/services/redis.service';

@Injectable()
export class FilesService {
  private readonly tempDir = path.join(process.cwd(), 'uploads', 'tmp');

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly redisService: RedisService,
  ) {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async saveChunk(uploadId: string, chunkIndex: number, file: UploadedFileLike) {
    const chunkDir = path.join(this.tempDir, uploadId);
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }
    const chunkPath = path.join(chunkDir, `${chunkIndex}`);
    await fs.promises.writeFile(chunkPath, file.buffer);
  }

  /**
   * Assembles file chunks, compresses if video, uploads to Cloudinary, and returns the CDN URL.
   * @returns The Cloudinary CDN URL for the uploaded file
   */
  async assembleChunks(uploadId: string, fileName: string, totalChunks: number): Promise<string> {
    const chunkDir = path.join(this.tempDir, uploadId);
    const finalPath = path.join(process.cwd(), 'uploads', fileName);
    const writeStream = fs.createWriteStream(finalPath);
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `${i}`);
      const data = await fs.promises.readFile(chunkPath);
      writeStream.write(data);
    }
    writeStream.end();

    // Wait for the write stream to finish
    await new Promise<void>((resolve) => writeStream.on('finish', () => resolve()));

    // Cleanup chunks
    const files = await fs.promises.readdir(chunkDir);
    for (const file of files) {
      await fs.promises.unlink(path.join(chunkDir, file));
    }
    await fs.promises.rmdir(chunkDir);

    // Calculate file hash for deduplication
    const fileBuffer = await fs.promises.readFile(finalPath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const redisKey = `filehash:${hash}`;
    const existingUrl = await this.redisService.get(redisKey);
    if (existingUrl) {
      // Remove the just-assembled file since it's a duplicate
      await fs.promises.unlink(finalPath);
      return existingUrl;
    }

    // If video, compress
    if (this.isVideoFile(fileName)) {
      await this.compressVideo(finalPath);
    }

    // Upload to Cloudinary and return the CDN URL
    const uploadResult = await this.cloudinaryService.uploadVideoFromPath(finalPath);
    // Store hash-to-url mapping in Redis (no expiration)
    await this.redisService.set(redisKey, uploadResult.secure_url);
    return uploadResult.secure_url;
  }

  /**
   * Checks if a file is a video based on its extension.
   * @param fileName The file name to check
   */
  private isVideoFile(fileName: string): boolean {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    return videoExtensions.includes(path.extname(fileName).toLowerCase());
  }

  /**
   * Compresses a video file using ffmpeg and replaces the original with the compressed version.
   * @param filePath The path to the video file
   */
  private compressVideo(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tempCompressed = filePath + '.compressed.mp4';
      ffmpeg(filePath)
        .outputOptions([
          '-vcodec libx264',
          '-crf 28', // Adjust CRF for desired quality/size
          '-preset fast',
          '-acodec aac',
          '-b:a 128k',
        ])
        .on('end', async () => {
          try {
            await fs.promises.rename(tempCompressed, filePath);
            resolve();
          } catch (err) {
            reject(err);
          }
        })
        .on('error', (err) => {
          reject(err);
        })
        .save(tempCompressed);
    });
  }
  /**
   * Returns the upload progress for a given uploadId.
   * Lists which chunks have been received so far.
   */
  async getUploadProgress(uploadId: string, totalChunks?: number) {
    const chunkDir = path.join(this.tempDir, uploadId);
    let receivedChunks: number[] = [];
    if (fs.existsSync(chunkDir)) {
      const files = await fs.promises.readdir(chunkDir);
      receivedChunks = files.map((f) => parseInt(f, 10)).filter((n) => !isNaN(n));
    }
    return {
      uploadId,
      receivedChunks,
      totalChunks,
    };
  }
}
