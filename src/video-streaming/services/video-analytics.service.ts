import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VideoAnalytics, AnalyticsEventType } from '../entities/video-analytics.entity';
import { Video } from '../entities/video.entity';
import { User } from '../../users/entities/user.entity';
import { CreateVideoAnalyticsDto, VideoAnalyticsQueryDto } from '../dto/video-analytics.dto';

export interface EngagementMetrics {
  totalViews: number;
  uniqueViewers: number;
  averageWatchTime: number;
  watchTimePercentage: number;
  completionRate: number;
  dropOffPoints: Array<{
    timestamp: number;
    percentage: number;
  }>;
  engagementScore: number;
}

export interface PerformanceMetrics {
  averageLoadTime: number;
  bufferEvents: number;
  qualityChanges: number;
  errorRate: number;
  averageBitrate: number;
  rebufferRatio: number;
  startupTime: number;
}

export interface GeographicMetrics {
  viewsByCountry: Record<string, number>;
  viewsByRegion: Record<string, number>;
  topCountries: Array<{
    country: string;
    views: number;
    percentage: number;
  }>;
}

export interface DeviceMetrics {
  deviceTypes: Record<string, number>;
  browsers: Record<string, number>;
  operatingSystems: Record<string, number>;
  screenResolutions: Record<string, number>;
}

export interface QualityMetrics {
  qualityDistribution: Record<string, number>;
  averageQuality: string;
  qualityChangesPerSession: number;
  adaptiveBitrateEfficiency: number;
}

@Injectable()
export class VideoAnalyticsService {
  private readonly logger = new Logger(VideoAnalyticsService.name);

