import { Test, TestingModule } from '@nestjs/testing';
import { GradingController } from './grading.controller';
import { GradingService } from '../services/grading.service';
import { CreateGradeDto } from '../dto/create-grade.dto';
import { UpdateGradeDto } from '../dto/update-grade.dto';

describe('GradingController', () => {
  let controller: GradingController;
  let service: GradingService;

  const mockService = {
    gradeAssignment: jest.fn(),
    updateGrade: jest.fn(),
    getGradingHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GradingController],
      providers: [{ provide: GradingService, useValue: mockService }],
    }).compile();

    controller = module.get<GradingController>(GradingController);
    service = module.get<GradingService>(GradingService);
  });

  it('should call gradingService.gradeAssignment', async () => {
    const dto: CreateGradeDto = { numericGrade: 85, feedback: 'Good work' };
    const req = { user: { id: 1 } };

    await controller.gradeAssignment(2, 5, dto, req);
    expect(service.gradeAssignment).toHaveBeenCalledWith(req.user, 2, 5, dto);
  });

  it('should call gradingService.updateGrade', async () => {
    const dto: UpdateGradeDto = { feedback: 'Updated' };
    const req = { user: { id: 1 } };

    await controller.updateGrade(1, dto, req);
    expect(service.updateGrade).toHaveBeenCalledWith(req.user, 1, dto);
  });

  it('should call gradingService.getGradingHistory', async () => {
    const req = { user: { id: 1 } };
    await controller.getGradingHistory(req);
    expect(service.getGradingHistory).toHaveBeenCalledWith(req.user);
  });
});
