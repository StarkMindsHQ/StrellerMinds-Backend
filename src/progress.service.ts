import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  private userProgress = new Map<number, Map<number, Set<number>>>(); // userId -> courseId -> Set<lessonId>
  private courseModuleCount = new Map<number, number>(); // courseId -> totalModules
  private completedCourses = new Set<string>(); // "userId:courseId"

  // Mark lesson as completed and check for course completion
  completeLesson(userId: number, lessonId: number, courseId: number) {
    if (!this.userProgress.has(userId)) {
      this.userProgress.set(userId, new Map());
    }

    const userCourses = this.userProgress.get(userId);

    if (!userCourses.has(courseId)) {
      userCourses.set(courseId, new Set());
    }

    userCourses.get(courseId).add(lessonId);

    // Check if course is now completed
    this.markCourseCompleted(userId, courseId);
  }

  // Define how many modules a course has
  setCourseModules(courseId: number, totalModules: number) {
    this.courseModuleCount.set(courseId, totalModules);
  }

  // Calculate progress percentage for a course
  getCompletionPercentage(userId: number, courseId: number): number {
    const completed = this.userProgress.get(userId)?.get(courseId)?.size || 0;
    const total = this.courseModuleCount.get(courseId) || 0;

    return total === 0 ? 0 : (completed / total) * 100;
  }

  // Get all progress data
  getProgressData(userId: number, courseId: number) {
    const completedLessons = Array.from(
      this.userProgress.get(userId)?.get(courseId) || []
    );
    const completionPercentage = this.getCompletionPercentage(userId, courseId);
    const isCompleted = this.completedCourses.has(`${userId}:${courseId}`);

    return {
      userId,
      courseId,
      completedLessons,
      completionPercentage,
      isCompleted,
    };
  }

  // Check & mark course as completed
  private markCourseCompleted(userId: number, courseId: number) {
    const key = `${userId}:${courseId}`;
    const completion = this.getCompletionPercentage(userId, courseId);

    if (completion === 100 && !this.completedCourses.has(key)) {
      this.completedCourses.add(key);
      this.logger.log(`✅ Course ${courseId} marked as completed for user ${userId}`);

      this.issueCertificate(userId, courseId);
      this.emitCourseCompletionEvent(userId, courseId);
    }
  }

  // Simulate certificate issuance
  private issueCertificate(userId: number, courseId: number) {
    this.logger.log(`🎓 Certificate issued to user ${userId} for course ${courseId}`);
  }

  // Emit an event log
  private emitCourseCompletionEvent(userId: number, courseId: number) {
    this.logger.log(`📢 Event: CourseCompleted { userId: ${userId}, courseId: ${courseId} }`);
  }
}
