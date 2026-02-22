import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FileEntity } from './entities/file.entity';
import { FileVersionEntity } from './entities/file-version.entity';
import { FilePermissionEntity } from './entities/file-permission.entity';
import { FileAnalyticsEntity } from './entities/file-analytics.entity';
import { ImageProcessor } from './processors/image.processor';
import { VideoProcessor } from './processors/video.processor';
import { VirusScanService } from './virus-scan.service';
import { StorageProviderFactory } from './storage/storage-provider.factory';
import { StorageProvider } from './storage/storage.interface';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(FileEntity)
    private readonly repo: Repository<FileEntity>,
    @InjectRepository(FileVersionEntity)
    private readonly versionRepo: Repository<FileVersionEntity>,
    @InjectRepository(FilePermissionEntity)
    private readonly permissionRepo: Repository<FilePermissionEntity>,
    @InjectRepository(FileAnalyticsEntity)
    private readonly analyticsRepo: Repository<FileAnalyticsEntity>,
    private readonly imageProcessor: ImageProcessor,
    private readonly videoProcessor: VideoProcessor,
    private readonly virusScanService: VirusScanService,
    private readonly storageFactory: StorageProviderFactory,
    private readonly dataSource: DataSource,
  ) {}

  async upload(file: Express.Multer.File, ownerId: string, provider?: 'aws' | 'gcs' | 'azure') {
    // 1. Virus Scan
    const scanResult = await this.virusScanService.scanBuffer(file.buffer);
    if (scanResult === 'infected') {
      throw new BadRequestException('File is infected with a virus');
    }

    const type = this.detectType(file.mimetype);
    const storage = this.storageFactory.getProvider(provider);
    const fileId = uuid();
    const storagePath = `${ownerId}/${fileId}-${file.originalname}`;

    // 2. Upload to Storage
    const uploadResult = await storage.upload(file.buffer, storagePath, file.mimetype);

    return await this.dataSource.transaction(async (manager) => {
      // 3. Create File Entity
      const entity = manager.create(FileEntity, {
        id: fileId,
        ownerId,
        type,
        mimeType: file.mimetype,
        size: file.size,
        path: uploadResult.path,
        storageProvider: provider || (process.env.DEFAULT_STORAGE_PROVIDER as any) || 'aws',
        virusScanStatus: 'clean',
        isPublic: false,
      });

      const savedFile = await manager.save(entity);

      // 4. Create Initial Version
      const version = manager.create(FileVersionEntity, {
        fileId: savedFile.id,
        versionNumber: 1,
        path: uploadResult.path,
        versionId: uploadResult.versionId,
        size: file.size,
        mimeType: file.mimetype,
      });

      await manager.save(version);

      // 5. Process File (Thumbnail/Optimization in background ideally, but keeping current flow)
      try {
        let thumbnailPath: string = null;
        if (type === 'image') {
          thumbnailPath = await this.imageProcessor.process(file, ownerId);
        } else if (type === 'video') {
          thumbnailPath = await this.videoProcessor.process(file, ownerId);
        }
        if (thumbnailPath) {
          savedFile.thumbnailPath = thumbnailPath;
          await manager.save(savedFile);
        }
      } catch (e) {
        this.logger.error('File processing failed', e);
      }

      await this.logAnalytics(manager, savedFile.id, ownerId, 'UPLOAD');

      return savedFile;
    });
  }

  async getFile(id: string, userId: string, versionNumber?: number) {
    const file = await this.repo.findOne({
      where: { id },
      relations: ['versions']
    });
    if (!file) throw new NotFoundException('File not found');

    await this.checkPermission(id, userId, 'READ', file.ownerId, file.isPublic);

    const storage = this.storageFactory.getProvider(file.storageProvider);
    let targetPath = file.path;
    let versionId = null;

    if (versionNumber) {
      const version = await this.versionRepo.findOne({
        where: { fileId: id, versionNumber },
      });
      if (!version) throw new NotFoundException('Version not found');
      targetPath = version.path;
      versionId = version.versionId;
    }

    await this.logAnalytics(this.analyticsRepo, id, userId, 'VIEW');

    return {
      ...file,
      url: storage.getPublicUrl(targetPath, versionId),
      thumbnailUrl: file.thumbnailPath ? storage.getPublicUrl(file.thumbnailPath) : null,
    };
  }

  async deleteFile(id: string, userId: string) {
    const file = await this.repo.findOne({ where: { id } });
    if (!file) throw new NotFoundException();

    await this.checkPermission(id, userId, 'DELETE', file.ownerId);

    const storage = this.storageFactory.getProvider(file.storageProvider);

    // Delete all versions from cloud storage
    const versions = await this.versionRepo.find({ where: { fileId: id } });
    for (const v of versions) {
      try {
        await storage.delete(v.path, v.versionId);
      } catch (e) {
        this.logger.error(`Failed to delete version ${v.versionNumber} from cloud`, e);
      }
    }

    if (file.thumbnailPath) {
      await storage.delete(file.thumbnailPath);
    }

    await this.repo.delete(id);
    await this.logAnalytics(this.analyticsRepo, id, userId, 'DELETE');

    return { message: 'File and all versions deleted successfully' };
  }

  async shareFile(id: string, requesterId: string, targetUserId: string, permission: 'READ' | 'WRITE' | 'DELETE' | 'SHARE' = 'READ') {
    const file = await this.repo.findOne({ where: { id } });
    if (!file) throw new NotFoundException();

    // Only owner or people with SHARE permission can share
    await this.checkPermission(id, requesterId, 'SHARE', file.ownerId);

    const existingPermission = await this.permissionRepo.findOne({
      where: { fileId: id, userId: targetUserId, permission },
    });

    if (!existingPermission) {
      const newPerm = this.permissionRepo.create({
        fileId: id,
        userId: targetUserId,
        permission,
      });
      await this.permissionRepo.save(newPerm);
    }

    await this.logAnalytics(this.analyticsRepo, id, requesterId, 'SHARE', { sharedWith: targetUserId, permission });

    return { message: `File shared with user ${targetUserId} with ${permission} permission` };
  }

  async getVersionHistory(id: string, userId: string) {
    const file = await this.repo.findOne({ where: { id } });
    if (!file) throw new NotFoundException();

    await this.checkPermission(id, userId, 'READ', file.ownerId, file.isPublic);

    return this.versionRepo.find({
      where: { fileId: id },
      order: { versionNumber: 'DESC' },
    });
  }

  async restoreVersion(id: string, userId: string, versionNumber: number) {
    const file = await this.repo.findOne({ where: { id } });
    if (!file) throw new NotFoundException();

    await this.checkPermission(id, userId, 'WRITE', file.ownerId);

    const version = await this.versionRepo.findOne({
      where: { fileId: id, versionNumber },
    });
    if (!version) throw new NotFoundException('Version not found');

    file.path = version.path;
    file.currentVersion = version.versionNumber;
    await this.repo.save(file);

    await this.logAnalytics(this.analyticsRepo, id, userId, 'UPLOAD', { restoredFrom: versionNumber });

    return file;
  }

  async getAnalytics(id: string, userId: string) {
    const file = await this.repo.findOne({ where: { id } });
    if (!file) throw new NotFoundException();

    await this.checkPermission(id, userId, 'READ', file.ownerId, file.isPublic);

    return this.analyticsRepo.find({
      where: { fileId: id },
      order: { timestamp: 'DESC' },
    });
  }

  private async checkPermission(
    fileId: string,
    userId: string,
    requiredPermission: 'READ' | 'WRITE' | 'DELETE' | 'SHARE',
    ownerId: string,
    isPublic: boolean = false,
  ) {
    if (userId === ownerId) return;
    if (requiredPermission === 'READ' && isPublic) return;

    const hasPermission = await this.permissionRepo.findOne({
      where: { fileId, userId, permission: requiredPermission },
    });

    if (!hasPermission) {
      throw new ForbiddenException(`You do not have ${requiredPermission} access to this file`);
    }
  }

  private async logAnalytics(
    repoOrManager: Repository<FileAnalyticsEntity> | any,
    fileId: string,
    userId: string,
    action: 'VIEW' | 'DOWNLOAD' | 'UPLOAD' | 'DELETE' | 'SHARE',
    metadata?: any,
  ) {
    try {
      const log = repoOrManager.create(FileAnalyticsEntity, {
        fileId,
        userId,
        action,
        metadata,
      });
      await repoOrManager.save(log);
    } catch (e) {
      this.logger.warn('Failed to log analytics', e);
    }
  }

  private detectType(mime: string): 'image' | 'video' | 'document' {
    if (mime.startsWith('image')) return 'image';
    if (mime.startsWith('video')) return 'video';
    return 'document';
  }
}
