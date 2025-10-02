import { Test, type TestingModule } from '@nestjs/testing';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { SearchService } from './search.service';
import { Course } from '../courses/entities/course.entity';
import { SearchAnalytics } from './entities/search-analytics.entity';
import type { SearchDto } from './dto/search.dto';
import type { AdvancedFilterDto } from './dto/advanced-filter.dto';
import type { SearchSuggestionDto } from './dto/search-suggestion.dto';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { jest } from '@jest/globals'; // Import jest to declare it

describe('SearchService', () => {
  let service: SearchService;
  let elasticsearchService: ElasticsearchService;
  let courseRepository: Repository<Course>;
  let searchAnalyticsRepository: Repository<SearchAnalytics>;

  const mockElasticsearchService = {
    search: jest.fn(),
    index: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    indices: {
      create: jest.fn(),
      exists: jest.fn(),
      putMapping: jest.fn(),
    },
    bulk: jest.fn(),
  };

  const mockCourseRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockSearchAnalyticsRepository = {
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCourses = [
    {
      id: '1',
      title: 'Introduction to Stellar Blockchain',
      description: 'Learn the basics of Stellar blockchain technology',
      category: 'blockchain',
      level: 'beginner',
      duration: 120,
      price: 99.99,
      instructor: 'John Doe',
      tags: ['stellar', 'blockchain', 'cryptocurrency'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: '2',
      title: 'Advanced Smart Contracts on Stellar',
      description: 'Master smart contract development on Stellar network',
      category: 'development',
      level: 'advanced',
      duration: 240,
      price: 199.99,
      instructor: 'Jane Smith',
      tags: ['stellar', 'smart-contracts', 'development'],
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: ElasticsearchService,
          useValue: mockElasticsearchService,
        },
        {
          provide: getRepositoryToken(Course),
          useValue: mockCourseRepository,
        },
        {
          provide: getRepositoryToken(SearchAnalytics),
          useValue: mockSearchAnalyticsRepository,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    elasticsearchService = module.get<ElasticsearchService>(ElasticsearchService);
    courseRepository = module.get<Repository<Course>>(getRepositoryToken(Course));
    searchAnalyticsRepository = module.get<Repository<SearchAnalytics>>(
      getRepositoryToken(SearchAnalytics),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize Elasticsearch index', async () => {
      mockElasticsearchService.indices.exists.mockResolvedValue({ body: false });
      mockElasticsearchService.indices.create.mockResolvedValue({ body: { acknowledged: true } });
      mockElasticsearchService.indices.putMapping.mockResolvedValue({
        body: { acknowledged: true },
      });

      await service.onModuleInit();

      expect(mockElasticsearchService.indices.exists).toHaveBeenCalledWith({
        index: 'courses',
      });
      expect(mockElasticsearchService.indices.create).toHaveBeenCalledWith({
        index: 'courses',
        body: expect.objectContaining({
          settings: expect.any(Object),
        }),
      });
    });

    it('should not create index if it already exists', async () => {
      mockElasticsearchService.indices.exists.mockResolvedValue({ body: true });

      await service.onModuleInit();

      expect(mockElasticsearchService.indices.create).not.toHaveBeenCalled();
    });
  });

  describe('indexCourse', () => {
    it('should index a course successfully', async () => {
      const course = mockCourses[0];
      mockElasticsearchService.index.mockResolvedValue({
        body: { _id: course.id, result: 'created' },
      });

      const result = await service.indexCourse(course);

      expect(mockElasticsearchService.index).toHaveBeenCalledWith({
        index: 'courses',
        id: course.id,
        body: {
          title: course.title,
          description: course.description,
          category: course.category,
          level: course.level,
          duration: course.duration,
          price: course.price,
          instructor: course.instructor,
          tags: course.tags,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt,
        },
      });
      expect(result).toEqual({ _id: course.id, result: 'created' });
    });

    it('should handle indexing errors', async () => {
      const course = mockCourses[0];
      mockElasticsearchService.index.mockRejectedValue(new Error('Elasticsearch error'));

      await expect(service.indexCourse(course)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('search', () => {
    const searchDto: SearchDto = {
      query: 'stellar blockchain',
      page: 1,
      limit: 10,
    };

    it('should perform full-text search successfully', async () => {
      const mockSearchResponse = {
        body: {
          hits: {
            total: { value: 2 },
            hits: [
              {
                _id: '1',
                _source: mockCourses[0],
                _score: 1.5,
              },
              {
                _id: '2',
                _source: mockCourses[1],
                _score: 1.2,
              },
            ],
          },
          aggregations: {
            categories: {
              buckets: [
                { key: 'blockchain', doc_count: 1 },
                { key: 'development', doc_count: 1 },
              ],
            },
          },
        },
      };

      mockElasticsearchService.search.mockResolvedValue(mockSearchResponse);
      mockSearchAnalyticsRepository.save.mockResolvedValue({});

      const result = await service.search(searchDto, 'user123');

      expect(mockElasticsearchService.search).toHaveBeenCalledWith({
        index: 'courses',
        body: expect.objectContaining({
          query: expect.objectContaining({
            multi_match: expect.objectContaining({
              query: 'stellar blockchain',
              fields: ['title^3', 'description^2', 'instructor', 'tags'],
            }),
          }),
          from: 0,
          size: 10,
        }),
      });

      expect(result).toEqual({
        courses: mockCourses,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        aggregations: {
          categories: [
            { key: 'blockchain', doc_count: 1 },
            { key: 'development', doc_count: 1 },
          ],
        },
      });

      expect(mockSearchAnalyticsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'stellar blockchain',
          userId: 'user123',
          resultsCount: 2,
        }),
      );
    });

    it('should handle empty search query', async () => {
      const emptySearchDto: SearchDto = {
        query: '',
        page: 1,
        limit: 10,
      };

      await expect(service.search(emptySearchDto, 'user123')).rejects.toThrow(BadRequestException);
    });

    it('should handle search errors', async () => {
      mockElasticsearchService.search.mockRejectedValue(new Error('Search failed'));

      await expect(service.search(searchDto, 'user123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('advancedSearch', () => {
    const advancedFilterDto: AdvancedFilterDto = {
      query: 'stellar',
      categories: ['blockchain', 'development'],
      levels: ['beginner', 'advanced'],
      priceRange: { min: 50, max: 200 },
      durationRange: { min: 60, max: 300 },
      instructors: ['John Doe'],
      tags: ['stellar'],
      sortBy: 'relevance',
      sortOrder: 'desc',
      page: 1,
      limit: 10,
    };

    it('should perform advanced search with filters', async () => {
      const mockSearchResponse = {
        body: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _id: '1',
                _source: mockCourses[0],
                _score: 1.5,
              },
            ],
          },
        },
      };

      mockElasticsearchService.search.mockResolvedValue(mockSearchResponse);
      mockSearchAnalyticsRepository.save.mockResolvedValue({});

      const result = await service.advancedSearch(advancedFilterDto, 'user123');

      expect(mockElasticsearchService.search).toHaveBeenCalledWith({
        index: 'courses',
        body: expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              must: expect.arrayContaining([
                expect.objectContaining({
                  multi_match: expect.objectContaining({
                    query: 'stellar',
                  }),
                }),
              ]),
              filter: expect.arrayContaining([
                expect.objectContaining({
                  terms: { category: ['blockchain', 'development'] },
                }),
                expect.objectContaining({
                  terms: { level: ['beginner', 'advanced'] },
                }),
                expect.objectContaining({
                  range: { price: { gte: 50, lte: 200 } },
                }),
              ]),
            }),
          }),
        }),
      });

      expect(result.courses).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should handle sorting options', async () => {
      const sortDto = { ...advancedFilterDto, sortBy: 'price', sortOrder: 'asc' as const };

      mockElasticsearchService.search.mockResolvedValue({
        body: { hits: { total: { value: 0 }, hits: [] } },
      });

      await service.advancedSearch(sortDto, 'user123');

      expect(mockElasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            sort: [{ price: { order: 'asc' } }],
          }),
        }),
      );
    });
  });

  describe('getSuggestions', () => {
    const suggestionDto: SearchSuggestionDto = {
      query: 'stel',
      limit: 5,
    };

    it('should return search suggestions', async () => {
      const mockSuggestResponse = {
        body: {
          suggest: {
            title_suggest: [
              {
                options: [
                  { text: 'stellar', _score: 1.0 },
                  { text: 'stellar blockchain', _score: 0.8 },
                ],
              },
            ],
            description_suggest: [
              {
                options: [{ text: 'stellar network', _score: 0.9 }],
              },
            ],
          },
        },
      };

      mockElasticsearchService.search.mockResolvedValue(mockSuggestResponse);

      const result = await service.getSuggestions(suggestionDto);

      expect(mockElasticsearchService.search).toHaveBeenCalledWith({
        index: 'courses',
        body: {
          suggest: {
            title_suggest: {
              prefix: 'stel',
              completion: {
                field: 'title.suggest',
                size: 5,
              },
            },
            description_suggest: {
              prefix: 'stel',
              completion: {
                field: 'description.suggest',
                size: 5,
              },
            },
          },
        },
      });

      expect(result).toEqual({
        suggestions: [
          { text: 'stellar', score: 1.0, source: 'title' },
          { text: 'stellar blockchain', score: 0.8, source: 'title' },
          { text: 'stellar network', score: 0.9, source: 'description' },
        ],
      });
    });

    it('should handle empty suggestions', async () => {
      mockElasticsearchService.search.mockResolvedValue({
        body: {
          suggest: {
            title_suggest: [{ options: [] }],
            description_suggest: [{ options: [] }],
          },
        },
      });

      const result = await service.getSuggestions(suggestionDto);

      expect(result.suggestions).toHaveLength(0);
    });
  });

  describe('getSearchAnalytics', () => {
    it('should return search analytics', async () => {
      const mockAnalytics = [
        {
          id: '1',
          query: 'stellar',
          userId: 'user123',
          resultsCount: 5,
          clickedResults: ['1', '2'],
          searchedAt: new Date(),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAnalytics),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { query: 'stellar', count: '10' },
          { query: 'blockchain', count: '8' },
        ]),
      };

      mockSearchAnalyticsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getSearchAnalytics({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        userId: 'user123',
      });

      expect(result).toEqual({
        recentSearches: mockAnalytics,
        popularQueries: [
          { query: 'stellar', count: 10 },
          { query: 'blockchain', count: 8 },
        ],
      });
    });
  });

  describe('updateCourse', () => {
    it('should update course in Elasticsearch', async () => {
      const courseId = '1';
      const updateData = { title: 'Updated Title' };

      mockElasticsearchService.update.mockResolvedValue({
        body: { _id: courseId, result: 'updated' },
      });

      const result = await service.updateCourse(courseId, updateData);

      expect(mockElasticsearchService.update).toHaveBeenCalledWith({
        index: 'courses',
        id: courseId,
        body: {
          doc: updateData,
        },
      });

      expect(result).toEqual({ _id: courseId, result: 'updated' });
    });
  });

  describe('deleteCourse', () => {
    it('should delete course from Elasticsearch', async () => {
      const courseId = '1';

      mockElasticsearchService.delete.mockResolvedValue({
        body: { _id: courseId, result: 'deleted' },
      });

      const result = await service.deleteCourse(courseId);

      expect(mockElasticsearchService.delete).toHaveBeenCalledWith({
        index: 'courses',
        id: courseId,
      });

      expect(result).toEqual({ _id: courseId, result: 'deleted' });
    });
  });

  describe('bulkIndexCourses', () => {
    it('should bulk index multiple courses', async () => {
      mockElasticsearchService.bulk.mockResolvedValue({
        body: {
          errors: false,
          items: [
            { index: { _id: '1', result: 'created' } },
            { index: { _id: '2', result: 'created' } },
          ],
        },
      });

      const result = await service.bulkIndexCourses(mockCourses);

      expect(mockElasticsearchService.bulk).toHaveBeenCalledWith({
        body: expect.arrayContaining([
          { index: { _index: 'courses', _id: '1' } },
          expect.objectContaining({ title: mockCourses[0].title }),
          { index: { _index: 'courses', _id: '2' } },
          expect.objectContaining({ title: mockCourses[1].title }),
        ]),
      });

      expect(result.errors).toBe(false);
      expect(result.items).toHaveLength(2);
    });

    it('should handle bulk indexing errors', async () => {
      mockElasticsearchService.bulk.mockResolvedValue({
        body: {
          errors: true,
          items: [{ index: { _id: '1', error: { reason: 'Document already exists' } } }],
        },
      });

      const result = await service.bulkIndexCourses([mockCourses[0]]);

      expect(result.errors).toBe(true);
      expect(result.items[0].index.error).toBeDefined();
    });
  });

  describe('getPopularSearchTerms', () => {
    it('should return popular search terms', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { query: 'stellar', searchCount: '15' },
          { query: 'blockchain', searchCount: '12' },
          { query: 'smart contracts', searchCount: '8' },
        ]),
      };

      mockSearchAnalyticsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getPopularSearchTerms(10);

      expect(result).toEqual([
        { query: 'stellar', searchCount: 15 },
        { query: 'blockchain', searchCount: 12 },
        { query: 'smart contracts', searchCount: 8 },
      ]);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('trackSearchClick', () => {
    it('should track search result click', async () => {
      const searchId = 'search123';
      const courseId = 'course456';

      const mockSearchAnalytic = {
        id: searchId,
        clickedResults: ['course123'],
        save: jest.fn(),
      };

      mockSearchAnalyticsRepository.findOne.mockResolvedValue(mockSearchAnalytic);

      await service.trackSearchClick(searchId, courseId);

      expect(mockSearchAnalyticsRepository.findOne).toHaveBeenCalledWith({
        where: { id: searchId },
      });

      expect(mockSearchAnalytic.clickedResults).toContain(courseId);
      expect(mockSearchAnalytic.save).toHaveBeenCalled();
    });

    it('should handle non-existent search analytics', async () => {
      mockSearchAnalyticsRepository.findOne.mockResolvedValue(null);

      await expect(service.trackSearchClick('nonexistent', 'course123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
