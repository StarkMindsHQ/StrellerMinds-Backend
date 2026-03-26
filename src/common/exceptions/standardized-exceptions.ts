import {
  HttpException,
  HttpStatus,
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException as NestForbiddenException,
  GatewayTimeoutException,
  InternalServerErrorException,
  MethodNotAllowedException,
  NotAcceptableException,
  NotFoundException,
  NotImplementedException,
  RequestTimeoutException,
  ServiceUnavailableException,
  UnauthorizedException as NestUnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ErrorCode,
  ErrorSeverity,
  ErrorCategory,
  ErrorDetail,
  ERROR_STATUS_MAP,
  ERROR_SEVERITY_MAP,
  ERROR_CATEGORY_MAP,
} from '../errors/error-types';

/**
 * Base exception class for all standardized application exceptions
 * Extends HttpException and adds error code, severity, and category support
 */
export class StandardizedException extends HttpException {
  public readonly errorCode: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly errors?: ErrorDetail[];
  public readonly detail?: string;
  public readonly documentationUrl?: string;
  public readonly debug?: Record<string, unknown>;

  constructor(
    errorCode: ErrorCode,
    message?: string,
    options: {
      statusCode?: number;
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      errors?: ErrorDetail[];
      detail?: string;
      documentationUrl?: string;
      debug?: Record<string, unknown>;
      cause?: Error;
    } = {},
  ) {
    const statusCode =
      options.statusCode ?? ERROR_STATUS_MAP[errorCode] ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const severity =
      options.severity ?? ERROR_SEVERITY_MAP[errorCode] ?? ErrorSeverity.MEDIUM;
    const category =
      options.category ?? ERROR_CATEGORY_MAP[errorCode] ?? ErrorCategory.BUSINESS_LOGIC;

    const response = {
      success: false,
      errorCode,
      message: message ?? `An error occurred: ${errorCode}`,
      detail: options.detail,
      errors: options.errors,
      severity,
      category,
      documentationUrl: options.documentationUrl,
    };

    super(response, statusCode, { cause: options.cause });

    this.errorCode = errorCode;
    this.severity = severity;
    this.category = category;
    this.errors = options.errors;
    this.detail = options.detail;
    this.documentationUrl = options.documentationUrl;
    this.debug = options.debug;

    // Set the name to the error code for better debugging
    this.name = errorCode;
  }

  /**
   * Get the response object for the exception
   */
  getResponse(): object {
    return {
      success: false,
      errorCode: this.errorCode,
      message: this.message,
      detail: this.detail,
      errors: this.errors,
      severity: this.severity,
      category: this.category,
      documentationUrl: this.documentationUrl,
    };
  }
}

/**
 * Validation exception for input validation errors
 */
export class ValidationErrorException extends StandardizedException {
  constructor(
    errors: ErrorDetail[] | string,
    message: string = 'Validation failed. Please check your input.',
  ) {
    const errorDetails = typeof errors === 'string'
      ? [{ code: ErrorCode.VALIDATION_ERROR, message: errors }]
      : errors;

    super(ErrorCode.VALIDATION_ERROR, message, {
      statusCode: HttpStatus.BAD_REQUEST,
      severity: ErrorSeverity.LOW,
      category: ErrorCategory.VALIDATION,
      errors: errorDetails,
    });
  }
}

/**
 * Resource not found exception
 */
export class ResourceNotFoundException extends StandardizedException {
  constructor(
    resourceType: string,
    identifier?: string | number,
    detail?: string,
  ) {
    const message = identifier
      ? `${resourceType} with identifier '${identifier}' not found`
      : `${resourceType} not found`;

    super(ErrorCode.RESOURCE_NOT_FOUND, message, {
      statusCode: HttpStatus.NOT_FOUND,
      severity: ErrorSeverity.LOW,
      category: ErrorCategory.BUSINESS_LOGIC,
      detail: detail ?? `The requested ${resourceType.toLowerCase()} could not be found in the system.`,
      errors: [{ code: 'RESOURCE_NOT_FOUND', message, field: identifier ? 'id' : undefined }],
    });
  }
}

