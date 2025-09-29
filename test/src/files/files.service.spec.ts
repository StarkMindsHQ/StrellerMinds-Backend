import { Test, TestingModule } from '@nestjs/testing';
import { FilesService } from './files.service';

// Mock dependencies
const mockCloudinaryService = {
  upload: jest.fn().mockResolvedValue({ url: 'https://example.com/file.jpg' }),
  delete: jest.fn().mockResolvedValue(true),
};

const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('FilesService', () => {
  let service: FilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: 'CloudinaryService', useValue: mockCloudinaryService },
        { provide: 'RedisService', useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should upload a file via CloudinaryService', async () => {
    const result = await service.uploadFile('test-file.jpg'); // Replace with actual method name
    expect(mockCloudinaryService.upload).toHaveBeenCalledWith('test-file.jpg');
    expect(result).toEqual({ url: 'https://example.com/file.jpg' });
  });

  it('should delete a file via CloudinaryService', async () => {
    const result = await service.deleteFile('file-id'); // Replace with actual method name
    expect(mockCloudinaryService.delete).toHaveBeenCalledWith('file-id');
    expect(result).toBe(true);
  });

  it('should interact with RedisService correctly', async () => {
    await service.cacheFileMetadata('file-id', { name: 'file.jpg' }); // Replace with actual method
    expect(mockRedisService.set).toHaveBeenCalledWith('file-id', { name: 'file.jpg' });
  });

  it('should get cached file metadata', async () => {
    mockRedisService.get.mockResolvedValue({ name: 'file.jpg' });
    const result = await service.getCachedFile('file-id'); // Replace with actual method
    expect(mockRedisService.get).toHaveBeenCalledWith('file-id');
    expect(result).toEqual({ name: 'file.jpg' });
  });
});
