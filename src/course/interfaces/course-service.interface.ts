import { Course } from '../entities/course.entity';
import { CreateCourseDto } from '../dto/create-course.dto';

// Define Module and Lesson interfaces if they don't exist in entities
interface Module {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  lessons?: Lesson[];
  createdAt: Date;
  updatedAt: Date;
}

interface Lesson {
  id: string;
  title: string;
  content?: string;
  moduleId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define DTOs inline since they don't exist
interface CreateModuleDto {
  title: string;
  description?: string;
}

interface CreateLessonDto {
  title: string;
  content?: string;
}

/**
 * Interface for Course Service operations
 */
export interface ICourseService {
  /**
   * Create a new course
   */
  createCourse(createCourseDto: CreateCourseDto): Promise<Course>;

  /**
   * Get course by ID
   */
  getCourseById(id: string): Promise<Course | null>;

  /**
   * Get all courses with filtering
   */
  getAllCourses(filters?: {
    status?: string;
    instructorId?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Course[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Update course information
   */
  updateCourse(id: string, updateData: Partial<Course>): Promise<Course>;

  /**
   * Delete course (soft delete)
   */
  deleteCourse(id: string): Promise<void>;

  /**
   * Add module to course
   */
  addModule(courseId: string, createModuleDto: CreateModuleDto): Promise<Module>;

  /**
   * Add lesson to module
   */
  addLesson(moduleId: string, createLessonDto: CreateLessonDto): Promise<Lesson>;

  /**
   * Enroll student in course
   */
  enroll(studentId: string, courseId: string): Promise<any>;

  /**
   * Unenroll student from course
   */
  unenroll(studentId: string, courseId: string): Promise<void>;

  /**
   * Publish course
   */
  publishCourse(courseId: string): Promise<Course>;

  /**
   * Unpublish course
   */
  unpublishCourse(courseId: string): Promise<Course>;

  /**
   * Get course enrollment statistics
   */
  getEnrollmentStats(courseId: string): Promise<{
    totalEnrolled: number;
    activeStudents: number;
    completedStudents: number;
    dropRate: number;
  }>;

  /**
   * Get course progress for student
   */
  getStudentProgress(
    studentId: string,
    courseId: string,
  ): Promise<{
    completedLessons: number;
    totalLessons: number;
    progressPercentage: number;
    estimatedCompletion: Date;
  }>;

  /**
   * Validate course data
   */
  validateCourseData(data: any, operation: 'create' | 'update'): Promise<void>;

  /**
   * Check if user is enrolled in course
   */
  isUserEnrolled(userId: string, courseId: string): Promise<boolean>;

  /**
   * Get courses by instructor
   */
  getCoursesByInstructor(instructorId: string): Promise<Course[]>;

  /**
   * Duplicate course
   */
  duplicateCourse(courseId: string, newTitle: string): Promise<Course>;

  /**
   * Export course data
   */
  exportCourseData(courseId: string): Promise<any>;

  /**
   * Import course data
   */
  importCourseData(courseData: any): Promise<Course>;
}
