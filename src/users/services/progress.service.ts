import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserProgress } from '../entities/user-progress.entity';
import { Course } from '../../courses/entities/course.entity';
import { Lesson } from '../../lesson/entity/lesson.entity';
import { CourseModule } from '../../courses/entities/course-module.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(UserProgress)
    private readonly progressRepository: Repository<UserProgress>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(CourseModule)
    private readonly moduleRepository: Repository<CourseModule>,
  ) {}

  async updateLessonProgress(
    userId: string,
    courseId: string,
    lessonId: string,
    progressPercentage: number,
    metadata?: any,
  ): Promise<UserProgress> {
    // Validate lesson belongs to course
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['module'],
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.module.courseId !== courseId) {
      throw new BadRequestException('Lesson does not belong to the specified course');
    }

    let progress = await this.progressRepository.findOne({
      where: {
        user: { id: userId },
        course: { id: courseId },
        lesson: { id: lessonId },
      },
    });

    if (!progress) {
      progress = this.progressRepository.create({
        user: { id: userId },
        course: { id: courseId },
        lesson: { id: lessonId },
        module: { id: lesson.module.id },
      });
    }

    progress.progressPercentage = progressPercentage;
    progress.isCompleted = progressPercentage >= 100;
    progress.metadata = metadata;
    progress.lastAccessedAt = new Date();

    if (progress.isCompleted && !progress.completedAt) {
      progress.completedAt = new Date();
    }

    // Update module progress
    await this.updateModuleProgress(userId, courseId, lesson.module.id);

    return await this.progressRepository.save(progress);
  }

  private async updateModuleProgress(
    userId: string,
    courseId: string,
    moduleId: string,
  ): Promise<void> {
    const module = await this.moduleRepository.findOne({
      where: { id: moduleId },
      relations: ['lessons'],
    });

    const progress = await this.progressRepository.find({
      where: {
        user: { id: userId },
        course: { id: courseId },
        module: { id: moduleId },
      },
    });

    const totalLessons = module.lessons.length;
    const completedLessons = progress.filter((p) => p.isCompleted).length;
    const moduleProgress = (completedLessons / totalLessons) * 100;

    // Create or update module-level progress
    let moduleProgressRecord = await this.progressRepository.findOne({
      where: {
        user: { id: userId },
        course: { id: courseId },
        module: { id: moduleId },
        lesson: null,
      },
    });

    if (!moduleProgressRecord) {
      moduleProgressRecord = this.progressRepository.create({
        user: { id: userId },
        course: { id: courseId },
        module: { id: moduleId },
      });
    }

    moduleProgressRecord.progressPercentage = moduleProgress;
    moduleProgressRecord.isCompleted = moduleProgress >= 100;
    moduleProgressRecord.lastAccessedAt = new Date();

    if (moduleProgressRecord.isCompleted && !moduleProgressRecord.completedAt) {
      moduleProgressRecord.completedAt = new Date();
    }

    await this.progressRepository.save(moduleProgressRecord);
  }

  async getCourseProgress(
    userId: string,
    courseId: string,
  ): Promise<{
    overallProgress: number;
    completedLessons: number;
    totalLessons: number;
    moduleProgress: Array<{
      moduleId: string;
      title: string;
      progress: number;
      completedLessons: number;
      totalLessons: number;
      lastAccessedAt: Date;
    }>;
  }> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['modules', 'modules.lessons'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const progress = await this.progressRepository.find({
      where: {
        user: { id: userId },
        course: { id: courseId },
      },
      relations: ['lesson', 'module'],
      order: { lastAccessedAt: 'DESC' },
    });

    const modules = await course.modules;
    const moduleProgress = await Promise.all(
      modules.map(async (module) => {
        const moduleLessons = await this.lessonRepository.find({
          where: { module: { id: module.id } },
        });

        const completedLessons = progress.filter(
          (p) => p.isCompleted && moduleLessons.some((l) => l.id === p.lesson?.id),
        ).length;

        const moduleProgressRecord = progress.find((p) => p.module?.id === module.id && !p.lesson);

        return {
          moduleId: module.id,
          title: module.title,
          progress: moduleProgressRecord?.progressPercentage || 0,
          completedLessons,
          totalLessons: moduleLessons.length,
          lastAccessedAt: moduleProgressRecord?.lastAccessedAt || new Date(),
        };
      }),
    );

    const totalLessons = moduleProgress.reduce((sum, module) => sum + module.totalLessons, 0);
    const completedLessons = moduleProgress.reduce(
      (sum, module) => sum + module.completedLessons,
      0,
    );

    return {
      overallProgress: (completedLessons / totalLessons) * 100,
      completedLessons,
      totalLessons,
      moduleProgress,
    };
  }

  async getUserProgress(userId: string): Promise<
    Array<{
      courseId: string;
      courseTitle: string;
      progress: number;
      lastAccessed: Date;
      completedModules: number;
      totalModules: number;
    }>
  > {
    const progress = await this.progressRepository.find({
      where: { user: { id: userId } },
      relations: ['course', 'module'],
      order: { lastAccessedAt: 'DESC' },
    });

    const courseProgressMap = new Map<
      string,
      {
        courseTitle: string;
        progress: number;
        lastAccessed: Date;
        completedModules: number;
        totalModules: number;
      }
    >();

    // Preload all courses with their modules
    const courseIds = Array.from(new Set(progress.map((p) => p.course?.id).filter(Boolean)));

    const coursesWithModules = await this.courseRepository.find({
      where: { id: In(courseIds) },
      relations: ['modules'],
    });
    const courseModulesMap = new Map<string, number>();
    for (const course of coursesWithModules) {
      const modules = await course.modules;
      courseModulesMap.set(course.id, modules ? modules.length : 0);
    }

    progress.forEach((p) => {
      if (!p.course) return;

      const existing = courseProgressMap.get(p.course.id);
      if (!existing || p.lastAccessedAt > existing.lastAccessed) {
        const moduleProgress = progress.filter(
          (mp) => mp.course?.id === p.course.id && mp.module && !mp.lesson && mp.isCompleted,
        );

        courseProgressMap.set(p.course.id, {
          courseTitle: p.course.title,
          progress: p.progressPercentage,
          lastAccessed: p.lastAccessedAt,
          completedModules: moduleProgress.length,
          totalModules: courseModulesMap.get(p.course.id) || 0,
        });
      }
    });

    return Array.from(courseProgressMap.entries()).map(([courseId, data]) => ({
      courseId,
      ...data,
    }));
  }

  async syncProgress(userId: string, courseId: string): Promise<void> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['modules', 'modules.lessons'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Sync module progress
    const modules = await course.modules;
    for (const module of modules) {
      await this.updateModuleProgress(userId, courseId, module.id);
    }
  }

  /**
   * Learning Analytics: Get strengths, weaknesses, and trends for a user in a course
   */
  async getLearningAnalytics(userId: string, courseId: string) {
    const progress = await this.progressRepository.find({
      where: { user: { id: userId }, course: { id: courseId } },
      relations: ['lesson'],
    });
    const completed = progress.filter((p) => p.isCompleted);
    const avgScore = completed.length
      ? completed.reduce((sum, p) => sum + (p.metadata?.score || 0), 0) / completed.length
      : 0;
    const strengths = completed
      .filter((p) => (p.metadata?.score || 0) >= 80)
      .map((p) => p.lesson?.title || p.lesson?.id);
    const weaknesses = completed
      .filter((p) => (p.metadata?.score || 0) < 50)
      .map((p) => p.lesson?.title || p.lesson?.id);
    return {
      totalLessons: progress.length,
      completedLessons: completed.length,
      avgScore,
      strengths,
      weaknesses,
      progressOverTime: progress.map((p) => ({
        lesson: p.lesson?.title || p.lesson?.id,
        completedAt: p.completedAt,
        score: p.metadata?.score || null,
      })),
    };
  }

  /**
   * Adaptive Learning Path: Recommend next lessons based on performance
   */
  async getAdaptiveNextLessons(userId: string, courseId: string) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['modules', 'modules.lessons'],
    });
    if (!course) throw new NotFoundException('Course not found');
    const modules = await course.modules;
    const allLessons = modules.flatMap((m) => m.lessons);
    const progress = await this.progressRepository.find({
      where: { user: { id: userId }, course: { id: courseId } },
      relations: ['lesson'],
    });
    const completedLessonIds = new Set(
      progress.filter((p) => p.isCompleted).map((p) => p.lesson?.id),
    );
    // Recommend next uncompleted lessons, prioritizing those after weak lessons
    const weakLessons = progress
      .filter((p) => (p.metadata?.score || 0) < 50)
      .map((p) => p.lesson?.id);
    const nextLessons = allLessons.filter((l) => !completedLessonIds.has(l.id));
    // Prioritize lessons in the same module as weak lessons
    const prioritized = nextLessons.sort((a, b) => {
      if (weakLessons.includes(a.id)) return -1;
      if (weakLessons.includes(b.id)) return 1;
      return 0;
    });
    return prioritized.slice(0, 3).map((l) => ({ id: l.id, title: l.title }));
  }

  /**
   * Progress Visualization: Get progress data for charting
   */
  async getProgressVisualization(userId: string, courseId: string) {
    const progress = await this.progressRepository.find({
      where: { user: { id: userId }, course: { id: courseId } },
      order: { completedAt: 'ASC' },
    });
    return progress.map((p) => ({
      lessonId: p.lesson?.id,
      completedAt: p.completedAt,
      progress: p.progressPercentage,
      score: p.metadata?.score || null,
    }));
  }

  /**
   * Learning Outcome Metrics: Mastery, improvement, engagement
   */
  async getLearningOutcomeMetrics(userId: string, courseId: string) {
    const progress = await this.progressRepository.find({
      where: { user: { id: userId }, course: { id: courseId } },
    });
    const completed = progress.filter((p) => p.isCompleted);
    const mastery =
      completed.filter((p) => (p.metadata?.score || 0) >= 80).length / (progress.length || 1);
    const improvement =
      completed.length > 1
        ? (completed[completed.length - 1].metadata?.score || 0) -
          (completed[0].metadata?.score || 0)
        : 0;
    const engagement = progress.length;
    return { mastery, improvement, engagement };
  }
}
