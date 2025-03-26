import { Test, TestingModule } from '@nestjs/testing';
import { CatogoryController } from './catogory.controller';
import { CatogoryService } from './catogory.service';

describe('CatogoryController', () => {
  let controller: CatogoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatogoryController],
      providers: [CatogoryService],
    }).compile();

    controller = module.get<CatogoryController>(CatogoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
