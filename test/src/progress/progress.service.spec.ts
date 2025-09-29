import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  let service: ProgressService;

  beforeEach(() => {
    service = new ProgressService();
  });

  it('should mark a lesson as completed for a user', () => {
    service.completeLesson(1, 101);
    const progress = service.getProgressData(1, 10);
    expect(progress.completedLessons).toContain(101);
  });

  it('should not throw when marking multiple lessons', () => {
    service.completeLesson(1, 101);
    service.completeLesson(1, 102);
    const progress = service.getProgressData(1, 10);
    expect(progress.completedLessons).toEqual(expect.arrayContaining([101, 102]));
  });

  it('should return 0% for users with no progress', () => {
    const percentage = service.getCompletionPercentage(99, 10);
    expect(percentage).toBe(0);
  });

  it('should return correct completion percentage', () => {
    service.completeLesson(2, 201);
    service.completeLesson(2, 202);
    const percentage = service.getCompletionPercentage(2, 4);
    expect(percentage).toBe(50);
  });

  it('should return progress data with userId and percentage', () => {
    service.completeLesson(3, 301);
    const progress = service.getProgressData(3, 5);
    expect(progress.userId).toBe(3);
    expect(progress.completedLessons).toEqual([301]);
    expect(progress.completionPercentage).toBe(20);
  });
});
