import { Test, type TestingModule } from '@nestjs/testing';
import type { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { SearchAnalyticsInterceptor } from './search-analytics.interceptor';
import { SearchService } from '../search.service';
import { jest } from '@jest/globals';

describe('SearchAnalyticsInterceptor', () => {
  let interceptor: SearchAnalyticsInterceptor;
  let searchService: SearchService;

  const mockSearchService = {
    trackSearchAnalytics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchAnalyticsInterceptor,
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    }).compile();

    interceptor = module.get<SearchAnalyticsInterceptor>(SearchAnalyticsInterceptor);
    searchService = module.get<SearchService>(SearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should track search analytics for search requests', async () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: '/search',
          body: { query: 'stellar blockchain' },
          user: { id: 'user123' },
        }),
      }),
    } as ExecutionContext;

    const mockCallHandler = {
      handle: () => of({ courses: [], total: 5 }),
    } as CallHandler;

    mockSearchService.trackSearchAnalytics.mockResolvedValue(undefined);

    const result = await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

    expect(result).toEqual({ courses: [], total: 5 });
    expect(mockSearchService.trackSearchAnalytics).toHaveBeenCalledWith({
      query: 'stellar blockchain',
      userId: 'user123',
      resultsCount: 5,
      endpoint: '/search',
    });
  });

  it('should not track analytics for non-search requests', async () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/courses',
          user: { id: 'user123' },
        }),
      }),
    } as ExecutionContext;

    const mockCallHandler = {
      handle: () => of({ courses: [] }),
    } as CallHandler;

    const result = await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

    expect(result).toEqual({ courses: [] });
    expect(mockSearchService.trackSearchAnalytics).not.toHaveBeenCalled();
  });

  it('should handle anonymous users', async () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: '/search',
          body: { query: 'stellar' },
          user: null,
        }),
      }),
    } as ExecutionContext;

    const mockCallHandler = {
      handle: () => of({ courses: [], total: 3 }),
    } as CallHandler;

    const result = await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

    expect(mockSearchService.trackSearchAnalytics).toHaveBeenCalledWith({
      query: 'stellar',
      userId: null,
      resultsCount: 3,
      endpoint: '/search',
    });
  });

  it('should handle errors gracefully', async () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: '/search',
          body: { query: 'stellar' },
          user: { id: 'user123' },
        }),
      }),
    } as ExecutionContext;

    const mockCallHandler = {
      handle: () => of({ courses: [], total: 2 }),
    } as CallHandler;

    mockSearchService.trackSearchAnalytics.mockRejectedValue(new Error('Analytics error'));

    const result = await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

    expect(result).toEqual({ courses: [], total: 2 });
    // Should not throw error even if analytics tracking fails
  });
});
