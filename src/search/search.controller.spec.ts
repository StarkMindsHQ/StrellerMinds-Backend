import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

describe('SearchController', () => {
  let controller: SearchController;
  let searchService: jest.Mocked<SearchService>;

  beforeEach(async () => {
    const mockSearchService = {
      search: jest.fn(),
      autoComplete: jest.fn(),
      getAnalytics: jest.fn(),
      indexContent: jest.fn(),
      updateAnalytics: jest.fn(),
    } as any;

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
    searchService = module.get<SearchService>(SearchService) as jest.Mocked<SearchService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
