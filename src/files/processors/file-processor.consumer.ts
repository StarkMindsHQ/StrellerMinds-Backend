import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { FilesService } from '../files.service';
import { ImageProcessor } from './image.processor';
import { VideoProcessor } from './video.processor';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity } from '../entities/file.entity';
import { Repository } from 'typeorm';
import * as path from 'path';

@Processor('file-processing')
export class FileProcessorConsumer {
  private readonly logger = new Logger(FileProcessorConsumer.name);

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,
    private readonly imageProcessor: ImageProcessor,
    private readonly videoProcessor: VideoProcessor,
    private readonly filesService: FilesService,
  ) {}

  @Process('process-media')
  async handleMediaProcessing(job: Job<{ fileId: string; userId: string }>) {
    const { fileId, userId } = job.data;
    this.logger.log(`Processing media for file: ${fileId}`);

    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) {
      this.logger.error(`File ${fileId} not found for processing`);
      return;
    }

    try {
      // Download file to temp buffer
      const storage = (this.filesService as any).storageFactory.getProvider(file.storageProvider);
      const buffer = await storage.download(file.path);

      // Create fake Multer file
      const fakeFile: any = {
        buffer,
        originalname: path.basename(file.path),
        mimetype: file.mimeType,
      };

      let thumbnailPath: string = null;
      if (file.type === 'image') {
        thumbnailPath = await this.imageProcessor.process(fakeFile, userId);
      } else if (file.type === 'video') {
        thumbnailPath = await this.videoProcessor.process(fakeFile, userId);
      }

      if (thumbnailPath) {
        file.thumbnailPath = thumbnailPath;
        await this.fileRepo.save(file);
      }

      this.logger.log(`Media processing completed for file: ${fileId}`);
    } catch (error) {
      this.logger.error(`Media processing failed for file ${fileId}`, error);
      throw error;
    }
  }
}