/**
 * Authentication exception for auth-related errors
 */
export class AuthenticationException extends StandardizedException {
  constructor(
    errorCode: ErrorCode = ErrorCode.AUTH_UNAUTHORIZED,
    message?: string,
    options: { detail?: string; errors?: ErrorDetail[] } = {},
  ) {
    super(errorCode, message, {
      statusCode: HttpStatus.UNAUTHORIZED,
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.AUTHENTICATION,
      ...options,
    });
  }
}

/**
 * Authorization exception for permission-related errors
 */
export class AuthorizationException extends StandardizedException {
  constructor(
    errorCode: ErrorCode = ErrorCode.AUTH_FORBIDDEN,
    message: string = 'You do not have permission to access this resource.',
    options: { detail?: string; requiredPermission?: string } = {},
  ) {
    const errors = options.requiredPermission
      ? [{ code: 'PERMISSION_REQUIRED', message: `Required permission: ${options.requiredPermission}`, field: 'permission' }]
      : undefined;

    super(errorCode, message, {
      statusCode: HttpStatus.FORBIDDEN,
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.AUTHORIZATION,
      detail: options.detail,
      errors,
    });
  }
}

/**
 * Business logic exception for domain-specific errors
 */
export class BusinessException extends StandardizedException {
  constructor(
    errorCode: ErrorCode,
    message: string,
    options: {
      detail?: string;
      errors?: ErrorDetail[];
      debug?: Record<string, unknown>;
    } = {},
  ) {
    super(errorCode, message, {
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.BUSINESS_LOGIC,
      ...options,
    });
  }
}

/**
 * Integration exception for third-party service errors
 */
export class IntegrationException extends StandardizedException {
  constructor(
    serviceName: string,
    errorCode: ErrorCode = ErrorCode.INTEGRATION_ERROR,
    options: {
      message?: string;
      detail?: string;
      cause?: Error;
      debug?: Record<string, unknown>;
    } = {},
  ) {
    const message = options.message ?? `An error occurred while communicating with ${serviceName}.`;

    super(errorCode, message, {
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.INTEGRATION,
      detail: options.detail ?? `The ${serviceName} integration encountered an error.`,
      cause: options.cause,
      debug: { serviceName, ...options.debug },
    });
  }
}

/**
 * Rate limit exceeded exception
 */
export class RateLimitExceededException extends StandardizedException {
  constructor(
    retryAfter?: number,
    message: string = 'Too many requests. Please wait before trying again.',
  ) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, message, {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      severity: ErrorSeverity.LOW,
      category: ErrorCategory.SYSTEM,
      detail: retryAfter ? `Retry after ${retryAfter} seconds.` : undefined,
      errors: [{ code: 'RATE_LIMIT', message: 'Rate limit threshold exceeded' }],
    });
  }
}

/**
 * Course-specific exceptions
 */
export class CourseException extends StandardizedException {
  constructor(
    errorCode: ErrorCode,
    message: string,
    options: {
      courseId?: string;
      detail?: string;
      errors?: ErrorDetail[];
    } = {},
  ) {
    super(errorCode, message, {
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.BUSINESS_LOGIC,
      detail: options.detail,
      errors: options.errors,
      debug: options.courseId ? { courseId: options.courseId } : undefined,
    });
  }

  static notFound(courseId?: string): CourseException {
    return new CourseException(ErrorCode.COURSE_NOT_FOUND, 'Course not found', {
      courseId,
      detail: 'The requested course does not exist or has been removed.',
    });
  }

  static alreadyEnrolled(courseId?: string): CourseException {
    return new CourseException(ErrorCode.COURSE_ALREADY_ENROLLED, 'You are already enrolled in this course', {
      courseId,
      detail: 'You have already enrolled in this course. Check your enrolled courses.',
    });
  }

