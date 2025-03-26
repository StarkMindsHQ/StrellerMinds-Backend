import { Test, TestingModule } from '@nestjs/testing';
import { CatogoryService } from './catogory.service';

describe('CatogoryService', () => {
  let service: CatogoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatogoryService],
    }).compile();

    service = module.get<CatogoryService>(CatogoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
