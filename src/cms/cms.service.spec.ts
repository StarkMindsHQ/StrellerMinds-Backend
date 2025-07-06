import { Test, TestingModule } from '@nestjs/testing';
import { CmsService } from './cms.service';

describe('CmsService', () => {
  let service: CmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CmsService],
    }).compile();

    service = module.get<CmsService>(CmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
