import { Test, TestingModule } from '@nestjs/testing';
import { VideoService } from './video.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Video } from './entities/video.entity';
import { Chapter } from './entities/chapter.entity';
import { Quiz } from './entities/quiz.entity';
import { VideoAnalytics } from './entities/video-analytics.entity';
import { TranscodingService } from './transcoding.service';
import { FilesService } from '../files/files.service';
import { VideoStatus } from './entities/video.entity';

// Mock third-party libraries to avoid ESM/transpilation issues
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-v4',
}));

jest.mock('fluent-ffmpeg', () => {
  return function() {
    return {
      outputOptions: jest.fn().mockReturnThis(),
      output: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      run: jest.fn(),
      setFfmpegPath: jest.fn(),
    };
  };
});



const mockVideoRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockChapterRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockQuizRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockAnalyticsRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockTranscodingService = {
  transcodeToHls: jest.fn(),
};

const mockFilesService = {
  // mocks if needed
};

describe('VideoService', () => {
  let service: VideoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoService,
        { provide: getRepositoryToken(Video), useValue: mockVideoRepo },
        { provide: getRepositoryToken(Chapter), useValue: mockChapterRepo },
        { provide: getRepositoryToken(Quiz), useValue: mockQuizRepo },
        { provide: getRepositoryToken(VideoAnalytics), useValue: mockAnalyticsRepo },
        { provide: TranscodingService, useValue: mockTranscodingService },
        { provide: FilesService, useValue: mockFilesService },
      ],
    }).compile();

    service = module.get<VideoService>(VideoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a video', async () => {
    const file = { originalname: 'test.mp4', buffer: Buffer.from('') } as any;
    const ownerId = 'user-1';
    mockVideoRepo.create.mockReturnValue({ id: 'vid-1', status: VideoStatus.PENDING });
    mockVideoRepo.save.mockResolvedValue({ id: 'vid-1', status: VideoStatus.PENDING });

    // mock background transcode
    mockTranscodingService.transcodeToHls.mockResolvedValue('path/to/manifest.m3u8');
    mockVideoRepo.update.mockResolvedValue({});

    const result = await service.create(file, ownerId, 'Test Video');
    expect(result).toEqual({ id: 'vid-1', status: VideoStatus.PENDING });
    expect(mockVideoRepo.create).toHaveBeenCalled();
  });
});
