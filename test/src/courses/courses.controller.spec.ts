import { Test, TestingModule } from '@nestjs/testing';
import { CourseController } from './courses.controller';
import { CourseService } from './courses.service';

describe('CourseController', () => {
  let controller: CourseController;
  let service: CourseService;

  const mockCourseService = {
    findAll: jest.fn().mockResolvedValue([{ id: 1, title: 'Test Course' }]),
    findOne: jest.fn().mockResolvedValue({ id: 1, title: 'Test Course' }),
    create: jest.fn().mockResolvedValue({ id: 2, title: 'New Course' }),
    update: jest.fn().mockResolvedValue({ id: 1, title: 'Updated Course' }),
    remove: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [
        { provide: CourseService, useValue: mockCourseService },
      ],
    }).compile();

    controller = module.get<CourseController>(CourseController);
    service = module.get<CourseService>(CourseService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all courses', async () => {
    const result = await controller.findAll();
    expect(result).toEqual([{ id: 1, title: 'Test Course' }]);
    expect(mockCourseService.findAll).toHaveBeenCalled();
  });

  it('should return a course by id', async () => {
    const result = await controller.findOne(1);
    expect(result).toEqual({ id: 1, title: 'Test Course' });
    expect(mockCourseService.findOne).toHaveBeenCalledWith(1);
  });

  it('should create a new course', async () => {
    const result = await controller.create({ title: 'New Course' });
    expect(result).toEqual({ id: 2, title: 'New Course' });
    expect(mockCourseService.create).toHaveBeenCalledWith({ title: 'New Course' });
  });

  it('should update a course', async () => {
    const result = await controller.update(1, { title: 'Updated Course' });
    expect(result).toEqual({ id: 1, title: 'Updated Course' });
    expect(mockCourseService.update).toHaveBeenCalledWith(1, { title: 'Updated Course' });
  });

  it('should remove a course', async () => {
    const result = await controller.remove(1);
    expect(result).toBe(true);
    expect(mockCourseService.remove).toHaveBeenCalledWith(1);
  });
});
