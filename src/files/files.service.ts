import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from './entities/file.entity';
import { ImageProcessor } from './processors/image.processor';
import { VideoProcessor } from './processors/video.processor';
import { StorageProvider } from './storage/storage.interface';
import { v4 as uuid } from 'uuid';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly repo: Repository<FileEntity>,
    private readonly imageProcessor: ImageProcessor,
    private readonly videoProcessor: VideoProcessor,
    @Inject('StorageProvider')
    private readonly storage: StorageProvider,
  ) {}

  async upload(file: Express.Multer.File, ownerId: string) {
    const type = this.detectType(file.mimetype);
    const fileId = uuid();
    const path = `${ownerId}/${fileId}-${file.originalname}`;

    await this.storage.upload(file.buffer, path, file.mimetype);

    let thumbnailPath: string = null;

    if (type === 'image') {
      thumbnailPath = await this.imageProcessor.process(file, ownerId);
    }

    if (type === 'video') {
      await this.videoProcessor.queueTranscoding(path);
    }

    const entity = this.repo.create({
      id: fileId,
      ownerId,
      type,
      mimeType: file.mimetype,
      size: file.size,
      path,
      thumbnailPath,
    });

    return this.repo.save(entity);
  }

  async getFile(id: string, userId: string) {
    const file = await this.repo.findOne({ where: { id } });
    if (!file) throw new NotFoundException();

    if (file.ownerId !== userId) {
      throw new ForbiddenException();
    }

    return {
      ...file,
      url: this.storage.getPublicUrl(file.path),
      thumbnailUrl: file.thumbnailPath
        ? this.storage.getPublicUrl(file.thumbnailPath)
        : null,
    };
  }

  async deleteFile(id: string, userId: string) {
    const file = await this.repo.findOne({ where: { id } });
    if (!file) throw new NotFoundException();

    if (file.ownerId !== userId) {
      throw new ForbiddenException();
    }

    await this.storage.delete(file.path);
    await this.repo.delete(id);

    return { message: 'File deleted successfully' };
  }

  private detectType(mime: string): 'image' | 'video' | 'document' {
    if (mime.startsWith('image')) return 'image';
    if (mime.startsWith('video')) return 'video';
    return 'document';
  }
}
 