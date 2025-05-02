import { ProgressService } from '../src/progress/progress.service';

describe('ProgressService', () => {
  let service: ProgressService;

  beforeEach(() => {
    service = new ProgressService();
  });

  it('should calculate 100% when all modules are complete', () => {
    const userId = 1;
    const courseId = 101;

    service.setCourseModules(courseId, 2);
    service.completeLesson(userId, 1, courseId);
    service.completeLesson(userId, 2, courseId);

    const progress = service.getProgressData(userId, courseId);
    expect(progress.completionPercentage).toBe(100);
    expect(progress.isCompleted).toBe(true);
  });

  it('should not mark course complete if not all modules are done', () => {
    const userId = 2;
    const courseId = 102;

    service.setCourseModules(courseId, 3);
    service.completeLesson(userId, 1, courseId);

    const progress = service.getProgressData(userId, courseId);
    expect(progress.completionPercentage).toBeLessThan(100);
    expect(progress.isCompleted).toBe(false);
  });
});
