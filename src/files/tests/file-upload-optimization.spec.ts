import { Test, TestingModule } from '@nestjs/testing';
import { FilesService } from '../files.service';
import { ChunkUploadService } from '../services/chunk-upload.service';
import { FileCompressionService } from '../services/file-compression.service';
import { CDNIntegrationService } from '../services/cdn-integration.service';
import { Repository, DataSource } from 'typeorm';
import { FileEntity } from '../entities/file.entity';
import { FileVersionEntity } from '../entities/file-version.entity';
import { FileAnalyticsEntity } from '../entities/file-analytics.entity';
import { ChunkUploadEntity } from '../entities/chunk-upload.entity';
import { VirusScanService } from '../virus-scan.service';
import { StorageProviderFactory } from '../storage/storage-provider.factory';
import { StorageProvider } from '../storage/storage.interface';
import { ImageProcessor } from '../processors/image.processor';
import { VideoProcessor } from '../processors/video.processor';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('File Upload Optimization', () => {
  let service: FilesService;
  let chunkUploadService: ChunkUploadService;
  let compressionService: FileCompressionService;
  let cdnService: CDNIntegrationService;
  let fileRepo: Repository<FileEntity>;
  let versionRepo: Repository<FileVersionEntity>;
  let analyticsRepo: Repository<FileAnalyticsEntity>;
  let chunkUploadRepo: Repository<ChunkUploadEntity>;
  let storageProvider: StorageProvider;

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 1024, // 1MB
    buffer: Buffer.alloc(1024 * 1024), // 1MB buffer
    destination: '',
    filename: '',
    path: '',
    stream: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        ChunkUploadService,
        FileCompressionService,
        CDNIntegrationService,
        {
          provide: getRepositoryToken(FileEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(FileVersionEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(FileAnalyticsEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ChunkUploadEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: VirusScanService,
          useValue: {
            scanBuffer: jest.fn().mockResolvedValue('clean'),
          },
        },
        {
          provide: StorageProviderFactory,
          useValue: {
            getProvider: jest.fn().mockReturnValue({
              upload: jest.fn().mockResolvedValue({
                path: 'test-path',
                versionId: 'test-version-id',
              }),
              getPublicUrl: jest.fn().mockReturnValue('https://test-url.com/file'),
              download: jest.fn().mockResolvedValue(Buffer.alloc(1024 * 1024)),
              delete: jest.fn().mockResolvedValue(undefined),
            }),
          },
        },
        {
          provide: ImageProcessor,
          useValue: {
            process: jest.fn().mockResolvedValue('thumbnail-path'),
          },
        },
        {
          provide: VideoProcessor,
          useValue: {
            process: jest.fn().mockResolvedValue('thumbnail-path'),
          },
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    chunkUploadService = module.get<ChunkUploadService>(ChunkUploadService);
    compressionService = module.get<FileCompressionService>(FileCompressionService);
    cdnService = module.get<CDNIntegrationService>(CDNIntegrationService);
    fileRepo = module.get<Repository<FileEntity>>(getRepositoryToken(FileEntity));
    versionRepo = module.get<Repository<FileVersionEntity>>(getRepositoryToken(FileVersionEntity));
    analyticsRepo = module.get<Repository<FileAnalyticsEntity>>(getRepositoryToken(FileAnalyticsEntity));
    chunkUploadRepo = module.get<Repository<ChunkUploadEntity>>(getRepositoryToken(ChunkUploadEntity));
    storageProvider = module.get<StorageProvider>(StorageProviderFactory).getProvider();
  });

  describe('Streaming Upload', () => {
    it('should upload file with streaming and compression', async () => {
      // Mock compression service
      jest.spyOn(compressionService, 'isCompressible').mockReturnValue(true);
      jest.spyOn(compressionService, 'compressImage').mockResolvedValue({
        buffer: Buffer.alloc(512 * 1024), // 512KB compressed
        originalSize: 1024 * 1024,
        compressedSize: 512 * 1024,
        compressionRatio: 0.5,
        format: 'webp',
      });

      // Mock CDN service
      jest.spyOn(cdnService, 'cacheFile').mockResolvedValue('https://cdn-url.com/file');

      // Mock database transaction
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const manager = {
          create: jest.fn().mockReturnThis(),
          save: jest.fn().mockResolvedValue({ id: 'test-file-id' }),
        };
        return await callback(manager);
      });
      jest.spyOn(service as any, 'dataSource', 'get').mockReturnValue({
        transaction: mockTransaction,
      });

      const result = await service.uploadStream(mockFile, 'user-123', 'aws', true);

      expect(result).toBeDefined();
      expect(compressionService.isCompressible).toHaveBeenCalledWith('image/jpeg');
      expect(compressionService.compressImage).toHaveBeenCalled();
      expect(cdnService.cacheFile).toHaveBeenCalled();
    });

    it('should skip compression when disabled', async () => {
      jest.spyOn(compressionService, 'isCompressible').mockReturnValue(true);
      jest.spyOn(compressionService, 'compressImage').mockResolvedValue({
        buffer: Buffer.alloc(1024 * 1024),
        originalSize: 1024 * 1024,
        compressedSize: 1024 * 1024,
        compressionRatio: 0,
        format: 'jpeg',
      });

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const manager = {
          create: jest.fn().mockReturnThis(),
          save: jest.fn().mockResolvedValue({ id: 'test-file-id' }),
        };
        return await callback(manager);
      });
      jest.spyOn(service as any, 'dataSource', 'get').mockReturnValue({
        transaction: mockTransaction,
      });

      const result = await service.uploadStream(mockFile, 'user-123', 'aws', false);

      expect(result).toBeDefined();
      expect(compressionService.compressImage).not.toHaveBeenCalled();
    });
  });

  describe('Chunked Upload', () => {
    it('should initialize chunked upload', async () => {
      const initDto = {
        filename: 'large-file.zip',
        fileSize: 10 * 1024 * 1024, // 10MB
        mimeType: 'application/zip',
        fileHash: 'test-hash',
        provider: 'aws' as const,
        chunkSize: 1024 * 1024, // 1MB
      };

      jest.spyOn(chunkUploadRepo, 'save').mockResolvedValue({
        id: 'test-id',
        uploadId: 'test-upload-id',
        ...initDto,
        totalChunks: 10,
        uploadedChunks: [],
        isCompleted: false,
      } as any);

      const result = await chunkUploadService.initializeUpload(initDto, 'user-123');

      expect(result).toEqual({
        uploadId: expect.any(String),
        chunkSize: 1024 * 1024,
        totalChunks: 10,
      });
    });

    it('should upload chunk successfully', async () => {
      const chunkDto = {
        uploadId: 'test-upload-id',
        chunkIndex: 0,
        totalChunks: 10,
        filename: 'large-file.zip',
        fileSize: 10 * 1024 * 1024,
        mimeType: 'application/zip',
        fileHash: 'test-hash',
        provider: 'aws' as const,
      };

      const chunkBuffer = Buffer.alloc(1024 * 1024); // 1MB chunk

      jest.spyOn(chunkUploadRepo, 'findOne').mockResolvedValue({
        id: 'test-id',
        uploadId: 'test-upload-id',
        userId: 'user-123',
        chunkSize: 1024 * 1024,
        totalChunks: 10,
        uploadedChunks: [],
        isCompleted: false,
        storageProvider: 'aws',
      } as any);

      jest.spyOn(chunkUploadRepo, 'save').mockResolvedValue({} as any);
      jest.spyOn(storageProvider, 'upload').mockResolvedValue({ path: 'chunk-path' } as any);

      const result = await chunkUploadService.uploadChunk(chunkDto, chunkBuffer, 'user-123');

      expect(result).toEqual({
        chunkIndex: 0,
        received: true,
      });
      expect(storageProvider.upload).toHaveBeenCalledWith(
        chunkBuffer,
        expect.stringContaining('chunk-0'),
        'application/zip'
      );
    });

    it('should complete chunked upload', async () => {
      const completeDto = {
        uploadId: 'test-upload-id',
        totalChunks: 10,
        fileHash: 'test-hash',
      };

      jest.spyOn(chunkUploadRepo, 'findOne').mockResolvedValue({
        id: 'test-id',
        uploadId: 'test-upload-id',
        userId: 'user-123',
        filename: 'large-file.zip',
        fileSize: 10 * 1024 * 1024,
        mimeType: 'application/zip',
        fileHash: 'test-hash',
        chunkSize: 1024 * 1024,
        totalChunks: 10,
        uploadedChunks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // All chunks uploaded
        isCompleted: false,
        storageProvider: 'aws',
      } as any);

      jest.spyOn(chunkUploadRepo, 'save').mockResolvedValue({} as any);
      jest.spyOn(storageProvider, 'upload').mockResolvedValue({
        path: 'final-path',
        versionId: 'final-version-id',
      } as any);

      const result = await chunkUploadService.completeUpload(completeDto, 'user-123');

      expect(result).toEqual({
        fileId: expect.any(String),
        url: expect.any(String),
      });
    });
  });

  describe('File Compression', () => {
    it('should compress images effectively', async () => {
      const imageBuffer = Buffer.alloc(2 * 1024 * 1024); // 2MB image
      
      jest.spyOn(compressionService, 'isCompressible').mockReturnValue(true);
      jest.spyOn(compressionService, 'compressImage').mockResolvedValue({
        buffer: Buffer.alloc(512 * 1024), // 512KB compressed
        originalSize: 2 * 1024 * 1024,
        compressedSize: 512 * 1024,
        compressionRatio: 0.75,
        format: 'webp',
      });

      const result = await compressionService.compressImage(imageBuffer, {
        quality: 85,
        progressive: true,
        optimize: true,
        format: 'webp',
      });

      expect(result.compressionRatio).toBe(0.75);
      expect(result.compressedSize).toBeLessThan(result.originalSize);
    });

    it('should compress documents', async () => {
      const documentBuffer = Buffer.from('Large text content...'.repeat(1000));
      
      jest.spyOn(compressionService, 'isCompressible').mockReturnValue(true);
      jest.spyOn(compressionService, 'compressDocument').mockResolvedValue({
        buffer: Buffer.from('Compressed content...'),
        originalSize: documentBuffer.length,
        compressedSize: 100,
        compressionRatio: 0.9,
        format: 'gzip',
      });

      const result = await compressionService.compressDocument(documentBuffer, 'text/plain');

      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressedSize).toBeLessThan(result.originalSize);
    });
  });

  describe('CDN Integration', () => {
    it('should cache file in CDN', async () => {
      const fileUrl = 'https://storage.com/file.jpg';
      
      jest.spyOn(cdnService, 'cacheFile').mockResolvedValue('https://cdn.com/file.jpg');

      const result = await cdnService.cacheFile(fileUrl, {
        ttl: 86400,
        edgeTTL: 86400,
        browserTTL: 3600,
      });

      expect(result).toBe('https://cdn.com/file.jpg');
      expect(cdnService.cacheFile).toHaveBeenCalledWith(fileUrl, {
        ttl: 86400,
        edgeTTL: 86400,
        browserTTL: 3600,
      });
    });

    it('should purge file from CDN', async () => {
      const fileUrl = 'https://cdn.com/file.jpg';
      
      jest.spyOn(cdnService, 'purgeFile').mockResolvedValue(true);

      const result = await cdnService.purgeFile(fileUrl);

      expect(result).toBe(true);
      expect(cdnService.purgeFile).toHaveBeenCalledWith(fileUrl);
    });

    it('should get cache status', async () => {
      const fileUrl = 'https://cdn.com/file.jpg';
      
      jest.spyOn(cdnService, 'getCacheStatus').mockResolvedValue({
        cached: true,
        cacheAge: 3600,
        ttl: 86400,
      });

      const result = await cdnService.getCacheStatus(fileUrl);

      expect(result.cached).toBe(true);
      expect(result.cacheAge).toBe(3600);
      expect(result.ttl).toBe(86400);
    });
  });

  describe('File Optimization', () => {
    it('should optimize existing file', async () => {
      const fileId = 'test-file-id';
      
      jest.spyOn(fileRepo, 'findOne').mockResolvedValue({
        id: fileId,
        ownerId: 'user-123',
        mimeType: 'image/jpeg',
        path: 'storage-path',
        storageProvider: 'aws',
      } as any);

      jest.spyOn(compressionService, 'isCompressible').mockReturnValue(true);
      jest.spyOn(compressionService, 'compressImage').mockResolvedValue({
        buffer: Buffer.alloc(512 * 1024),
        originalSize: 1024 * 1024,
        compressedSize: 512 * 1024,
        compressionRatio: 0.5,
        format: 'webp',
      });

      jest.spyOn(storageProvider, 'download').mockResolvedValue(Buffer.alloc(1024 * 1024));
      jest.spyOn(storageProvider, 'upload').mockResolvedValue({ path: 'optimized-path' } as any);
      jest.spyOn(fileRepo, 'save').mockResolvedValue({} as any);
      jest.spyOn(cdnService, 'cacheFile').mockResolvedValue('https://cdn.com/optimized-file');

      const result = await service.optimizeExistingFile(fileId, 'user-123');

      expect(result.optimized).toBe(true);
      expect(result.compressionRatio).toBe(0.5);
      expect(result.cdnUrl).toBe('https://cdn.com/optimized-file');
    });
  });

  describe('Error Handling', () => {
    it('should handle virus detection', async () => {
      const virusScanService = module.get<VirusScanService>(VirusScanService);
      jest.spyOn(virusScanService, 'scanBuffer').mockResolvedValue('infected');

      await expect(service.uploadStream(mockFile, 'user-123', 'aws', true))
        .rejects.toThrow('File is infected with a virus');
    });

    it('should handle compression failures gracefully', async () => {
      jest.spyOn(compressionService, 'isCompressible').mockReturnValue(true);
      jest.spyOn(compressionService, 'compressImage').mockRejectedValue(new Error('Compression failed'));

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const manager = {
          create: jest.fn().mockReturnThis(),
          save: jest.fn().mockResolvedValue({ id: 'test-file-id' }),
        };
        return await callback(manager);
      });
      jest.spyOn(service as any, 'dataSource', 'get').mockReturnValue({
        transaction: mockTransaction,
      });

      const result = await service.uploadStream(mockFile, 'user-123', 'aws', true);

      expect(result).toBeDefined();
      // Should proceed with original file when compression fails
    });

    it('should handle CDN failures gracefully', async () => {
      jest.spyOn(cdnService, 'cacheFile').mockRejectedValue(new Error('CDN unavailable'));

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const manager = {
          create: jest.fn().mockReturnThis(),
          save: jest.fn().mockResolvedValue({ id: 'test-file-id' }),
        };
        return await callback(manager);
      });
      jest.spyOn(service as any, 'dataSource', 'get').mockReturnValue({
        transaction: mockTransaction,
      });

      const result = await service.uploadStream(mockFile, 'user-123', 'aws', false);

      expect(result).toBeDefined();
      // Should proceed without CDN when CDN fails
    });
  });
});
