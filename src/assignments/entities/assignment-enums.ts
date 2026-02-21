/**
 * Shared enums for assignments and submissions.
 * Kept in a separate file to avoid circular dependency between assignment.entity and submission.entity.
 */

export enum AssignmentType {
  FILE = 'file',
  TEXT = 'text',
  CODE = 'code',
  MIXED = 'mixed',
}

export enum SubmissionStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  LATE = 'late',
  GRADED = 'graded',
}