  static prerequisiteNotMet(courseId: string, prerequisiteName: string): CourseException {
    return new CourseException(
      ErrorCode.COURSE_PREREQUISITE_NOT_MET,
      `You must complete "${prerequisiteName}" before enrolling in this course.`,
      { courseId, detail: 'Complete the required prerequisite courses first.' },
    );
  }

  static enrollmentClosed(courseId?: string): CourseException {
    return new CourseException(ErrorCode.COURSE_ENROLLMENT_CLOSED, 'Enrollment for this course is closed', {
      courseId,
      detail: 'The enrollment period for this course has ended.',
    });
  }

  static capacityReached(courseId?: string): CourseException {
    return new CourseException(ErrorCode.COURSE_CAPACITY_REACHED, 'This course has reached its maximum capacity', {
      courseId,
      detail: 'The course is full. Try again later or contact support.',
    });
  }
}

/**
 * Payment-specific exceptions
 */
export class PaymentException extends StandardizedException {
  constructor(
    errorCode: ErrorCode,
    message: string,
    options: {
      paymentId?: string;
      amount?: number;
      currency?: string;
      detail?: string;
      cause?: Error;
    } = {},
  ) {
    super(errorCode, message, {
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.EXTERNAL,
      detail: options.detail,
      cause: options.cause,
      debug: {
        paymentId: options.paymentId,
        amount: options.amount,
        currency: options.currency,
      },
    });
  }

  static failed(paymentId?: string, cause?: Error): PaymentException {
    return new PaymentException(ErrorCode.PAYMENT_FAILED, 'Payment processing failed. Please try again.', {
      paymentId,
      cause,
      detail: 'The payment could not be processed. Verify your payment details.',
    });
  }

  static declined(paymentId?: string): PaymentException {
    return new PaymentException(ErrorCode.PAYMENT_DECLINED, 'Your payment was declined', {
      paymentId,
      detail: 'Your bank declined the payment. Try a different payment method.',
    });
  }
}

/**
 * Assignment-specific exceptions
 */
export class AssignmentException extends StandardizedException {
  constructor(
    errorCode: ErrorCode,
    message: string,
    options: {
      assignmentId?: string;
      detail?: string;
    } = {},
  ) {
    super(errorCode, message, {
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.BUSINESS_LOGIC,
      detail: options.detail,
      debug: options.assignmentId ? { assignmentId: options.assignmentId } : undefined,
    });
  }

  static deadlinePassed(assignmentId?: string, deadline?: Date): AssignmentException {
    const detail = deadline
      ? `The deadline was ${deadline.toLocaleString()}.`
      : 'The assignment deadline has passed.';
    return new AssignmentException(ErrorCode.ASSIGNMENT_DEADLINE_PASSED, 'The assignment deadline has passed', {
      assignmentId,
      detail,
    });
  }

  static notFound(assignmentId?: string): AssignmentException {
    return new AssignmentException(ErrorCode.ASSIGNMENT_NOT_FOUND, 'Assignment not found', {
      assignmentId,
      detail: 'The requested assignment does not exist.',
    });
  }
}

/**
 * Blockchain-specific exceptions
 */
export class BlockchainException extends StandardizedException {
  constructor(
    errorCode: ErrorCode,
    message: string,
    options: {
      transactionHash?: string;
      walletAddress?: string;
      detail?: string;
      cause?: Error;
    } = {},
  ) {
    super(errorCode, message, {
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.INTEGRATION,
      detail: options.detail,
      cause: options.cause,
      debug: {
        transactionHash: options.transactionHash,
        walletAddress: options.walletAddress,
      },
    });
  }

  static transactionFailed(transactionHash?: string, cause?: Error): BlockchainException {
    return new BlockchainException(ErrorCode.BLOCKCHAIN_TRANSACTION_FAILED, 'Blockchain transaction failed', {
      transactionHash,
      cause,
      detail: 'The blockchain transaction could not be completed. Please try again.',
    });
  }

