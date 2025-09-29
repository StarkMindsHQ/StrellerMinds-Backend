import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';
import { VideoAnalyticsService } from '../services/video-analytics.service';
import { VideoStreamingService } from '../services/video-streaming.service';
import {
  CreateVideoAnalyticsDto,
  VideoAnalyticsQueryDto,
  VideoAnalyticsReportDto,
} from '../dto/video-analytics.dto';

@ApiTags('Video Analytics')
@Controller('video-analytics')
export class VideoAnalyticsController {
  constructor(
    private readonly analyticsService: VideoAnalyticsService,
    private readonly videoStreamingService: VideoStreamingService,
  ) {}

  @Post('events')
  @ApiOperation({ summary: 'Record analytics event' })
  @ApiResponse({ status: 201, description: 'Analytics event recorded successfully' })
  async recordEvent(
    @Body() eventData: CreateVideoAnalyticsDto,
    @GetUser() user?: User,
  ) {
    // Add user ID if authenticated
    if (user && !eventData.userId) {
      eventData.userId = user.id;
    }

    return this.analyticsService.recordEvent(eventData);
  }

  @Get('videos/:videoId/engagement')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get video engagement metrics' })
  @ApiParam({ name: 'videoId', description: 'Video ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Engagement metrics retrieved successfully' })
  async getEngagementMetrics(
    @Param('videoId') videoId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @GetUser() user?: User,
  ) {
    // Verify user has access to this video's analytics
    await this.verifyVideoAccess(videoId, user?.id);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getEngagementMetrics(videoId, start, end);
  }

  @Get('videos/:videoId/performance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get video performance metrics' })
  @ApiParam({ name: 'videoId', description: 'Video ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics(
    @Param('videoId') videoId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @GetUser() user?: User,
  ) {
    await this.verifyVideoAccess(videoId, user?.id);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getPerformanceMetrics(videoId, start, end);
  }

  @Get('videos/:videoId/geographic')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get video geographic metrics' })
  @ApiParam({ name: 'videoId', description: 'Video ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Geographic metrics retrieved successfully' })
  async getGeographicMetrics(
    @Param('videoId') videoId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @GetUser() user?: User,
  ) {
    await this.verifyVideoAccess(videoId, user?.id);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getGeographicMetrics(videoId, start, end);
  }

  @Get('videos/:videoId/device')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get video device metrics' })
  @ApiParam({ name: 'videoId', description: 'Video ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Device metrics retrieved successfully' })
  async getDeviceMetrics(
    @Param('videoId') videoId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @GetUser() user?: User,
  ) {
    await this.verifyVideoAccess(videoId, user?.id);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getDeviceMetrics(videoId, start, end);
  }

  @Get('videos/:videoId/quality')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get video quality metrics' })
  @ApiParam({ name: 'videoId', description: 'Video ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Quality metrics retrieved successfully' })
  async getQualityMetrics(
    @Param('videoId') videoId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @GetUser() user?: User,
  ) {
    await this.verifyVideoAccess(videoId, user?.id);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getQualityMetrics(videoId, start, end);
  }

  @Get('videos/:videoId/dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get comprehensive video analytics dashboard' })
  @ApiParam({ name: 'videoId', description: 'Video ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getAnalyticsDashboard(
    @Param('videoId') videoId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @GetUser() user?: User,
  ) {
    await this.verifyVideoAccess(videoId, user?.id);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const [video, engagement, performance, geographic, device, quality] = await Promise.all([
      this.videoStreamingService.findVideoById(videoId),
      this.analyticsService.getEngagementMetrics(videoId, start, end),
      this.analyticsService.getPerformanceMetrics(videoId, start, end),
      this.analyticsService.getGeographicMetrics(videoId, start, end),
      this.analyticsService.getDeviceMetrics(videoId, start, end),
      this.analyticsService.getQualityMetrics(videoId, start, end),
    ]);

    return {
      video: {
        id: video.id,
        title: video.title,
        duration: video.duration,
        formattedDuration: video.formattedDuration,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        shareCount: video.shareCount,
        averageRating: video.averageRating,
        createdAt: video.createdAt,
        status: video.status,
      },
      metrics: {
        engagement,
        performance,
        geographic,
        device,
        quality,
      },
      summary: {
        totalViews: engagement.totalViews,
        uniqueViewers: engagement.uniqueViewers,
        averageWatchTime: engagement.averageWatchTime,
        completionRate: engagement.completionRate,
        engagementScore: engagement.engagementScore,
        averageLoadTime: performance.averageLoadTime,
        errorRate: performance.errorRate,
        topCountry: geographic.topCountries[0]?.country || 'Unknown',
        primaryDevice: this.getPrimaryDevice(device.deviceTypes),
        averageQuality: quality.averageQuality,
      },
    };
  }

  @Post('reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate analytics report' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  async generateReport(
    @Body() reportDto: VideoAnalyticsReportDto,
    @GetUser() user?: User,
  ) {
    // Verify user has access to requested videos
    if (reportDto.videoIds) {
      for (const videoId of reportDto.videoIds) {
        await this.verifyVideoAccess(videoId, user?.id);
      }
    }

    // Implementation for report generation would go here
    // This could generate PDF reports, CSV exports, etc.
    
    return {
      message: 'Report generation started',
      reportId: `report_${Date.now()}`,
      estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };
  }

  @Get('overview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics overview for user videos' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Analytics overview retrieved successfully' })
  async getAnalyticsOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @GetUser() user?: User,
  ) {
    // Get all videos for the user
    const { videos } = await this.videoStreamingService.findVideos(
      { uploadedBy: user?.id },
      { limit: 1000 }, // Get all videos
    );

    const videoIds = videos.map(v => v.id);
    
    if (videoIds.length === 0) {
      return {
        totalVideos: 0,
        totalViews: 0,
        totalWatchTime: 0,
        averageEngagement: 0,
        topVideos: [],
      };
    }

    // Calculate aggregate metrics
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const metricsPromises = videoIds.map(async (videoId) => {
      const engagement = await this.analyticsService.getEngagementMetrics(videoId, start, end);
      return {
        videoId,
        views: engagement.totalViews,
        watchTime: engagement.averageWatchTime * engagement.totalViews,
        engagement: engagement.engagementScore,
      };
    });

    const allMetrics = await Promise.all(metricsPromises);

    const totalViews = allMetrics.reduce((sum, m) => sum + m.views, 0);
    const totalWatchTime = allMetrics.reduce((sum, m) => sum + m.watchTime, 0);
    const averageEngagement = allMetrics.reduce((sum, m) => sum + m.engagement, 0) / allMetrics.length;

    const topVideos = allMetrics
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)
      .map(m => {
        const video = videos.find(v => v.id === m.videoId);
        return {
          id: video?.id,
          title: video?.title,
          views: m.views,
          watchTime: m.watchTime,
          engagement: m.engagement,
        };
      });

    return {
      totalVideos: videos.length,
      totalViews,
      totalWatchTime,
      averageEngagement,
      topVideos,
    };
  }

  private async verifyVideoAccess(videoId: string, userId?: string): Promise<void> {
    const video = await this.videoStreamingService.findVideoById(videoId);
    
    if (video.uploadedBy.id !== userId) {
      throw new Error('You do not have permission to view analytics for this video');
    }
  }

  private getPrimaryDevice(deviceTypes: Record<string, number>): string {
    const entries = Object.entries(deviceTypes);
    if (entries.length === 0) return 'Unknown';
    
    return entries.sort(([, a], [, b]) => b - a)[0][0];
  }
}
