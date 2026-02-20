import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchLog } from '../entities/search.entity';
import {  IndexContentDto } from '../entities/search.dto';
import { SearchQueryDto } from '../dto/search-query.dto';
import { CONTENT_INDEX_MAPPING } from '../entities/content.entity';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private readonly indexName = 'content';

  constructor(
    private readonly esService: ElasticsearchService,
    @InjectRepository(SearchLog)
    private readonly searchLogRepo: Repository<SearchLog>,
  ) {}

  async onModuleInit() {
    await this.createIndexIfNotExists();
  }

  private async createIndexIfNotExists() {
    const indexExists = await this.esService.indices.exists({ index: this.indexName });
    if (!indexExists) {
      await this.esService.indices.create({
        index: this.indexName,
        mappings: CONTENT_INDEX_MAPPING as any,
      });
      this.logger.log(`Created Elasticsearch index: ${this.indexName}`);
    }
  }

  async indexContent(content: IndexContentDto) {
    const { id, ...document } = content;
    return this.esService.index({
      index: this.indexName,
      id: id,
      document: document,
    });
  }

  async removeContent(id: string) {
    return this.esService.delete({
      index: this.indexName,
      id,
    });
  }

  async search(dto: SearchQueryDto, userId?: string) {
    const { query, page = 1, size = 10 } = dto;
    const from = (page - 1) * size;
    const startTime = Date.now();

    const must: any[] = [
      {
        multi_match: {
          query: query,
          fields: ['title^3', 'description^2', 'content', 'tags^2'],
          fuzziness: 'AUTO',
        },
      },
    ];

    if (dto.categories) {
      must.push({ terms: { category: dto.categories } });
    }
    if (dto.difficulty) {
      must.push({ terms: { difficulty: dto.difficulty } });
    }

    try {
      const response = await this.esService.search({
        index: this.indexName,
        ...{
          from,
          size: size,
          query: {
            bool: { must },
          },
          highlight: {
            fields: {
              title: {},
              description: {},
              content: {},
            },
          },
          aggs: {
            categories: { terms: { field: 'category' } },
            difficulty: { terms: { field: 'difficulty' } },
            tags: { terms: { field: 'tags' } },
          },
        } as any,
      });

      const hits = response.hits.hits;
      const total = typeof response.hits.total === 'object' ? response.hits.total.value : response.hits.total;
      const executionTime = Date.now() - startTime;

      // Log search asynchronously
      this.logSearch(query, userId, { categories: dto.categories, difficulty: dto.difficulty }, Number(total), executionTime);

      return {
        results: hits.map((hit) => ({
          id: hit._id,
          score: hit._score,
          ...hit._source as any,
          highlights: hit.highlight,
        })),
        meta: {
          total,
          page,
          limit: size,
          pages: Math.ceil(Number(total) / size),
        },
        facets: response.aggregations,
      };
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async logSearch(
    query: string,
    userId: string | undefined,
    filters: any,
    resultCount: number,
    executionTimeMs: number,
  ) {
    try {
      const log = this.searchLogRepo.create({
        query,
        userId,
        filters,
        resultCount,
        executionTimeMs,
      });
      await this.searchLogRepo.save(log);
    } catch (error) {
      this.logger.error(`Failed to log search: ${error.message}`);
    }
  }
}