import { Test, TestingModule } from '@nestjs/testing';
import { CourseService } from './course.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './course.entity';

describe('CourseService', () => {
  let service: CourseService;
  let repo: Repository<Course>;

  const mockCourse: Course = {
    id: 'some-uuid',
    title: 'Test Course',
    description: 'A course description',
    status: 'draft',
    enrollmentCount: 0,
    completionCount: 0,
    createdAt: new Date(),
  };

  const mockRepo = {
    create: jest.fn().mockImplementation((dto) => ({ ...dto })),
    save: jest.fn().mockResolvedValue(mockCourse),
    find: jest.fn().mockResolvedValue([mockCourse]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        {
          provide: getRepositoryToken(Course),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
    repo = module.get<Repository<Course>>(getRepositoryToken(Course));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a course', async () => {
    const dto = { title: 'Test Course', description: 'A course description' };
    const result = await service.create(dto);
    expect(mockRepo.create).toHaveBeenCalledWith(dto);
    expect(mockRepo.save).toHaveBeenCalled();
    expect(result).toEqual(mockCourse);
  });

  it('should find all courses', async () => {
    const result = await service.findAll();
    expect(repo.find).toHaveBeenCalled();
    expect(result).toEqual([mockCourse]);
  });
});
