import { Course } from '../../src/course/entities/course.entity';
import { nextId, DeepPartial, FactoryFn } from './shared';

// ──────────────────────────────────────────────
// Course difficulty enum (mirrors API spec)
// ──────────────────────────────────────────────

export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type CourseCategory =
  | 'blockchain'
  | 'smart-contracts'
  | 'defi'
  | 'nft'
  | 'web3'
  | 'solidity'
  | 'rust'
  | 'cryptography';

// ──────────────────────────────────────────────
// Course factory
// ──────────────────────────────────────────────

const COURSE_TITLES: Record<CourseDifficulty, (n: number) => string> = {
  beginner: (n) => `Intro to Blockchain ${n}`,
  intermediate: (n) => `Building Smart Contracts ${n}`,
  advanced: (n) => `Advanced DeFi Protocols ${n}`,
};

const CATEGORIES: CourseCategory[] = [
  'blockchain',
  'smart-contracts',
  'defi',
  'nft',
  'web3',
  'solidity',
  'rust',
  'cryptography',
];

const defaultCourse = {
  title: (n: number) => COURSE_TITLES.beginner(n),
  description: (n: number) =>
    `Comprehensive course covering fundamentals and practical applications. Edition ${n}.`,
  category: (n: number) => CATEGORIES[(n - 1) % CATEGORIES.length],
  difficulty: 'beginner' as CourseDifficulty,
  price: 49.99,
  duration: 10,
  isActive: true,
};

/**
 * Create a Course entity instance with auto-generated unique values.
 * Pass a partial override object to customize specific fields.
 *
 * @example
 * const course = createCourse({ title: 'My Custom Course' });
 * const advanced = createCourse({ difficulty: 'advanced', price: 199.99 });
 */
export const createCourse: FactoryFn<Course> = (overrides?: DeepPartial<Course>): Course => {
  const n = nextId('course');
  return Object.assign(new Course(), {
    title: defaultCourse.title(n),
    description: defaultCourse.description(n),
    isActive: defaultCourse.isActive,
    ...overrides,
  });
};

/**
 * Create a plain object representation of a course (no class instance).
 * Includes the extended fields from the API spec that the entity
 * doesn't yet store (category, difficulty, price, duration).
 * Useful for POST request payloads.
 */
export const createCourseData = (
  overrides?: DeepPartial<
    Omit<Course, 'id' | 'createdAt' | 'updatedAt'> & {
      category: string;
      difficulty: CourseDifficulty;
      price: number;
      duration: number;
    }
  >,
) => {
  const n = nextId('course');
  return {
    title: defaultCourse.title(n),
    description: defaultCourse.description(n),
    category: defaultCourse.category(n),
    difficulty: defaultCourse.difficulty,
    price: defaultCourse.price,
    duration: defaultCourse.duration,
    isActive: defaultCourse.isActive,
    ...overrides,
  };
};

/**
 * Build many courses at once. Each gets a unique counter.
 * Optionally pass an array of partial overrides.
 */
export const createManyCourses = (
  count: number,
  overridesArray?: DeepPartial<Course>[],
): Course[] => {
  const courses: Course[] = [];
  for (let i = 0; i < count; i++) {
    courses.push(createCourse(overridesArray?.[i]));
  }
  return courses;
};

/**
 * Create a course pre-configured as a beginner course.
 */
export const createBeginnerCourse: FactoryFn<Course> = (overrides?: DeepPartial<Course>) =>
  createCourse({ title: `Beginner Course ${nextId('course')}`, ...overrides });

/**
 * Create a course pre-configured as an intermediate course.
 */
export const createIntermediateCourse: FactoryFn<Course> = (overrides?: DeepPartial<Course>) =>
  createCourse({
    title: `Intermediate Course ${nextId('course')}`,
    ...overrides,
  });

/**
 * Create a course pre-configured as an advanced course.
 */
export const createAdvancedCourse: FactoryFn<Course> = (overrides?: DeepPartial<Course>) =>
  createCourse({
    title: `Advanced Course ${nextId('course')}`,
    ...overrides,
  });
