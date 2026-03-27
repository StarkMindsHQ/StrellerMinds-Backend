import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChunkUploadEntity } from '../entities/chunk-upload.entity';
import { v4 as uuid } from 'uuid';
import { InitChunkUploadDto, ChunkUploadDto, CompleteChunkUploadDto } from '../dto/chunk-upload.dto';
import { StorageProviderFactory } from '../storage/storage-provider.factory';
import { StorageProvider } from '../storage/storage.interface';
import * as crypto from 'crypto';

@Injectable()
export class ChunkUploadService {
  private readonly logger = new Logger(ChunkUploadService.name);
  private readonly uploadSessions = new Map<string, ChunkUploadEntity>();

  constructor(
    @InjectRepository(ChunkUploadEntity)
    private readonly chunkUploadRepo: Repository<ChunkUploadEntity>,
    private readonly storageFactory: StorageProviderFactory,
  ) {}

  async initializeUpload(
    initDto: InitChunkUploadDto,
    userId: string,
  ): Promise<{ uploadId: string; chunkSize: number; totalChunks: number }> {
    const uploadId = uuid();
    const chunkSize = initDto.chunkSize || 5 * 1024 * 1024; // 5MB default
    const totalChunks = Math.ceil(initDto.fileSize / chunkSize);

    // Check if upload already exists for this file hash
    const existingUpload = await this.chunkUploadRepo.findOne({
      where: { fileHash: initDto.fileHash, userId, isCompleted: true },
    });

    if (existingUpload) {
      this.logger.log(`File already uploaded: ${existingUpload.fileId}`);
      throw new BadRequestException('File with this hash has already been uploaded');
    }

    const chunkUpload = this.chunkUploadRepo.create({
      uploadId,
      userId,
      filename: initDto.filename,
      fileSize: initDto.fileSize,
      mimeType: initDto.mimeType,
      fileHash: initDto.fileHash,
      chunkSize,
      totalChunks,
      uploadedChunks: [],
      isCompleted: false,
      storageProvider: initDto.provider || 'aws',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    await this.chunkUploadRepo.save(chunkUpload);
    this.uploadSessions.set(uploadId, chunkUpload);

    return {
      uploadId,
      chunkSize,
      totalChunks,
    };
  }

  async uploadChunk(
    chunkDto: ChunkUploadDto,
    chunkBuffer: Buffer,
    userId: string,
  ): Promise<{ chunkIndex: number; received: boolean }> {
    const uploadSession = await this.getUploadSession(chunkDto.uploadId, userId);
    
    // Validate chunk index
    if (chunkDto.chunkIndex >= uploadSession.totalChunks) {
      throw new BadRequestException(`Invalid chunk index: ${chunkDto.chunkIndex}`);
    }

    // Check if chunk already uploaded
    if (uploadSession.uploadedChunks.includes(chunkDto.chunkIndex)) {
      this.logger.log(`Chunk ${chunkDto.chunkIndex} already uploaded for ${chunkDto.uploadId}`);
      return { chunkIndex: chunkDto.chunkIndex, received: true };
    }

    // Verify chunk hash if provided
    const expectedChunkSize = this.calculateChunkSize(
      chunkDto.chunkIndex,
      uploadSession.chunkSize,
      uploadSession.fileSize,
    );

    if (chunkBuffer.length !== expectedChunkSize) {
      throw new BadRequestException(
        `Chunk size mismatch. Expected: ${expectedChunkSize}, Received: ${chunkBuffer.length}`,
      );
    }

    // Upload chunk to storage
    const storage = this.storageFactory.getProvider(uploadSession.storageProvider as any);
    const chunkPath = `${uploadSession.userId}/chunks/${uploadSession.uploadId}/chunk-${chunkDto.chunkIndex}`;
    
    await storage.upload(chunkBuffer, chunkPath, uploadSession.mimeType);

    // Update upload session
    uploadSession.uploadedChunks.push(chunkDto.chunkIndex);
    uploadSession.uploadedChunks.sort((a, b) => a - b); // Keep sorted
    await this.chunkUploadRepo.save(uploadSession);

    this.logger.log(
      `Chunk ${chunkDto.chunkIndex}/${uploadSession.totalChunks} uploaded for ${chunkDto.uploadId}`,
    );

    return { chunkIndex: chunkDto.chunkIndex, received: true };
  }

  async completeUpload(
    completeDto: CompleteChunkUploadDto,
    userId: string,
  ): Promise<{ fileId: string; url: string }> {
    const uploadSession = await this.getUploadSession(completeDto.uploadId, userId);

    // Verify all chunks are uploaded
    const missingChunks = [];
    for (let i = 0; i < uploadSession.totalChunks; i++) {
      if (!uploadSession.uploadedChunks.includes(i)) {
        missingChunks.push(i);
      }
    }

    if (missingChunks.length > 0) {
      throw new BadRequestException(`Missing chunks: ${missingChunks.join(', ')}`);
    }

    // Combine chunks and create final file
    const storage = this.storageFactory.getProvider(uploadSession.storageProvider as any);
    const finalPath = `${uploadSession.userId}/${uploadSession.uploadId}-${uploadSession.filename}`;

    // Create multipart upload or combine chunks depending on provider
    const combinedResult = await this.combineChunks(uploadSession, storage, finalPath);

    // Mark upload as completed
    uploadSession.isCompleted = true;
    uploadSession.fileId = combinedResult.fileId || uploadSession.uploadId;
    uploadSession.storagePath = finalPath;
    await this.chunkUploadRepo.save(uploadSession);

    // Clean up chunks
    await this.cleanupChunks(uploadSession, storage);

    // Remove from memory
    this.uploadSessions.delete(completeDto.uploadId);

    this.logger.log(`Upload completed: ${completeDto.uploadId} -> ${uploadSession.fileId}`);

    return {
      fileId: uploadSession.fileId,
      url: storage.getPublicUrl(finalPath),
    };
  }

  async getUploadStatus(uploadId: string, userId: string): Promise<{
    uploadId: string;
    filename: string;
    totalChunks: number;
    uploadedChunks: number[];
    progress: number;
    isCompleted: boolean;
  }> {
    const uploadSession = await this.getUploadSession(uploadId, userId);
    
    return {
      uploadId: uploadSession.uploadId,
      filename: uploadSession.filename,
      totalChunks: uploadSession.totalChunks,
      uploadedChunks: uploadSession.uploadedChunks,
      progress: (uploadSession.uploadedChunks.length / uploadSession.totalChunks) * 100,
      isCompleted: uploadSession.isCompleted,
    };
  }

  async abortUpload(uploadId: string, userId: string): Promise<void> {
    const uploadSession = await this.getUploadSession(uploadId, userId);
    
    // Clean up chunks
    const storage = this.storageFactory.getProvider(uploadSession.storageProvider as any);
    await this.cleanupChunks(uploadSession, storage);

    // Delete upload session
    await this.chunkUploadRepo.delete({ uploadId });
    this.uploadSessions.delete(uploadId);

    this.logger.log(`Upload aborted: ${uploadId}`);
  }

  private async getUploadSession(uploadId: string, userId: string): Promise<ChunkUploadEntity> {
    // Check memory first
    let uploadSession = this.uploadSessions.get(uploadId);
    
    if (!uploadSession) {
      // Load from database
      uploadSession = await this.chunkUploadRepo.findOne({
        where: { uploadId, userId },
      });
      
      if (!uploadSession) {
        throw new NotFoundException(`Upload session not found: ${uploadId}`);
      }

      // Check if expired
      if (uploadSession.expiresAt < new Date()) {
        await this.chunkUploadRepo.delete({ uploadId });
        throw new BadRequestException(`Upload session expired: ${uploadId}`);
      }

      this.uploadSessions.set(uploadId, uploadSession);
    }

    return uploadSession;
  }

  private calculateChunkSize(chunkIndex: number, chunkSize: number, totalFileSize: number): number {
    const startByte = chunkIndex * chunkSize;
    const endByte = Math.min(startByte + chunkSize, totalFileSize);
    return endByte - startByte;
  }

  private async combineChunks(
    uploadSession: ChunkUploadEntity,
    storage: StorageProvider,
    finalPath: string,
  ): Promise<{ fileId: string }> {
    // This implementation depends on the storage provider
    // For AWS S3, we can use multipart upload
    // For other providers, we might need to download and re-upload
    
    const chunkPaths = [];
    for (let i = 0; i < uploadSession.totalChunks; i++) {
      chunkPaths.push(`${uploadSession.userId}/chunks/${uploadSession.uploadId}/chunk-${i}`);
    }

    // Use storage provider's combine method if available
    if ('combineChunks' in storage && typeof storage.combineChunks === 'function') {
      return await (storage as any).combineChunks(chunkPaths, finalPath, uploadSession.mimeType);
    }

    // Fallback: download chunks, combine, and re-upload
    const chunks = [];
    for (const chunkPath of chunkPaths) {
      const chunkBuffer = await storage.download(chunkPath);
      chunks.push(chunkBuffer);
    }

    const combinedBuffer = Buffer.concat(chunks);
    const uploadResult = await storage.upload(combinedBuffer, finalPath, uploadSession.mimeType);
    
    return { fileId: uploadResult.versionId || uploadSession.uploadId };
  }

  private async cleanupChunks(uploadSession: ChunkUploadEntity, storage: StorageProvider): Promise<void> {
    const chunkPaths = [];
    for (let i = 0; i < uploadSession.totalChunks; i++) {
      chunkPaths.push(`${uploadSession.userId}/chunks/${uploadSession.uploadId}/chunk-${i}`);
    }

    for (const chunkPath of chunkPaths) {
      try {
        await storage.delete(chunkPath);
      } catch (error) {
        this.logger.warn(`Failed to delete chunk: ${chunkPath}`, error);
      }
    }
  }

  // Cleanup expired upload sessions
  async cleanupExpiredSessions(): Promise<void> {
    const expiredSessions = await this.chunkUploadRepo.find({
      where: {
        isCompleted: false,
        expiresAt: { $lt: new Date() } as any,
      },
    });

    for (const session of expiredSessions) {
      try {
        const storage = this.storageFactory.getProvider(session.storageProvider as any);
        await this.cleanupChunks(session, storage);
        await this.chunkUploadRepo.delete({ uploadId: session.uploadId });
        this.uploadSessions.delete(session.uploadId);
      } catch (error) {
        this.logger.error(`Failed to cleanup expired session: ${session.uploadId}`, error);
      }
    }
  }
}
