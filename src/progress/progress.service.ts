import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { UserProgress } from 'src/users/entities/user-progress.entity';
import { User } from 'src/users/entities/user.entity';
import { Course } from 'src/courses/entities/course.entity';
import { Lesson } from 'src/lesson/enitity/lesson.entity';
import { UpdateProgressDto } from '../progress/dtos/update-lesson-progress.dto';
import { Module } from 'src/module/entities/module.entity';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(UserProgress)
    private userProgressRepository: Repository<UserProgress>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(Module)
    private moduleRepository: Repository<Module>,
  ) {}

  /**
   * Update or create a lesson progress entry
   */
  async updateLessonProgress(updateProgressDto: UpdateProgressDto): Promise<UserProgress> {
    const { userId, courseId, lessonId, isCompleted } = updateProgressDto;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }
    
    let progress = await this.userProgressRepository.findOne({
      where: {
        user: { id: userId },
        course: { id: courseId },
        lesson: { id: lessonId },
      },
      relations: ['user', 'course', 'lesson'],
    });
    
    if (!progress) {
      progress = this.userProgressRepository.create({
        user,
        course,
        lesson,
        isCompleted: false,
        progressPercentage: 0,
      });
    }

    if (isCompleted !== undefined) {
      progress.isCompleted = isCompleted;
    }

    const savedProgress = await this.userProgressRepository.save(progress);

    await this.updateCourseProgressPercentage(userId, courseId);

    return savedProgress;
  }

  /**
   * Calculate and update course completion percentage
   */
  async updateCourseProgressPercentage(userId: string, courseId: string): Promise<void> {
    const courseLessons = await this.getAllCourseLessons(courseId);
    const totalLessons = courseLessons.length;

    if (totalLessons === 0) {
      return;
    }
    
    const completedLessons = await this.userProgressRepository.count({
      where: {
        user: { id: userId },
        course: { id: courseId },
        isCompleted: true,
      },
    });

    const progressPercentage = (completedLessons / totalLessons) * 100;
    
    let courseProgress = await this.userProgressRepository.findOne({
      where: {
        user: { id: userId },
        course: { id: courseId },
        lesson: null,
      },
    });

    if (!courseProgress) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const course = await this.courseRepository.findOne({ where: { id: courseId } });

      courseProgress = this.userProgressRepository.create({
        user,
        course,
        lesson: null,
        progressPercentage: 0,
        isCompleted: false,
      });
    }

    courseProgress.progressPercentage = progressPercentage;
    
    courseProgress.isCompleted = completedLessons === totalLessons;

    await this.userProgressRepository.save(courseProgress);
  }

  /**
   * Get all lessons for a course
   */
  private async getAllCourseLessons(courseId: string): Promise<Lesson[]> {
    const modules = await this.moduleRepository.find({
      where: { course: { id: courseId } },
      relations: ['lessons'],
    });

    const lessons: Lesson[] = [];
    modules.forEach(module => {
      if (module.lessons) {
        lessons.push(...module.lessons);
      }
    });

    return lessons;
  }

  /**
   * Get progress for a specific course
   */
  async getCourseProgress(userId: string, courseId: string): Promise<UserProgress> {
    const courseProgress = await this.userProgressRepository.findOne({
      where: {
        user: { id: userId },
        course: { id: courseId },
        lesson: null,
      },
    });

    if (!courseProgress) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const course = await this.courseRepository.findOne({ where: { id: courseId } });

      if (!user || !course) {
        throw new NotFoundException('User or course not found');
      }
      
      const newProgress = this.userProgressRepository.create({
        user,
        course,
        progressPercentage: 0,
        isCompleted: false,
      });

      return this.userProgressRepository.save(newProgress);
    }

    return courseProgress;
  }

  /**
   * Get progress for all lessons in a course
   */
  async getCourseLessonsProgress(userId: string, courseId: string): Promise<UserProgress[]> {
    return this.userProgressRepository.find({
      where: {
        user: { id: userId },
        course: { id: courseId },
        lesson: { id: Not(null) },
      },
      relations: ['lesson'],
    });
  }

  /**
   * Update multiple lessons progress at once
   */
  async updateMultipleLessonsProgress(
    userId: string,
    courseId: string,
    lessonIds: string[],
    isCompleted: boolean,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }
    
    for (const lessonId of lessonIds) {
      const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });
      if (!lesson) {
        console.warn(`Lesson with ID ${lessonId} not found, skipping`);
        continue;
      }
      
      let progress = await this.userProgressRepository.findOne({
        where: {
          user: { id: userId },
          course: { id: courseId },
          lesson: { id: lessonId },
        },
      });

      if (!progress) {
        progress = this.userProgressRepository.create({
          user,
          course,
          lesson,
          progressPercentage: 0,
          isCompleted: false,
        });
      }
      
      progress.isCompleted = isCompleted;
      await this.userProgressRepository.save(progress);
    }

    await this.updateCourseProgressPercentage(userId, courseId);
  }

  /**
   * Get a summary of user achievement statistics
   */
  async getUserAchievementStats(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    const courseProgress = await this.userProgressRepository.find({
      where: {
        user: { id: userId },
        lesson: null,
      },
      relations: ['course'],
    });
    
    const completedCourses = courseProgress.filter(progress => progress.isCompleted).length;
    
    const averageProgress = courseProgress.length > 0
      ? courseProgress.reduce((sum, progress) => sum + Number(progress.progressPercentage), 0) / courseProgress.length
      : 0;

    return {
      totalCourses: courseProgress.length,
      completedCourses,
      averageProgress: parseFloat(averageProgress.toFixed(2)),
      inProgressCourses: courseProgress.length - completedCourses,
    };
  }
}