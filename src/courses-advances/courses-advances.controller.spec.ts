import { Test, TestingModule } from '@nestjs/testing';
import { CoursesAdvancesController } from './controllers/courses-advances.controller';
import { CoursesAdvancesService } from './courses-advances.service';

describe('CoursesAdvancesController', () => {
  let controller: CoursesAdvancesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesAdvancesController],
      providers: [CoursesAdvancesService],
    }).compile();

    controller = module.get<CoursesAdvancesController>(CoursesAdvancesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
