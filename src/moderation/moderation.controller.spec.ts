import { Test, TestingModule } from '@nestjs/testing';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

describe('ModerationController', () => {
  let controller: ModerationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModerationController],
      providers: [ModerationService],
    }).compile();

    controller = module.get<ModerationController>(ModerationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
