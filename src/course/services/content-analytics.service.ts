import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackContentEngagementDto } from '../dto/content-management.dto';
import { ContentAnalytics } from '../entities/content-analytics.entity';
import { CourseContent } from '../entities/course-content.entity';

@Injectable()
export class ContentAnalyticsService {
  constructor(
    @InjectRepository(CourseContent)
    private readonly contentRepo: Repository<CourseContent>,
    @InjectRepository(ContentAnalytics)
    private readonly analyticsRepo: Repository<ContentAnalytics>,
  ) {}

  async trackEngagement(contentId: string, dto: TrackContentEngagementDto): Promise<ContentAnalytics> {
    const content = await this.contentRepo.findOne({ where: { id: contentId } });
    if (!content) {
      throw new NotFoundException('Content not found');
    }

    const completionPercent = dto.completionPercent ?? 0;
    const interactions = dto.interactions ?? 0;
    const viewDurationSeconds = dto.viewDurationSeconds ?? 0;
    const engagementScore = this.calculateEngagementScore(
      completionPercent,
      interactions,
      viewDurationSeconds,
    );

    return this.analyticsRepo.save(
      this.analyticsRepo.create({
        contentId,
        viewerId: dto.viewerId,
        eventType: dto.eventType || 'view',
        completionPercent,
        interactions,
        viewDurationSeconds,
        engagementScore,
        metadata: dto.metadata,
      }),
    );
  }

  async getEngagementSummary(contentId: string) {
    const content = await this.contentRepo.findOne({ where: { id: contentId } });
    if (!content) {
      throw new NotFoundException('Content not found');
    }

    const events = await this.analyticsRepo.find({ where: { contentId } });
    if (events.length === 0) {
      return {
        contentId,
        totalEvents: 0,
        averageEngagementScore: 0,
        averageCompletionPercent: 0,
        totalViewDurationSeconds: 0,
        totalInteractions: 0,
      };
    }

    const totalEngagement = events.reduce((acc, row) => acc + row.engagementScore, 0);
    const totalCompletion = events.reduce((acc, row) => acc + row.completionPercent, 0);
    const totalDuration = events.reduce((acc, row) => acc + row.viewDurationSeconds, 0);
    const totalInteractions = events.reduce((acc, row) => acc + row.interactions, 0);

    return {
      contentId,
      totalEvents: events.length,
      averageEngagementScore: Number((totalEngagement / events.length).toFixed(2)),
      averageCompletionPercent: Number((totalCompletion / events.length).toFixed(2)),
      totalViewDurationSeconds: totalDuration,
      totalInteractions,
    };
  }

  async getTopPerformingContents(limit = 10) {
    const rows = await this.analyticsRepo
      .createQueryBuilder('analytics')
      .select('analytics.contentId', 'contentId')
      .addSelect('AVG(analytics.engagementScore)', 'averageEngagementScore')
      .addSelect('COUNT(*)', 'totalEvents')
      .groupBy('analytics.contentId')
      .orderBy('AVG(analytics.engagementScore)', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map((row) => ({
      contentId: row.contentId,
      averageEngagementScore: Number(row.averageEngagementScore || 0),
      totalEvents: Number(row.totalEvents || 0),
    }));
  }

  private calculateEngagementScore(
    completionPercent: number,
    interactions: number,
    viewDurationSeconds: number,
  ): number {
    const score = completionPercent * 0.6 + interactions * 5 + Math.min(viewDurationSeconds / 12, 40);
    return Number(Math.max(0, Math.min(100, score)).toFixed(2));
  }
}