  constructor(
    @InjectRepository(VideoAnalytics)
    private readonly analyticsRepository: Repository<VideoAnalytics>,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async recordEvent(eventData: CreateVideoAnalyticsDto): Promise<VideoAnalytics> {
    try {
      const analytics = this.analyticsRepository.create({
        ...eventData,
        video: { id: eventData.videoId },
        user: eventData.userId ? { id: eventData.userId } : null,
        timestamp: new Date(),
      });

      const savedAnalytics = await this.analyticsRepository.save(analytics);

      // Update video view count for view_start events
      if (eventData.eventType === AnalyticsEventType.VIEW_START) {
        await this.incrementViewCount(eventData.videoId);
      }

      this.logger.debug(
        `Analytics event recorded: ${eventData.eventType} for video ${eventData.videoId}`,
      );
      return savedAnalytics;
    } catch (error) {
      this.logger.error('Failed to record analytics event', error.stack);
      throw error;
    }
  }

  async getEngagementMetrics(
    videoId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<EngagementMetrics> {
    try {
      const whereClause: any = { video: { id: videoId } };

      if (startDate && endDate) {
        whereClause.timestamp = Between(startDate, endDate);
      }

      const events = await this.analyticsRepository.find({
        where: whereClause,
        order: { timestamp: 'ASC' },
      });

      const sessions = this.groupEventsBySessions(events);

      return {
        totalViews: this.calculateTotalViews(sessions),
        uniqueViewers: this.calculateUniqueViewers(sessions),
        averageWatchTime: this.calculateAverageWatchTime(sessions),
        watchTimePercentage: this.calculateWatchTimePercentage(sessions),
        completionRate: this.calculateCompletionRate(sessions),
        dropOffPoints: this.calculateDropOffPoints(sessions),
        engagementScore: this.calculateEngagementScore(sessions),
      };
    } catch (error) {
      this.logger.error(`Failed to get engagement metrics for video ${videoId}`, error.stack);
      throw error;
    }
  }

  async getPerformanceMetrics(
    videoId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PerformanceMetrics> {
    try {
      const whereClause: any = {
        video: { id: videoId },
        eventType: In([
          AnalyticsEventType.VIEW_START,
          AnalyticsEventType.BUFFER_START,
          AnalyticsEventType.BUFFER_END,
          AnalyticsEventType.QUALITY_CHANGE,
          AnalyticsEventType.ERROR,
        ]),
      };

      if (startDate && endDate) {
        whereClause.timestamp = Between(startDate, endDate);
      }

      const events = await this.analyticsRepository.find({
        where: whereClause,
        order: { timestamp: 'ASC' },
      });

      return {
        averageLoadTime: this.calculateAverageLoadTime(events),
        bufferEvents: this.calculateBufferEvents(events),
        qualityChanges: this.calculateQualityChanges(events),
        errorRate: this.calculateErrorRate(events),
        averageBitrate: this.calculateAverageBitrate(events),
        rebufferRatio: this.calculateRebufferRatio(events),
        startupTime: this.calculateStartupTime(events),
      };
    } catch (error) {
      this.logger.error(`Failed to get performance metrics for video ${videoId}`, error.stack);
      throw error;
    }
  }

  async getGeographicMetrics(
    videoId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<GeographicMetrics> {
    try {
      const whereClause: any = {
        video: { id: videoId },
        eventType: AnalyticsEventType.VIEW_START,
      };

      if (startDate && endDate) {
        whereClause.timestamp = Between(startDate, endDate);
      }

      const events = await this.analyticsRepository.find({
        where: whereClause,
        select: ['geolocation'],
      });

      const viewsByCountry: Record<string, number> = {};
      const viewsByRegion: Record<string, number> = {};

      events.forEach((event) => {
        if (event.geolocation?.country) {
          viewsByCountry[event.geolocation.country] =
            (viewsByCountry[event.geolocation.country] || 0) + 1;
        }

        if (event.geolocation?.region) {
          viewsByRegion[event.geolocation.region] =
            (viewsByRegion[event.geolocation.region] || 0) + 1;
        }
      });

      const totalViews = events.length;
      const topCountries = Object.entries(viewsByCountry)
        .map(([country, views]) => ({
          country,
          views,
          percentage: (views / totalViews) * 100,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      return {
        viewsByCountry,
        viewsByRegion,
        topCountries,
      };
    } catch (error) {
      this.logger.error(`Failed to get geographic metrics for video ${videoId}`, error.stack);
      throw error;
    }
  }

  async getDeviceMetrics(
    videoId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<DeviceMetrics> {
    try {
      const whereClause: any = {
        video: { id: videoId },
        eventType: AnalyticsEventType.VIEW_START,
      };

      if (startDate && endDate) {
        whereClause.timestamp = Between(startDate, endDate);
      }

      const events = await this.analyticsRepository.find({
        where: whereClause,
        select: ['deviceInfo'],
      });

      const deviceTypes: Record<string, number> = {};
      const browsers: Record<string, number> = {};
      const operatingSystems: Record<string, number> = {};
      const screenResolutions: Record<string, number> = {};

      events.forEach((event) => {
        if (event.deviceInfo?.type) {
          deviceTypes[event.deviceInfo.type] = (deviceTypes[event.deviceInfo.type] || 0) + 1;
        }

        if (event.deviceInfo?.browser) {
          browsers[event.deviceInfo.browser] = (browsers[event.deviceInfo.browser] || 0) + 1;
        }

        if (event.deviceInfo?.os) {
          operatingSystems[event.deviceInfo.os] = (operatingSystems[event.deviceInfo.os] || 0) + 1;
        }

        if (event.deviceInfo?.screenResolution) {
          screenResolutions[event.deviceInfo.screenResolution] =
            (screenResolutions[event.deviceInfo.screenResolution] || 0) + 1;
        }
      });

      return {
        deviceTypes,
        browsers,
        operatingSystems,
        screenResolutions,
      };
    } catch (error) {
      this.logger.error(`Failed to get device metrics for video ${videoId}`, error.stack);
      throw error;
    }
  }

  async getQualityMetrics(
    videoId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<QualityMetrics> {
    try {
      const whereClause: any = { video: { id: videoId } };

      if (startDate && endDate) {
        whereClause.timestamp = Between(startDate, endDate);
      }

      const events = await this.analyticsRepository.find({
        where: whereClause,
        select: ['quality', 'eventType'],
      });

      const qualityDistribution: Record<string, number> = {};
      let qualityChanges = 0;
      let totalSessions = 0;

      events.forEach((event) => {
        if (event.quality) {
          qualityDistribution[event.quality] = (qualityDistribution[event.quality] || 0) + 1;
        }

        if (event.eventType === AnalyticsEventType.QUALITY_CHANGE) {
          qualityChanges++;
        }

        if (event.eventType === AnalyticsEventType.VIEW_START) {
          totalSessions++;
        }
      });

      const qualityChangesPerSession = totalSessions > 0 ? qualityChanges / totalSessions : 0;

      // Calculate most common quality as average
      const sortedQualities = Object.entries(qualityDistribution).sort(([, a], [, b]) => b - a);
      const averageQuality = sortedQualities[0]?.[0] || 'unknown';

      return {
        qualityDistribution,
        averageQuality,
        qualityChangesPerSession,
        adaptiveBitrateEfficiency: this.calculateABREfficiency(events),
      };
    } catch (error) {
      this.logger.error(`Failed to get quality metrics for video ${videoId}`, error.stack);
      throw error;
    }
  }

  private groupEventsBySessions(events: VideoAnalytics[]): Map<string, VideoAnalytics[]> {
    const sessions = new Map<string, VideoAnalytics[]>();

    events.forEach((event) => {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, []);
      }
      sessions.get(event.sessionId)!.push(event);
    });

    return sessions;
  }

  private calculateTotalViews(sessions: Map<string, VideoAnalytics[]>): number {
    return sessions.size;
  }

  private calculateUniqueViewers(sessions: Map<string, VideoAnalytics[]>): number {
    const uniqueUsers = new Set<string>();

    sessions.forEach((sessionEvents) => {
      const userEvent = sessionEvents.find((e) => e.user);
      if (userEvent?.user) {
        uniqueUsers.add(userEvent.user.id);
      }
    });

    return uniqueUsers.size;
  }

  private calculateAverageWatchTime(sessions: Map<string, VideoAnalytics[]>): number {
    let totalWatchTime = 0;
    let validSessions = 0;

    sessions.forEach((sessionEvents) => {
      const startEvent = sessionEvents.find((e) => e.eventType === AnalyticsEventType.VIEW_START);
      const endEvent = sessionEvents.find((e) => e.eventType === AnalyticsEventType.VIEW_END);

      if (startEvent && endEvent) {
        const watchTime = endEvent.timestamp.getTime() - startEvent.timestamp.getTime();
        totalWatchTime += watchTime / 1000; // Convert to seconds
        validSessions++;
      }
    });

    return validSessions > 0 ? totalWatchTime / validSessions : 0;
  }

  private calculateWatchTimePercentage(sessions: Map<string, VideoAnalytics[]>): number {
    // Implementation for watch time percentage calculation
    return 0; // Placeholder
  }

  private calculateCompletionRate(sessions: Map<string, VideoAnalytics[]>): number {
    let completedSessions = 0;

    sessions.forEach((sessionEvents) => {
      const hasViewEnd = sessionEvents.some((e) => e.eventType === AnalyticsEventType.VIEW_END);
      const maxPosition = Math.max(...sessionEvents.map((e) => e.playbackPosition || 0));

      // Consider completed if reached 90% or has view_end event
      if (hasViewEnd || maxPosition > 0.9) {
        completedSessions++;
      }
    });

    return sessions.size > 0 ? (completedSessions / sessions.size) * 100 : 0;
  }

  private calculateDropOffPoints(
    sessions: Map<string, VideoAnalytics[]>,
  ): Array<{ timestamp: number; percentage: number }> {
    // Implementation for drop-off points calculation
    return []; // Placeholder
  }

  private calculateEngagementScore(sessions: Map<string, VideoAnalytics[]>): number {
    // Implementation for engagement score calculation
    return 0; // Placeholder
  }

  private calculateAverageLoadTime(events: VideoAnalytics[]): number {
    const loadTimes = events
      .filter((e) => e.performanceMetrics?.loadTime)
      .map((e) => e.performanceMetrics!.loadTime!);

    return loadTimes.length > 0
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length
      : 0;
  }

  private calculateBufferEvents(events: VideoAnalytics[]): number {
    return events.filter((e) => e.eventType === AnalyticsEventType.BUFFER_START).length;
  }

  private calculateQualityChanges(events: VideoAnalytics[]): number {
    return events.filter((e) => e.eventType === AnalyticsEventType.QUALITY_CHANGE).length;
  }

  private calculateErrorRate(events: VideoAnalytics[]): number {
    const totalEvents = events.length;
    const errorEvents = events.filter((e) => e.eventType === AnalyticsEventType.ERROR).length;

    return totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;
  }

  private calculateAverageBitrate(events: VideoAnalytics[]): number {
    const bitrates = events
      .filter((e) => e.performanceMetrics?.averageBitrate)
      .map((e) => e.performanceMetrics!.averageBitrate!);

    return bitrates.length > 0
      ? bitrates.reduce((sum, bitrate) => sum + bitrate, 0) / bitrates.length
      : 0;
  }

  private calculateRebufferRatio(events: VideoAnalytics[]): number {
    // Implementation for rebuffer ratio calculation
    return 0; // Placeholder
  }

  private calculateStartupTime(events: VideoAnalytics[]): number {
    // Implementation for startup time calculation
    return 0; // Placeholder
  }

  private calculateABREfficiency(events: VideoAnalytics[]): number {
    // Implementation for adaptive bitrate efficiency calculation
    return 0; // Placeholder
  }

  private async incrementViewCount(videoId: string): Promise<void> {
    await this.videoRepository.increment({ id: videoId }, 'viewCount', 1);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async aggregateHourlyMetrics(): Promise<void> {
    this.logger.debug('Running hourly analytics aggregation');
    // Implementation for hourly metrics aggregation
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDailyMetrics(): Promise<void> {
    this.logger.debug('Running daily analytics aggregation');
    // Implementation for daily metrics aggregation
  }
}
