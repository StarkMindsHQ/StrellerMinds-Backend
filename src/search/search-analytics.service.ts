/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { SearchAnalytics } from './entities/search-analytics.entity';

@Injectable()
export class SearchAnalyticsService {
  private readonly logger = new Logger(SearchAnalyticsService.name);

  constructor(
    @InjectRepository(SearchAnalytics)
    private searchAnalyticsRepository: Repository<SearchAnalytics>,
  ) {}

  @OnEvent('search.performed')
  async trackSearch(payload: any) {
    try {
      const { query, resultCount, processingTimeMs, timestamp } = payload;

      // Create a new analytics entry
      const analytics = this.searchAnalyticsRepository.create({
        searchTerm: query.query || '',
        searchType: query.type || 'all',
        filters: JSON.stringify(this.extractFilters(query)),
        resultCount,
        processingTimeMs,
        userId: query.userId,
        timestamp: timestamp || new Date(),
      });

      await this.searchAnalyticsRepository.save(analytics);
      this.logger.log(
        `Tracked search: "${query.query}" with ${resultCount} results`,
      );
    } catch (error) {
      this.logger.error(
        `Error tracking search analytics: ${error.message}`,
        error.stack,
      );
    }
  }

  async getPopularSearchTerms(
    limit: number = 10,
    days: number = 30,
  ): Promise<any[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const results = await this.searchAnalyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.searchTerm', 'term')
      .addSelect('COUNT(*)', 'count')
      .where('analytics.timestamp > :date', { date })
      .andWhere('analytics.searchTerm != :empty', { empty: '' })
      .groupBy('analytics.searchTerm')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return results;
  }

  async getSearchTypeDistribution(days: number = 30): Promise<any[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const results = await this.searchAnalyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.searchType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('analytics.timestamp > :date', { date })
      .groupBy('analytics.searchType')
      .orderBy('count', 'DESC')
      .getRawMany();

    return results;
  }

  async getAverageProcessingTime(days: number = 30): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const result = await this.searchAnalyticsRepository
      .createQueryBuilder('analytics')
      .select('AVG(analytics.processingTimeMs)', 'average')
      .where('analytics.timestamp > :date', { date })
      .getRawOne();

    return result?.average || 0;
  }

  async getSearchTrends(
    days: number = 30,
    interval: 'day' | 'week' | 'month' = 'day',
  ): Promise<any[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    let dateFormat: string;
    switch (interval) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%u'; // Year and week number
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
    }

    const results = await this.searchAnalyticsRepository
      .createQueryBuilder('analytics')
      .select(`DATE_FORMAT(analytics.timestamp, '${dateFormat}')`, 'period')
      .addSelect('COUNT(*)', 'count')
      .where('analytics.timestamp > :date', { date })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    return results;
  }

  private extractFilters(query: any): Record<string, any> {
    const filters: Record<string, any> = {};

    // Extract relevant filter fields
    if (query.categories) filters.categories = query.categories;
    if (query.tags) filters.tags = query.tags;
    if (query.minPrice !== undefined) filters.minPrice = query.minPrice;
    if (query.maxPrice !== undefined) filters.maxPrice = query.maxPrice;
    if (query.minRating !== undefined) filters.minRating = query.minRating;
    if (query.isPublished !== undefined)
      filters.isPublished = query.isPublished;
    if (query.sortBy) filters.sortBy = query.sortBy;
    if (query.order) filters.order = query.order;

    return filters;
  }
}
