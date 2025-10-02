import { Test, type TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import type { SearchDto } from './dto/search.dto';
import type { AdvancedFilterDto } from './dto/advanced-filter.dto';
import type { SearchSuggestionDto } from './dto/search-suggestion.dto';
import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals'; // Import jest to declare it

describe('SearchController', () => {
  let controller: SearchController;
  let searchService: SearchService;

  const mockSearchService = {
    search: jest.fn(),
    advancedSearch: jest.fn(),
    getSuggestions: jest.fn(),
    getSearchAnalytics: jest.fn(),
    getPopularSearchTerms: jest.fn(),
    trackSearchClick: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    searchService = module.get<SearchService>(SearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    const searchDto: SearchDto = {
      query: 'stellar blockchain',
      page: 1,
      limit: 10,
    };

    const mockRequest = {
      user: { id: 'user123' },
    };

    it('should return search results', async () => {
      const mockResult = {
        courses: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        aggregations: {},
      };

      mockSearchService.search.mockResolvedValue(mockResult);

      const result = await controller.search(searchDto, mockRequest);

      expect(searchService.search).toHaveBeenCalledWith(searchDto, 'user123');
      expect(result).toEqual(mockResult);
    });

    it('should handle search without authenticated user', async () => {
      const mockResult = {
        courses: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        aggregations: {},
      };

      mockSearchService.search.mockResolvedValue(mockResult);

      const result = await controller.search(searchDto, { user: null });

      expect(searchService.search).toHaveBeenCalledWith(searchDto, null);
      expect(result).toEqual(mockResult);
    });
  });

  describe('advancedSearch', () => {
    const advancedFilterDto: AdvancedFilterDto = {
      query: 'stellar',
      categories: ['blockchain'],
      levels: ['beginner'],
      priceRange: { min: 0, max: 100 },
      page: 1,
      limit: 10,
    };

    const mockRequest = {
      user: { id: 'user123' },
    };

    it('should return advanced search results', async () => {
      const mockResult = {
        courses: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        aggregations: {},
      };

      mockSearchService.advancedSearch.mockResolvedValue(mockResult);

      const result = await controller.advancedSearch(advancedFilterDto, mockRequest);

      expect(searchService.advancedSearch).toHaveBeenCalledWith(advancedFilterDto, 'user123');
      expect(result).toEqual(mockResult);
    });
  });

  describe('getSuggestions', () => {
    const suggestionDto: SearchSuggestionDto = {
      query: 'stel',
      limit: 5,
    };

    it('should return search suggestions', async () => {
      const mockResult = {
        suggestions: [{ text: 'stellar', score: 1.0, source: 'title' }],
      };

      mockSearchService.getSuggestions.mockResolvedValue(mockResult);

      const result = await controller.getSuggestions(suggestionDto);

      expect(searchService.getSuggestions).toHaveBeenCalledWith(suggestionDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getSearchAnalytics', () => {
    const mockRequest = {
      user: { id: 'user123' },
    };

    it('should return search analytics', async () => {
      const mockResult = {
        recentSearches: [],
        popularQueries: [],
      };

      mockSearchService.getSearchAnalytics.mockResolvedValue(mockResult);

      const result = await controller.getSearchAnalytics(mockRequest, '2024-01-01', '2024-01-31');

      expect(searchService.getSearchAnalytics).toHaveBeenCalledWith({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        userId: 'user123',
      });
      expect(result).toEqual(mockResult);
    });

    it('should handle invalid date format', async () => {
      await expect(
        controller.getSearchAnalytics(mockRequest, 'invalid-date', '2024-01-31'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPopularSearchTerms', () => {
    it('should return popular search terms', async () => {
      const mockResult = [
        { query: 'stellar', searchCount: 15 },
        { query: 'blockchain', searchCount: 12 },
      ];

      mockSearchService.getPopularSearchTerms.mockResolvedValue(mockResult);

      const result = await controller.getPopularSearchTerms('10');

      expect(searchService.getPopularSearchTerms).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockResult);
    });

    it('should use default limit when not provided', async () => {
      const mockResult = [];
      mockSearchService.getPopularSearchTerms.mockResolvedValue(mockResult);

      await controller.getPopularSearchTerms();

      expect(searchService.getPopularSearchTerms).toHaveBeenCalledWith(20);
    });
  });

  describe('trackSearchClick', () => {
    const mockRequest = {
      user: { id: 'user123' },
    };

    it('should track search click', async () => {
      mockSearchService.trackSearchClick.mockResolvedValue(undefined);

      const result = await controller.trackSearchClick('search123', 'course456', mockRequest);

      expect(searchService.trackSearchClick).toHaveBeenCalledWith('search123', 'course456');
      expect(result).toEqual({ success: true });
    });

    it('should handle tracking errors', async () => {
      mockSearchService.trackSearchClick.mockRejectedValue(
        new BadRequestException('Search not found'),
      );

      await expect(
        controller.trackSearchClick('invalid', 'course456', mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
