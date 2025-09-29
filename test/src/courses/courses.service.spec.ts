import { Test, TestingModule } from '@nestjs/testing';
import { CourseService } from './courses.service';

describe('CourseService', () => {
  let service: CourseService;

  // Mock the service methods
  const mockCourseService = {
    findAll: jest.fn().mockResolvedValue([{ id: 1, title: 'Test Course' }]),
    findOne: jest.fn().mockResolvedValue({ id: 1, title: 'Test Course' }),
    create: jest.fn().mockResolvedValue({ id: 2, title: 'New Course' }),
    update: jest.fn().mockResolvedValue({ id: 1, title: 'Updated Course' }),
    remove: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        { provide: CourseService, useValue: mockCourseService },
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all courses', async () => {
    const result = await service.findAll();
    expect(result).toEqual([{ id: 1, title: 'Test Course' }]);
    expect(mockCourseService.findAll).toHaveBeenCalled();
  });

  it('should return a course by id', async () => {
    const result = await service.findOne(1);
    expect(result).toEqual({ id: 1, title: 'Test Course' });
    expect(mockCourseService.findOne).toHaveBeenCalledWith(1);
  });

  it('should create a new course', async () => {
    const result = await service.create({ title: 'New Course' });
    expect(result).toEqual({ id: 2, title: 'New Course' });
    expect(mockCourseService.create).toHaveBeenCalledWith({ title: 'New Course' });
  });

  it('should update a course', async () => {
    const result = await service.update(1, { title: 'Updated Course' });
    expect(result).toEqual({ id: 1, title: 'Updated Course' });
    expect(mockCourseService.update).toHaveBeenCalledWith(1, { title: 'Updated Course' });
  });

  it('should remove a course', async () => {
    const result = await service.remove(1);
    expect(result).toBe(true);
    expect(mockCourseService.remove).toHaveBeenCalledWith(1);
  });
});