  static insufficientFunds(walletAddress?: string): BlockchainException {
    return new BlockchainException(ErrorCode.BLOCKCHAIN_INSUFFICIENT_FUNDS, 'Insufficient funds for this transaction', {
      walletAddress,
      detail: 'Your wallet does not have enough funds for this transaction.',
    });
  }
}

/**
 * File-specific exceptions
 */
export class FileException extends StandardizedException {
  constructor(
    errorCode: ErrorCode,
    message: string,
    options: {
      fileName?: string;
      fileSize?: number;
      fileType?: string;
      detail?: string;
    } = {},
  ) {
    super(errorCode, message, {
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.BUSINESS_LOGIC,
      detail: options.detail,
      errors: [{ code: errorCode, message, field: 'file' }],
      debug: {
        fileName: options.fileName,
        fileSize: options.fileSize,
        fileType: options.fileType,
      },
    });
  }

  static tooLarge(fileName?: string, maxSize?: number): FileException {
    const detail = maxSize
      ? `Maximum file size is ${(maxSize / 1024 / 1024).toFixed(2)}MB.`
      : 'The file exceeds the maximum allowed size.';
    return new FileException(ErrorCode.FILE_TOO_LARGE, 'File size exceeds the limit', {
      fileName,
      detail,
    });
  }

  static invalidType(fileName?: string, allowedTypes?: string[]): FileException {
    const detail = allowedTypes
      ? `Allowed file types: ${allowedTypes.join(', ')}.`
      : 'This file type is not supported.';
    return new FileException(ErrorCode.FILE_TYPE_INVALID, 'File type is not supported', {
      fileName,
      detail,
    });
  }
}

/**
 * Database exception wrapper
 */
export class DatabaseException extends StandardizedException {
  constructor(
    errorCode: ErrorCode = ErrorCode.DATABASE_QUERY_ERROR,
    options: {
      message?: string;
      detail?: string;
      cause?: Error;
      tableName?: string;
    } = {},
  ) {
    super(errorCode, options.message ?? 'A database error occurred', {
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.SYSTEM,
      detail: options.detail ?? 'An error occurred while accessing the database.',
      cause: options.cause,
      debug: { tableName: options.tableName },
    });
  }
}

// =============================================================================
// Legacy exception classes for backward compatibility
// =============================================================================

/**
 * @deprecated Use ValidationErrorException instead
 */
export class ValidationException extends ValidationErrorException {}

/**
 * @deprecated Use AuthenticationException instead
 */
export class UnauthorizedException extends AuthenticationException {
  constructor(message = 'Unauthorized access') {
    super(ErrorCode.AUTH_UNAUTHORIZED, message);
  }
}

/**
 * @deprecated Use AuthorizationException instead
 */
export class ForbiddenException extends AuthorizationException {
  constructor(message = 'Access forbidden') {
    super(ErrorCode.AUTH_FORBIDDEN, message);
  }
}

/**
 * @deprecated Use BusinessException instead
 */
export class BusinessLogicException extends BusinessException {
  constructor(message: string, details?: any) {
    super(ErrorCode.INVALID_INPUT, message, {
      detail: typeof details === 'string' ? details : undefined,
      debug: typeof details === 'object' ? details : undefined,
    });
  }
}

/**
 * Helper function to create standardized exceptions from error codes
 */
export function createException(
  errorCode: ErrorCode,
  message?: string,
  options?: {
    detail?: string;
    errors?: ErrorDetail[];
    cause?: Error;
    debug?: Record<string, unknown>;
  },
): StandardizedException {
  const category = ERROR_CATEGORY_MAP[errorCode];
  
  switch (category) {
    case ErrorCategory.AUTHENTICATION:
      return new AuthenticationException(errorCode, message, options);
    case ErrorCategory.AUTHORIZATION:
      return new AuthorizationException(errorCode, message, options);
    case ErrorCategory.INTEGRATION:
      return new IntegrationException('external', errorCode, { message, ...options });
    default:
      return new StandardizedException(errorCode, message, options);
  }
}
