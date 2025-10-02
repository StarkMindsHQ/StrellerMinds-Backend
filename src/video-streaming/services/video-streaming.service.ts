import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Video, VideoStatus, VideoVisibility } from '../entities/video.entity';
import { VideoQuality } from '../entities/video-quality.entity';
import { User } from '../../users/entities/user.entity';
import { CreateVideoDto } from '../dto/create-video.dto';
import { AwsCloudFrontService } from './aws-cloudfront.service';
import { VideoProcessingService } from './video-processing.service';
import { VideoSecurityService } from './video-security.service';
import { VideoAnalyticsService } from './video-analytics.service';
import { UploadedFileLike } from '../../common/types/uploaded-file-like';

export interface VideoUploadResult {
  video: Video;
  uploadUrl?: string;
  uploadFields?: Record<string, string>;
}

export interface VideoStreamingInfo {
  video: Video;
  streamingUrls: {
    primary: string;
    hls?: string;
    dash?: string;
    qualities: Array<{
      quality: string;
      url: string;
      width: number;
      height: number;
      bitrate: number;
    }>;
  };
  security: {
    accessToken: string;
    expiresAt: number;
    drmConfig?: any;
  };
  analytics: {
    sessionId: string;
    trackingUrl: string;
  };
}

@Injectable()
export class VideoStreamingService {
  private readonly logger = new Logger(VideoStreamingService.name);

  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(VideoQuality)
    private readonly qualityRepository: Repository<VideoQuality>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cloudFrontService: AwsCloudFrontService,
    private readonly processingService: VideoProcessingService,
    private readonly securityService: VideoSecurityService,
    private readonly analyticsService: VideoAnalyticsService,
  ) {}

  async createVideo(createVideoDto: CreateVideoDto, uploadedBy: User): Promise<VideoUploadResult> {
    try {
      this.logger.debug(`Creating video: ${createVideoDto.title}`);

      // Create video entity
      const video = this.videoRepository.create({
        ...createVideoDto,
        uploadedBy,
        status: VideoStatus.UPLOADING,
        visibility: createVideoDto.visibility || VideoVisibility.PRIVATE,
        metadata: {
          originalFormat: this.extractFileExtension(createVideoDto.originalFilename),
          uploadMethod: 'direct',
          tags: createVideoDto.tags || [],
          chapters: createVideoDto.chapters || [],
          customData: createVideoDto.customData || {},
        },
        securitySettings: {
          requireAuth: true,
          allowedDomains: [],
          geoRestrictions: {},
          drmEnabled: false,
          signedUrlExpiry: 3600,
          downloadEnabled: false,
          embedEnabled: false,
          ...createVideoDto.securitySettings,
        },
        processingSettings: {
          generateThumbnails: true,
          thumbnailCount: 5,
          generatePreview: true,
          adaptiveStreaming: true,
          qualityLevels: ['720p', '480p', '360p'],
          ...createVideoDto.processingSettings,
        },
      });

      const savedVideo = await this.videoRepository.save(video);

      // Generate S3 upload URL for direct upload
      const uploadKey = this.cloudFrontService.generateVideoKey(
        savedVideo.id,
        undefined,
        'original',
      );

      // Update video with S3 information
      await this.videoRepository.update(savedVideo.id, {
        s3Key: uploadKey,
        s3Bucket: this.cloudFrontService['config'].s3Bucket,
        cdnDomain: this.cloudFrontService['config'].distributionDomain,
      });

      this.logger.debug(`Video created successfully: ${savedVideo.id}`);

      return {
        video: savedVideo,
        uploadUrl: `https://${this.cloudFrontService['config'].s3Bucket}.s3.amazonaws.com/${uploadKey}`,
      };
    } catch (error) {
      this.logger.error('Failed to create video', error.stack);
      throw error;
    }
  }

  async uploadVideoFile(videoId: string, file: UploadedFileLike): Promise<void> {
    try {
      this.logger.debug(`Uploading video file for video: ${videoId}`);

      const video = await this.findVideoById(videoId);

      if (video.status !== VideoStatus.UPLOADING) {
        throw new BadRequestException('Video is not in uploading state');
      }

      // Upload to CloudFront/S3
      const uploadKey = this.cloudFrontService.generateVideoKey(videoId, undefined, 'original');
      const uploadResult = await this.cloudFrontService.uploadVideo(
        file.buffer,
        uploadKey,
        file.mimetype,
        {
          'video-id': videoId,
          'original-filename': file.originalname,
        },
      );

      // Update video with upload information
      await this.videoRepository.update(videoId, {
        s3Key: uploadResult.key,
        fileSize: uploadResult.size,
        streamingUrl: uploadResult.cdnUrl,
        metadata: {
          ...video.metadata,
          uploadMethod: 'direct',
          uploadCompletedAt: new Date(),
        },
      });

      // Queue video for processing
      await this.processingService.queueVideoProcessing(
        videoId,
        uploadResult.url,
        video.processingSettings as any,
      );

      this.logger.debug(`Video file uploaded successfully: ${videoId}`);
    } catch (error) {
      this.logger.error(`Failed to upload video file: ${videoId}`, error.stack);

      // Update video status to failed
      await this.videoRepository.update(videoId, {
        status: VideoStatus.FAILED,
        metadata: {
          processingErrors: [error.message],
        },
      });

      throw error;
    }
  }

  async getVideoStreamingInfo(
    videoId: string,
    userId?: string,
    requestInfo?: {
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
      domain?: string;
      country?: string;
    },
  ): Promise<VideoStreamingInfo> {
    try {
      this.logger.debug(`Getting streaming info for video: ${videoId}`);

      const video = await this.findVideoById(videoId, ['qualityVariants']);

      // Validate access
      const accessResult = await this.securityService.validateVideoAccess({
        videoId,
        userId,
        ...requestInfo,
      });

      if (!accessResult.allowed) {
        throw new BadRequestException(accessResult.reason);
      }

      // Get quality variants
      const qualities = video.qualityVariants
        .filter((q) => q.status === 'completed')
        .map((q) => ({
          quality: q.quality,
          url: q.url,
          width: q.width,
          height: q.height,
          bitrate: q.bitrate,
        }));

      // Generate DRM config if needed
      const drmConfig = await this.securityService.generateDRMConfig(video);

      // Generate session ID for analytics
      const sessionId = this.generateSessionId();

      return {
        video,
        streamingUrls: {
          primary: accessResult.streamingUrl || video.streamingUrl,
          hls: video.hlsUrl,
          dash: video.dashUrl,
          qualities,
        },
        security: {
          accessToken: accessResult.accessToken!,
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
          drmConfig,
        },
        analytics: {
          sessionId,
          trackingUrl: `/api/video-streaming/analytics/events`,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get streaming info: ${videoId}`, error.stack);
      throw error;
    }
  }

  async findVideoById(videoId: string, relations: string[] = []): Promise<Video> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['uploadedBy', ...relations],
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return video;
  }

  async findVideos(
    filters: {
      status?: VideoStatus;
      visibility?: VideoVisibility;
      uploadedBy?: string;
      search?: string;
    } = {},
    pagination: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ videos: Video[]; total: number }> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const whereClause: FindOptionsWhere<Video> = {};

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.visibility) {
      whereClause.visibility = filters.visibility;
    }

    if (filters.uploadedBy) {
      whereClause.uploadedBy = { id: filters.uploadedBy };
    }

    const queryBuilder = this.videoRepository
      .createQueryBuilder('video')
      .leftJoinAndSelect('video.uploadedBy', 'uploadedBy')
      .leftJoinAndSelect('video.qualityVariants', 'qualityVariants')
      .where(whereClause);

    if (filters.search) {
      queryBuilder.andWhere('(video.title ILIKE :search OR video.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    const [videos, total] = await queryBuilder
      .orderBy('video.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { videos, total };
  }

  async updateVideo(videoId: string, updateData: Partial<Video>, userId: string): Promise<Video> {
    const video = await this.findVideoById(videoId);

    // Check if user has permission to update
    if (video.uploadedBy.id !== userId) {
      throw new BadRequestException('You do not have permission to update this video');
    }

    await this.videoRepository.update(videoId, updateData);
    return this.findVideoById(videoId);
  }

  async deleteVideo(videoId: string, userId: string): Promise<void> {
    const video = await this.findVideoById(videoId, ['qualityVariants']);

    // Check if user has permission to delete
    if (video.uploadedBy.id !== userId) {
      throw new BadRequestException('You do not have permission to delete this video');
    }

    try {
      // Delete from CloudFront/S3
      if (video.s3Key) {
        await this.cloudFrontService.deleteVideo(video.s3Key);
      }

      // Delete quality variants from S3
      for (const quality of video.qualityVariants) {
        if (quality.s3Key) {
          await this.cloudFrontService.deleteVideo(quality.s3Key);
        }
      }

      // Delete from database
      await this.videoRepository.remove(video);

      this.logger.debug(`Video deleted successfully: ${videoId}`);
    } catch (error) {
      this.logger.error(`Failed to delete video: ${videoId}`, error.stack);
      throw error;
    }
  }

  async getVideoAnalytics(videoId: string, userId: string) {
    const video = await this.findVideoById(videoId);

    // Check if user has permission to view analytics
    if (video.uploadedBy.id !== userId) {
      throw new BadRequestException('You do not have permission to view analytics for this video');
    }

    const [engagement, performance, geographic, device, quality] = await Promise.all([
      this.analyticsService.getEngagementMetrics(videoId),
      this.analyticsService.getPerformanceMetrics(videoId),
      this.analyticsService.getGeographicMetrics(videoId),
      this.analyticsService.getDeviceMetrics(videoId),
      this.analyticsService.getQualityMetrics(videoId),
    ]);

    return {
      video: {
        id: video.id,
        title: video.title,
        duration: video.duration,
        viewCount: video.viewCount,
        createdAt: video.createdAt,
      },
      engagement,
      performance,
      geographic,
      device,
      quality,
    };
  }

  private extractFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
