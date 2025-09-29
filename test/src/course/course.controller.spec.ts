import { Test, TestingModule } from '@nestjs/testing';
import { CoursesController } from './courses.controller';
import { CourseService } from './course.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

const mockCourse = {
  id: '1',
  title: 'Test Course',
  description: 'Description',
  difficulty: 'Beginner',
  modules: [],
};

describe('CoursesController', () => {
  let controller: CoursesController;
  let service: CourseService;

  const mockCourseService = {
    create: jest.fn().mockResolvedValue(mockCourse),
    findAll: jest.fn().mockResolvedValue([mockCourse]),
    findOne: jest.fn().mockResolvedValue(mockCourse),
    update: jest.fn().mockResolvedValue(mockCourse),
    remove: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [{ provide: CourseService, useValue: mockCourseService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CoursesController>(CoursesController);
    service = module.get<CourseService>(CourseService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a course', async () => {
    const dto = { ...mockCourse };
    const result = await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockCourse);
  });

  it('should return all courses', async () => {
    const result = await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
    expect(result).toEqual([mockCourse]);
  });

  it('should return one course by id', async () => {
    const result = await controller.findOne('1');
    expect(service.findOne).toHaveBeenCalledWith('1');
    expect(result).toEqual(mockCourse);
  });

  it('should update a course', async () => {
    const dto = { title: 'Updated Title' };
    const result = await controller.update('1', dto);
    expect(service.update).toHaveBeenCalledWith('1', dto);
    expect(result).toEqual(mockCourse);
  });

  it('should delete a course', async () => {
    const result = await controller.remove('1');
    expect(service.remove).toHaveBeenCalledWith('1');
    expect(result).toEqual({ affected: 1 });
  });
});
