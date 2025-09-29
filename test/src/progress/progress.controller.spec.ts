import { Test, TestingModule } from '@nestjs/testing';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

describe('ProgressController', () => {
  let controller: ProgressController;
  let service: ProgressService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressController],
      providers: [ProgressService],
    }).compile();

    controller = module.get<ProgressController>(ProgressController);
    service = module.get<ProgressService>(ProgressService);
  });

  it('should call completeLesson and return message', () => {
    const completeSpy = jest.spyOn(service, 'completeLesson');
    const result = controller.completeLesson(1, 101);
    expect(completeSpy).toHaveBeenCalledWith(1, 101);
    expect(result).toEqual({ message: 'Lesson marked as completed' });
  });

  it('should get progress data for user', () => {
    const mockProgress = {
      userId: 1,
      completedLessons: [101, 102],
      completionPercentage: 66.7,
    };
    jest.spyOn(service, 'getProgressData').mockReturnValue(mockProgress);
    const result = controller.getUserProgress(1, 3);
    expect(result).toEqual(mockProgress);
    expect(service.getProgressData).toHaveBeenCalledWith(1, 3);
  });
});
