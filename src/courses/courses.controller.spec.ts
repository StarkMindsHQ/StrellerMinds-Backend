import { Test, TestingModule } from '@nestjs/testing';
import { CourseController } from './courses.controller';
import { CourseService } from './courses.service';

describe('CourseController', () => {
  let controller: CourseController;
  let service: CourseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [
        {
          provide: CourseService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
            remove: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    controller = module.get<CourseController>(CourseController);
    service = module.get<CourseService>(CourseService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
