import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from './entities/file.entity';
import { ImageProcessor } from './processors/image.processor';
import { VideoProcessor } from './processors/video.processor';
import { VirusScanService } from './virus-scan.service';
import { StorageProvider } from './storage/storage.interface';
import { v4 as uuid } from 'uuid';
import type { File } from 'multer';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(FileEntity)
    private readonly repo: Repository<FileEntity>,
    private readonly imageProcessor: ImageProcessor,
    private readonly videoProcessor: VideoProcessor,
    private readonly virusScanService: VirusScanService,
    @Inject('StorageProvider')
    private readonly storage: StorageProvider,
  ) {}

  async upload(file: File, ownerId: string) {
    // 1. Virus Scan
    const scanResult = await this.virusScanService.scanBuffer(file.buffer);
    if (scanResult === 'infected') {
      throw new BadRequestException('File is infected with a virus');
    }

    const type = this.detectType(file.mimetype);
    const fileId = uuid();
    const path = `${ownerId}/${fileId}-${file.originalname}`;

    // 2. Upload to Storage
    await this.storage.upload(file.buffer, path, file.mimetype);

    let thumbnailPath: string = null;

    // 3. Process File (Thumbnail)
    try {
      if (type === 'image') {
        thumbnailPath = await this.imageProcessor.process(file, ownerId);
      } else if (type === 'video') {
        // Await here to ensure thumbnail is ready, or move to background
        thumbnailPath = await this.videoProcessor.process(file, ownerId);
      }
    } catch (e) {
      this.logger.error('Thumbnail generation failed', e);
      // Continue without thumbnail
    }

    const entity = this.repo.create({
      id: fileId,
      ownerId,
      type,
      mimeType: file.mimetype,
      size: file.size,
      path,
      thumbnailPath,
      virusScanStatus: 'clean',
      sharedWith: [],
      isPublic: false,
    });

    return this.repo.save(entity);
  }

  async getFile(id: string, userId: string) {
    const file = await this.repo.findOne({ where: { id } });
    if (!file) throw new NotFoundException();

    // Permission Check
    const isOwner = file.ownerId === userId;
    const isShared = file.sharedWith && file.sharedWith.includes(userId);
    const isPublic = file.isPublic;

    if (!isOwner && !isShared && !isPublic) {
      throw new ForbiddenException('You do not have access to this file');
    }

    return {
      ...file,
      url: this.storage.getPublicUrl(file.path),
      thumbnailUrl: file.thumbnailPath ? this.storage.getPublicUrl(file.thumbnailPath) : null,
    };
  }

  async deleteFile(id: string, userId: string) {
    const file = await this.repo.findOne({ where: { id } });
    if (!file) throw new NotFoundException();

    if (file.ownerId !== userId) {
      throw new ForbiddenException();
    }

    await this.storage.delete(file.path);
    if (file.thumbnailPath) {
      await this.storage.delete(file.thumbnailPath);
    }
    await this.repo.delete(id);

    return { message: 'File deleted successfully' };
  }

  async shareFile(id: string, ownerId: string, targetUserId: string) {
    const file = await this.repo.findOne({ where: { id } });
    if (!file) throw new NotFoundException();
    if (file.ownerId !== ownerId) throw new ForbiddenException();

    if (!file.sharedWith) file.sharedWith = [];
    if (!file.sharedWith.includes(targetUserId)) {
      file.sharedWith.push(targetUserId);
      await this.repo.save(file);
    }
    return file;
  }

  async setPublic(id: string, ownerId: string, isPublic: boolean) {
    const file = await this.repo.findOne({ where: { id } });
    if (!file) throw new NotFoundException();
    if (file.ownerId !== ownerId) throw new ForbiddenException();

    file.isPublic = isPublic;
    return this.repo.save(file);
  }

  async uploadChunk(file: File, uploadId: string, chunkIndex: number) {
    const tempDir = path.join(os.tmpdir(), 'uploads', uploadId);
    await fs.promises.mkdir(tempDir, { recursive: true });

    await fs.promises.writeFile(path.join(tempDir, chunkIndex.toString()), file.buffer);
    return { message: 'Chunk uploaded' };
  }

  async assembleUpload(
    uploadId: string,
    totalChunks: number,
    originalname: string,
    mimetype: string,
    ownerId: string,
  ) {
    const tempDir = path.join(os.tmpdir(), 'uploads', uploadId);

    // Check if all chunks exist
    for (let i = 0; i < totalChunks; i++) {
      if (!fs.existsSync(path.join(tempDir, i.toString()))) {
        throw new BadRequestException(`Missing chunk ${i}`);
      }
    }

    const buffers: Buffer[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const buffer = await fs.promises.readFile(path.join(tempDir, i.toString()));
      buffers.push(buffer);
    }

    const combinedBuffer = Buffer.concat(buffers);

    // Clean up
    await fs.promises.rm(tempDir, { recursive: true, force: true });

    const fakeFile: File = {
      fieldname: 'file',
      originalname,
      encoding: '7bit',
      mimetype,
      buffer: combinedBuffer,
      size: combinedBuffer.length,
      stream: null,
      destination: '',
      filename: originalname,
      path: '',
    };

    return this.upload(fakeFile, ownerId);
  }

  private detectType(mime: string): 'image' | 'video' | 'document' {
    if (mime.startsWith('image')) return 'image';
    if (mime.startsWith('video')) return 'video';
    return 'document';
  }
}
