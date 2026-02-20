import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchLog } from '../entities/search.entity';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly indexName = 'content';

  constructor(
    private readonly esService: ElasticsearchService,
    @InjectRepository(SearchLog)
    private readonly searchLogRepo: Repository<SearchLog>,
  ) {}

  async getSimilarContent(contentId: string, limit: number = 5) {
    try {
      const response = await this.esService.search({
        index: this.indexName,
        body: {
          size: limit,
          query: {
            more_like_this: {
              fields: ['title', 'description', 'tags'],
              like: [{ _index: this.indexName, _id: contentId }],
              min_term_freq: 1,
              max_query_terms: 12,
            },
          },
        },
      });

      return response.hits.hits.map((hit) => ({
        id: hit._id,
        ...hit._source as any,
      }));
    } catch (error) {
      this.logger.error(`Failed to get similar content: ${error.message}`);
      return [];
    }
  }

  async getPersonalizedRecommendations(userId: string, limit: number = 10) {
    // 1. Get user's recent search history
    const recentSearches = await this.searchLogRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    if (recentSearches.length === 0) {
      // Fallback to popular content if no history
      return this.getPopularContent(limit);
    }

    const searchTerms = recentSearches.map(s => s.query).join(' ');

    // 2. Search for content matching recent interests
    const response = await this.esService.search({
      index: this.indexName,
      body: {
        size: limit,
        query: {
          function_score: {
            query: {
              multi_match: {
                query: searchTerms,
                fields: ['title^2', 'tags^3', 'description'],
              },
            },
            // Boost newer content or highly rated content
            functions: [
              { fieldValueFactor: { field: 'rating', factor: 1.2, missing: 1 } },
              { gauss: { createdAt: { scale: '30d', decay: 0.5 } } }
            ],
          },
        },
      },
    });

    return response.hits.hits.map((hit) => ({
      id: hit._id,
      ...hit._source as any,
    }));
  }

  private async getPopularContent(limit: number) {
    const response = await this.esService.search({
      index: this.indexName,
      body: {
        size: limit,
        sort: [{ viewCount: 'desc' }, { rating: 'desc' }],
      },
    });

    return response.hits.hits.map((hit) => ({
      id: hit._id,
      ...hit._source as any,
    }));
  }
}