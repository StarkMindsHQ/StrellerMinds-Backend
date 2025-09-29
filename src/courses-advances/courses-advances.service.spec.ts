import { Test, TestingModule } from '@nestjs/testing';
import { CoursesAdvancesService } from './services/courses-advances.service';
import { Repository } from 'typeorm';
import { CoursesAdvance } from './entities/courses-advance.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('CoursesAdvancesService', () => {
  let service: CoursesAdvancesService;
  let repo: jest.Mocked<Repository<CoursesAdvance>>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesAdvancesService,
        { provide: getRepositoryToken(CoursesAdvance), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<CoursesAdvancesService>(CoursesAdvancesService);
    repo = module.get(getRepositoryToken(CoursesAdvance));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a course', async () => {
    const dto = { title: 'Test Course' } as any;
    mockRepository.create.mockReturnValue(dto);
    mockRepository.save.mockResolvedValue({ id: '1', ...dto });

    const result = await service.create(dto, 'user1');

    expect(mockRepository.create).toHaveBeenCalledWith({ ...dto, instructorId: 'user1' });
    expect(mockRepository.save).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: '1', ...dto });
  });

  it('should throw NotFoundException if course not found', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
  });

  it('should return course if found', async () => {
    const course = { id: '1', instructorId: 'user1' } as any;
    mockRepository.findOne.mockResolvedValue(course);

    const result = await service.findOne('1');
    expect(result).toEqual(course);
  });

  it('should throw ForbiddenException if user is not instructor on update', async () => {
    const course = { id: '1', instructorId: 'user1' } as any;
    mockRepository.findOne.mockResolvedValue(course);

    await expect(service.update('1', { title: 'X' }, 'user2')).rejects.toThrow(ForbiddenException);
  });

  it('should update course if user is instructor', async () => {
    const course = { id: '1', instructorId: 'user1', title: 'Old' } as any;
    mockRepository.findOne.mockResolvedValue(course);
    mockRepository.save.mockResolvedValue({ ...course, title: 'New' });

    const result = await service.update('1', { title: 'New' }, 'user1');
    expect(result.title).toBe('New');
  });

  it('should remove course if user is instructor', async () => {
    const course = { id: '1', instructorId: 'user1' } as any;
    mockRepository.findOne.mockResolvedValue(course);
    mockRepository.remove.mockResolvedValue(course);

    await service.remove('1', 'user1');
    expect(mockRepository.remove).toHaveBeenCalledWith(course);
  });
});
