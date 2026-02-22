import { Test, TestingModule } from '@nestjs/testing';
import { CoreController } from './core.controller';
import { CoreService } from './core.service';

describe('CoreController', () => {
  let controller: CoreController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoreController],
      providers: [CoreService],
    }).compile();

    controller = module.get<CoreController>(CoreController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
