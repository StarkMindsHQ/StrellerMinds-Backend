import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

describe('SearchService', () => {
  let service: SearchService;
  let elasticsearchService: jest.Mocked<ElasticsearchService>;
  let cacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    const mockElasticsearchService = {
      search: jest.fn(),
      index: jest.fn(),
      bulk: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: ElasticsearchService,
          useValue: mockElasticsearchService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    elasticsearchService = module.get<ElasticsearchService>(
      ElasticsearchService,
    ) as jest.Mocked<ElasticsearchService>;
    cacheManager = module.get<Cache>(CACHE_MANAGER) as jest.Mocked<Cache>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
