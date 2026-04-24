import { DomainException } from '../../../shared/domain/exceptions/domain-exceptions';

/**
 * Thrown when a course is not found
 */
export class CourseNotFoundException extends DomainException {
  constructor(courseId: string) {
    super(`Course with id "${courseId}" not found`);
    Object.setPrototypeOf(this, CourseNotFoundException.prototype);
  }

  getCode(): string {
    return 'COURSE_NOT_FOUND';
  }
}

/**
 * Thrown when course data is invalid
 */
export class InvalidCourseDataException extends DomainException {
  constructor(message: string) {
    super(`Invalid course data: ${message}`);
    Object.setPrototypeOf(this, InvalidCourseDataException.prototype);
  }

  getCode(): string {
    return 'INVALID_COURSE_DATA';
  }
}
