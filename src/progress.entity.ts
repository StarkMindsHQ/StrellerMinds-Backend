import { Injectable } from '@nestjs/common';

@Injectable()
export class ProgressService {
    private userProgress = new Map<number, Set<number>>();
    private courseModules = new Map<number, number>(); // Simulated total module count per course
    private completedCourses = new Set<number>();

    completeLesson(userId: number, lessonId: number, courseId: number) {
        const key = this.getProgressKey(userId, courseId);
        if (!this.userProgress.has(key)) {
            this.userProgress.set(key, new Set());
        }
        this.userProgress.get(key).add(lessonId);

        this.checkAndMarkCourseCompleted(userId, courseId);
    }

    getCompletionPercentage(userId: number, courseId: number): number {
        const key = this.getProgressKey(userId, courseId);
        const totalLessons = this.courseModules.get(courseId) || 0;
        if (!this.userProgress.has(key) || totalLessons === 0) return 0;
        return (this.userProgress.get(key).size / totalLessons) * 100;
    }

    getProgressData(userId: number, courseId: number) {
        const key = this.getProgressKey(userId, courseId);
        const totalLessons = this.courseModules.get(courseId) || 0;
        return {
            userId,
            courseId,
            completedLessons: Array.from(this.userProgress.get(key) || []),
            completionPercentage: this.getCompletionPercentage(userId, courseId),
        };
    }

    setCourseModules(courseId: number, totalModules: number) {
        this.courseModules.set(courseId, totalModules);
    }

    private getProgressKey(userId: number, courseId: number): number {
        // Create a composite key from userId and courseId for tracking
        return parseInt(`${userId}${courseId}`);
    }

    private checkAndMarkCourseCompleted(userId: number, courseId: number) {
        const percentage = this.getCompletionPercentage(userId, courseId);
        if (percentage === 100 && !this.completedCourses.has(courseId)) {
            this.completedCourses.add(courseId);
            this.issueCertificate(userId, courseId);
            this.emitCourseCompletedEvent(userId, courseId);
        }
    }

    private issueCertificate(userId: number, courseId: number) {
        console.log(`🎉 Certificate issued for User ${userId} on Course ${courseId}`);
    }

    private emitCourseCompletedEvent(userId: number, courseId: number) {
        console.log(`📢 Course ${courseId} completed by User ${userId}`);
    }
}
