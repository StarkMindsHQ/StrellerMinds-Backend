import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoStreamingService } from './services/video-streaming.service';
import { Video, VideoStatus, VideoVisibility } from './entities/video.entity';
import { VideoQuality } from './entities/video-quality.entity';
import { User } from '../users/entities/user.entity';
import { AwsCloudFrontService } from './services/aws-cloudfront.service';
import { VideoProcessingService } from './services/video-processing.service';
import { VideoSecurityService } from './services/video-security.service';
import { VideoAnalyticsService } from './services/video-analytics.service';
import { CreateVideoDto } from './dto/create-video.dto';

describe('VideoStreamingService', () => {
  let service: VideoStreamingService;
  let videoRepository: Repository<Video>;
  let qualityRepository: Repository<VideoQuality>;
  let userRepository: Repository<User>;
  let cloudFrontService: AwsCloudFrontService;
  let processingService: VideoProcessingService;
  let securityService: VideoSecurityService;
  let analyticsService: VideoAnalyticsService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    isActive: true,
  } as User;

  const mockVideo: Video = {
    id: 'video-123',
    title: 'Test Video',
    description: 'Test Description',
    originalFilename: 'test.mp4',
    status: VideoStatus.READY,
    visibility: VideoVisibility.PRIVATE,
    duration: 120,
    fileSize: 1024000,
    width: 1920,
    height: 1080,
    frameRate: 30,
    bitrate: 5000,
    codec: 'h264',
    audioCodec: 'aac',
    streamingUrl: 'https://cdn.example.com/video-123.mp4',
    thumbnailUrl: 'https://cdn.example.com/video-123-thumb.jpg',
    s3Key: 'videos/video-123/original.mp4',
    s3Bucket: 'test-bucket',
    cdnDomain: 'cdn.example.com',
    viewCount: 0,
    uploadedBy: mockUser,
    qualityVariants: [],
    analytics: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Video;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoStreamingService,
        {
          provide: getRepositoryToken(Video),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VideoQuality),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: AwsCloudFrontService,
          useValue: {
            generateVideoKey: jest.fn(),
            uploadVideo: jest.fn(),
            deleteVideo: jest.fn(),
            generateSignedUrl: jest.fn(),
          },
        },
        {
          provide: VideoProcessingService,
          useValue: {
            queueVideoProcessing: jest.fn(),
          },
        },
        {
          provide: VideoSecurityService,
          useValue: {
            validateVideoAccess: jest.fn(),
            generateDRMConfig: jest.fn(),
          },
        },
        {
          provide: VideoAnalyticsService,
          useValue: {
            getEngagementMetrics: jest.fn(),
            getPerformanceMetrics: jest.fn(),
            getGeographicMetrics: jest.fn(),
            getDeviceMetrics: jest.fn(),
            getQualityMetrics: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VideoStreamingService>(VideoStreamingService);
    videoRepository = module.get<Repository<Video>>(getRepositoryToken(Video));
    qualityRepository = module.get<Repository<VideoQuality>>(getRepositoryToken(VideoQuality));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    cloudFrontService = module.get<AwsCloudFrontService>(AwsCloudFrontService);
    processingService = module.get<VideoProcessingService>(VideoProcessingService);
    securityService = module.get<VideoSecurityService>(VideoSecurityService);
    analyticsService = module.get<VideoAnalyticsService>(VideoAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVideo', () => {
    it('should create a new video successfully', async () => {
      const createVideoDto: CreateVideoDto = {
        title: 'Test Video',
        description: 'Test Description',
        originalFilename: 'test.mp4',
        visibility: VideoVisibility.PRIVATE,
      };

      jest.spyOn(videoRepository, 'create').mockReturnValue(mockVideo);
      jest.spyOn(videoRepository, 'save').mockResolvedValue(mockVideo);
      jest
        .spyOn(cloudFrontService, 'generateVideoKey')
        .mockReturnValue('videos/video-123/original.mp4');

      const result = await service.createVideo(createVideoDto, mockUser);

      expect(result.video).toBeDefined();
      expect(result.video.title).toBe(createVideoDto.title);
      expect(result.uploadUrl).toContain('s3.amazonaws.com');
      expect(videoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: createVideoDto.title,
          uploadedBy: mockUser,
          status: VideoStatus.UPLOADING,
        }),
      );
    });
  });

  describe('uploadVideoFile', () => {
    it('should upload video file successfully', async () => {
      const mockFile = {
        buffer: Buffer.from('test video content'),
        mimetype: 'video/mp4',
        originalname: 'test.mp4',
      } as Express.Multer.File;

      const uploadResult = {
        key: 'videos/video-123/original.mp4',
        url: 'https://s3.amazonaws.com/bucket/videos/video-123/original.mp4',
        cdnUrl: 'https://cdn.example.com/videos/video-123/original.mp4',
        etag: 'abc123',
        size: 1024000,
      };

      jest.spyOn(service, 'findVideoById').mockResolvedValue({
        ...mockVideo,
        status: VideoStatus.UPLOADING,
      });
      jest
        .spyOn(cloudFrontService, 'generateVideoKey')
        .mockReturnValue('videos/video-123/original.mp4');
      jest.spyOn(cloudFrontService, 'uploadVideo').mockResolvedValue(uploadResult);
      jest.spyOn(processingService, 'queueVideoProcessing').mockResolvedValue();

      await service.uploadVideoFile('video-123', mockFile);

      expect(cloudFrontService.uploadVideo).toHaveBeenCalledWith(
        mockFile.buffer,
        'videos/video-123/original.mp4',
        mockFile.mimetype,
        expect.any(Object),
      );
      expect(processingService.queueVideoProcessing).toHaveBeenCalled();
    });
  });

  describe('getVideoStreamingInfo', () => {
    it('should return streaming info for authorized user', async () => {
      const accessResult = {
        allowed: true,
        accessToken: 'test-token',
        streamingUrl: 'https://cdn.example.com/video-123.mp4',
      };

      jest.spyOn(service, 'findVideoById').mockResolvedValue(mockVideo);
      jest.spyOn(securityService, 'validateVideoAccess').mockResolvedValue(accessResult);
      jest.spyOn(securityService, 'generateDRMConfig').mockResolvedValue(null);

      const result = await service.getVideoStreamingInfo('video-123', 'user-123');

      expect(result.video).toBeDefined();
      expect(result.streamingUrls.primary).toBe(accessResult.streamingUrl);
      expect(result.security.accessToken).toBe(accessResult.accessToken);
      expect(result.analytics.sessionId).toBeDefined();
    });

    it('should throw error for unauthorized access', async () => {
      const accessResult = {
        allowed: false,
        reason: 'Access denied',
      };

      jest.spyOn(service, 'findVideoById').mockResolvedValue(mockVideo);
      jest.spyOn(securityService, 'validateVideoAccess').mockResolvedValue(accessResult);

      await expect(service.getVideoStreamingInfo('video-123', 'user-456')).rejects.toThrow(
        'Access denied',
      );
    });
  });

  describe('getVideoAnalytics', () => {
    it('should return analytics for video owner', async () => {
      const mockAnalytics = {
        engagement: { totalViews: 100, uniqueViewers: 80 },
        performance: { averageLoadTime: 2.5, errorRate: 0.1 },
        geographic: { viewsByCountry: { US: 50, UK: 30 } },
        device: { deviceTypes: { desktop: 60, mobile: 40 } },
        quality: { qualityDistribution: { '720p': 70, '480p': 30 } },
      };

      jest.spyOn(service, 'findVideoById').mockResolvedValue(mockVideo);
      jest
        .spyOn(analyticsService, 'getEngagementMetrics')
        .mockResolvedValue(mockAnalytics.engagement as any);
      jest
        .spyOn(analyticsService, 'getPerformanceMetrics')
        .mockResolvedValue(mockAnalytics.performance as any);
      jest
        .spyOn(analyticsService, 'getGeographicMetrics')
        .mockResolvedValue(mockAnalytics.geographic as any);
      jest
        .spyOn(analyticsService, 'getDeviceMetrics')
        .mockResolvedValue(mockAnalytics.device as any);
      jest
        .spyOn(analyticsService, 'getQualityMetrics')
        .mockResolvedValue(mockAnalytics.quality as any);

      const result = await service.getVideoAnalytics('video-123', 'user-123');

      expect(result.video.id).toBe('video-123');
      expect(result.engagement).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.geographic).toBeDefined();
      expect(result.device).toBeDefined();
      expect(result.quality).toBeDefined();
    });

    it('should throw error for non-owner', async () => {
      jest.spyOn(service, 'findVideoById').mockResolvedValue(mockVideo);

      await expect(service.getVideoAnalytics('video-123', 'user-456')).rejects.toThrow(
        'You do not have permission to view analytics for this video',
      );
    });
  });

  describe('deleteVideo', () => {
    it('should delete video and associated files', async () => {
      const videoWithQualities = {
        ...mockVideo,
        qualityVariants: [
          {
            id: 'quality-1',
            s3Key: 'videos/video-123/720p.mp4',
            quality: '720p',
          },
        ],
      };

      jest.spyOn(service, 'findVideoById').mockResolvedValue(videoWithQualities as any);
      jest.spyOn(cloudFrontService, 'deleteVideo').mockResolvedValue();
      jest.spyOn(videoRepository, 'remove').mockResolvedValue(videoWithQualities as any);

      await service.deleteVideo('video-123', 'user-123');

      expect(cloudFrontService.deleteVideo).toHaveBeenCalledWith(mockVideo.s3Key);
      expect(cloudFrontService.deleteVideo).toHaveBeenCalledWith('videos/video-123/720p.mp4');
      expect(videoRepository.remove).toHaveBeenCalledWith(videoWithQualities);
    });
  });
});
