import { Test, TestingModule } from '@nestjs/testing';
import { CoursesAdvancesController } from './courses-advances.controller';
import { CoursesAdvancesService } from './courses-advances.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('CoursesAdvancesController', () => {
  let controller: CoursesAdvancesController;
  let service: CoursesAdvancesService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getCoursesByCategory: jest.fn(),
    getPopularCourses: jest.fn(),
    searchCourses: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesAdvancesController],
      providers: [
        {
          provide: CoursesAdvancesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CoursesAdvancesController>(CoursesAdvancesController);
    service = module.get<CoursesAdvancesService>(CoursesAdvancesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.create', async () => {
    const dto = { title: 'Test' } as any;
    mockService.create.mockResolvedValue({ id: '1', ...dto });
    const result = await controller.create(dto, 'user1');
    expect(result).toEqual({ id: '1', ...dto });
    expect(mockService.create).toHaveBeenCalledWith(dto, 'user1');
  });

  it('should call service.findAll', async () => {
    mockService.findAll.mockResolvedValue([]);
    const result = await controller.findAll('user1');
    expect(result).toEqual([]);
    expect(mockService.findAll).toHaveBeenCalledWith('user1');
  });

  it('should call service.findOne', async () => {
    const course = { id: '1' };
    mockService.findOne.mockResolvedValue(course);
    const result = await controller.findOne('1');
    expect(result).toEqual(course);
    expect(mockService.findOne).toHaveBeenCalledWith('1');
  });

  it('should call service.update', async () => {
    const course = { id: '1', title: 'Updated' };
    mockService.update.mockResolvedValue(course);
    const result = await controller.update('1', { title: 'Updated' } as any, 'user1');
    expect(result).toEqual(course);
    expect(mockService.update).toHaveBeenCalledWith('1', { title: 'Updated' }, 'user1');
  });

  it('should call service.remove', async () => {
    mockService.remove.mockResolvedValue(undefined);
    const result = await controller.remove('1', 'user1');
    expect(result).toBeUndefined();
    expect(mockService.remove).toHaveBeenCalledWith('1', 'user1');
  });
});
