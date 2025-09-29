import { Test, TestingModule } from '@nestjs/testing';
import { GdprController } from './gdpr.controller';
import { GdprService } from './gdpr.service';

describe('GdprController', () => {
  let controller: GdprController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GdprController],
      providers: [GdprService],
    }).compile();

    controller = module.get<GdprController>(GdprController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
