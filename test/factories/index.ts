// Shared utilities
export { nextId, resetFactoryCounters } from './shared';
export type { DeepPartial, FactoryFn } from './shared';

// User factories
export {
  createUser,
  createUserData,
  createManyUsers,
  createUserProfile,
  createUserWithProfile,
} from './user.factory';

// Course factories
export {
  createCourse,
  createCourseData,
  createManyCourses,
  createBeginnerCourse,
  createIntermediateCourse,
  createAdvancedCourse,
} from './course.factory';
export type { CourseDifficulty, CourseCategory } from './course.factory';

// Enrollment factories
export {
  createEnrollment,
  createEnrollmentData,
  createManyEnrollments,
  createCompletedEnrollment,
  createDroppedEnrollment,
  createInProgressEnrollment,
} from './enrollment.factory';
export type { EnrollmentStatus, Enrollment } from './enrollment.factory';
