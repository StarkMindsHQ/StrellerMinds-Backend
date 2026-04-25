import { nextId, DeepPartial, FactoryFn } from './shared';

// ──────────────────────────────────────────────
// Enrollment status enum (mirrors API spec)
// ──────────────────────────────────────────────

export type EnrollmentStatus = 'active' | 'completed' | 'dropped';

// ──────────────────────────────────────────────
// Enrollment interface (mirrors API spec — no entity exists yet)
// ──────────────────────────────────────────────

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  enrolledAt: Date;
  completedAt: Date | null;
  progress: number;
}

// ──────────────────────────────────────────────
// Enrollment factory
// ──────────────────────────────────────────────

/**
 * Create an Enrollment object with auto-generated unique values.
 * `userId` and `courseId` must be provided via overrides.
 *
 * @example
 * const enrollment = createEnrollment({
 *   userId: savedUser.id,
 *   courseId: savedCourse.id,
 * });
 */
export const createEnrollment: FactoryFn<Enrollment> = (
  overrides?: DeepPartial<Enrollment>,
): Enrollment => {
  const n = nextId('enrollment');
  return {
    id: `enrollment-uuid-${n}`,
    userId: `user-uuid-${n}`, // placeholder — override with real user ID
    courseId: `course-uuid-${n}`, // placeholder — override with real course ID
    status: 'active',
    enrolledAt: new Date(),
    completedAt: null,
    progress: 0,
    ...overrides,
  };
};

/**
 * Create a plain object representation of an enrollment (for API payloads).
 */
export const createEnrollmentData = (
  overrides?: DeepPartial<Omit<Enrollment, 'id' | 'enrolledAt' | 'completedAt'>>,
) => {
  const n = nextId('enrollment');
  return {
    userId: `user-uuid-${n}`,
    courseId: `course-uuid-${n}`,
    status: 'active' as EnrollmentStatus,
    progress: 0,
    ...overrides,
  };
};

/**
 * Build many enrollments at once. Each gets a unique counter.
 */
export const createManyEnrollments = (
  count: number,
  overridesArray?: DeepPartial<Enrollment>[],
): Enrollment[] => {
  const enrollments: Enrollment[] = [];
  for (let i = 0; i < count; i++) {
    enrollments.push(createEnrollment(overridesArray?.[i]));
  }
  return enrollments;
};

/**
 * Convenience: create an enrollment pre-configured as completed.
 */
export const createCompletedEnrollment: FactoryFn<Enrollment> = (
  overrides?: DeepPartial<Enrollment>,
) =>
  createEnrollment({
    status: 'completed',
    progress: 100,
    completedAt: new Date(),
    ...overrides,
  });

/**
 * Convenience: create an enrollment pre-configured as dropped.
 */
export const createDroppedEnrollment: FactoryFn<Enrollment> = (
  overrides?: DeepPartial<Enrollment>,
) =>
  createEnrollment({
    status: 'dropped',
    progress: 0,
    ...overrides,
  });

/**
 * Convenience: create an enrollment with a specific progress percentage.
 * Status is automatically set to 'active' unless overridden.
 */
export const createInProgressEnrollment = (
  progress: number,
  overrides?: DeepPartial<Enrollment>,
): Enrollment =>
  createEnrollment({
    status: 'active',
    progress: Math.max(0, Math.min(100, progress)),
    ...overrides,
  });
