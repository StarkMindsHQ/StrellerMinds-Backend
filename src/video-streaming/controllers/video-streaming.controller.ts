import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';
import { VideoStreamingService } from '../services/video-streaming.service';
import { VideoAnalyticsService } from '../services/video-analytics.service';
import { VideoSecurityService } from '../services/video-security.service';
import { CreateVideoDto } from '../dto/create-video.dto';
import { CreateVideoAnalyticsDto, VideoAnalyticsQueryDto } from '../dto/video-analytics.dto';
import { Video, VideoStatus, VideoVisibility } from '../entities/video.entity';

@ApiTags('Video Streaming')
@Controller('video-streaming')
export class VideoStreamingController {
  constructor(
    private readonly videoStreamingService: VideoStreamingService,
    private readonly analyticsService: VideoAnalyticsService,
    private readonly securityService: VideoSecurityService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new video' })
  @ApiResponse({ status: 201, description: 'Video created successfully', type: Video })
  async createVideo(
    @Body() createVideoDto: CreateVideoDto,
    @GetUser() user: User,
  ) {
    return this.videoStreamingService.createVideo(createVideoDto, user);
  }

  @Post(':id/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('video'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload video file' })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({ status: 200, description: 'Video uploaded successfully' })
  async uploadVideo(
    @Param('id') videoId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    await this.videoStreamingService.uploadVideoFile(videoId, file);
    return { message: 'Video uploaded successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get videos with filtering and pagination' })
  @ApiQuery({ name: 'status', required: false, enum: VideoStatus })
  @ApiQuery({ name: 'visibility', required: false, enum: VideoVisibility })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Videos retrieved successfully' })
  async getVideos(
    @Query('status') status?: VideoStatus,
    @Query('visibility') visibility?: VideoVisibility,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.videoStreamingService.findVideos(
      { status, visibility, search },
      { page, limit },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get video by ID' })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({ status: 200, description: 'Video retrieved successfully', type: Video })
  async getVideo(@Param('id') videoId: string) {
    return this.videoStreamingService.findVideoById(videoId, ['qualityVariants']);
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Get video streaming information' })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({ status: 200, description: 'Streaming info retrieved successfully' })
  async getStreamingInfo(
    @Param('id') videoId: string,
    @GetUser() user?: User,
    @Req() request?: any,
  ) {
    const requestInfo = {
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent'),
      referrer: request?.get('Referer'),
      domain: request?.get('Host'),
      country: request?.get('CF-IPCountry'), // CloudFlare country header
    };

    return this.videoStreamingService.getVideoStreamingInfo(
      videoId,
      user?.id,
      requestInfo,
    );
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update video' })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({ status: 200, description: 'Video updated successfully', type: Video })
  async updateVideo(
    @Param('id') videoId: string,
    @Body() updateData: Partial<CreateVideoDto>,
    @GetUser() user: User,
  ) {
    return this.videoStreamingService.updateVideo(videoId, updateData, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete video' })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({ status: 200, description: 'Video deleted successfully' })
  async deleteVideo(
    @Param('id') videoId: string,
    @GetUser() user: User,
  ) {
    await this.videoStreamingService.deleteVideo(videoId, user.id);
    return { message: 'Video deleted successfully' };
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get video analytics' })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getVideoAnalytics(
    @Param('id') videoId: string,
    @GetUser() user: User,
  ) {
    return this.videoStreamingService.getVideoAnalytics(videoId, user.id);
  }

  @Post(':id/analytics/events')
  @ApiOperation({ summary: 'Record analytics event' })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({ status: 201, description: 'Analytics event recorded successfully' })
  async recordAnalyticsEvent(
    @Param('id') videoId: string,
    @Body() eventData: Omit<CreateVideoAnalyticsDto, 'videoId'>,
    @GetUser() user?: User,
  ) {
    const analyticsData: CreateVideoAnalyticsDto = {
      ...eventData,
      videoId,
      userId: user?.id,
    };

    return this.analyticsService.recordEvent(analyticsData);
  }

  @Get(':id/embed')
  @ApiOperation({ summary: 'Get video embed code' })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiQuery({ name: 'width', required: false, type: Number })
  @ApiQuery({ name: 'height', required: false, type: Number })
  @ApiQuery({ name: 'autoplay', required: false, type: Boolean })
  @ApiQuery({ name: 'controls', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Embed code generated successfully' })
  async getEmbedCode(
    @Param('id') videoId: string,
    @Query('width') width?: number,
    @Query('height') height?: number,
    @Query('autoplay') autoplay?: boolean,
    @Query('controls') controls?: boolean,
    @Req() request?: any,
  ) {
    const video = await this.videoStreamingService.findVideoById(videoId);
    const domain = request?.get('Host');

    const embedCode = this.securityService.generateEmbedCode(video, {
      width,
      height,
      autoplay,
      controls,
      domain,
    });

    return { embedCode };
  }

  @Post(':id/access-token')
  @ApiOperation({ summary: 'Generate video access token' })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({ status: 200, description: 'Access token generated successfully' })
  async generateAccessToken(
    @Param('id') videoId: string,
    @GetUser() user?: User,
    @Req() request?: any,
  ) {
    const requestInfo = {
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent'),
      referrer: request?.get('Referer'),
      domain: request?.get('Host'),
      country: request?.get('CF-IPCountry'),
    };

    const accessResult = await this.securityService.validateVideoAccess({
      videoId,
      userId: user?.id,
      ...requestInfo,
    });

    if (!accessResult.allowed) {
      throw new BadRequestException(accessResult.reason);
    }

    return {
      accessToken: accessResult.accessToken,
      streamingUrl: accessResult.streamingUrl,
    };
  }

  @Get(':id/qualities')
  @ApiOperation({ summary: 'Get available video qualities' })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({ status: 200, description: 'Video qualities retrieved successfully' })
  async getVideoQualities(@Param('id') videoId: string) {
    const video = await this.videoStreamingService.findVideoById(videoId, ['qualityVariants']);
    
    return {
      qualities: video.qualityVariants
        .filter(q => q.status === 'completed')
        .map(q => ({
          quality: q.quality,
          resolution: `${q.width}x${q.height}`,
          bitrate: q.bitrate,
          fileSize: q.formattedFileSize,
          url: q.url,
        })),
    };
  }
}
