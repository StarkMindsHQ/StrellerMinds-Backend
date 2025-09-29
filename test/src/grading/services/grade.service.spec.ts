// grades.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';

import { getRepositoryToken } from '@nestjs/typeorm';
import { Grade } from '../entities/grade-entity';
import { NotificationsService } from 'src/notification/notification.service';
import { Repository } from 'typeorm';
import { GradingService } from './grading.service';

describe('GradesService', () => {
  let service: GradingService;
  let gradeRepository: Repository<Grade>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradingService,
        {
          provide: getRepositoryToken(Grade),
          useClass: Repository,
        },
        {
          provide: NotificationsService,
          useValue: { notifyStudent: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<GradingService>(GradingService);
    gradeRepository = module.get<Repository<Grade>>(getRepositoryToken(Grade));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a grade and notify student', async () => {
    const saveSpy = jest
      .spyOn(gradeRepository, 'save')
      .mockResolvedValueOnce({ id: 1 } as any);
    await service.createGrade(1, { grade: 95, feedback: 'Great job!' }, {
      id: 2,
      role: 'mentor',
    } as any);

    expect(saveSpy).toHaveBeenCalled();
  });
});
