import { Injectable, Inject, Optional } from '@nestjs/common';
import { ErrorCode, ErrorDetail } from '../errors/error-types';
import { I18nService } from '../../i18n/services/i18n.service';

/**
 * Service for localizing error messages
 * Provides translated error messages based on user's preferred language
 */
@Injectable()
export class ErrorLocalizationService {
  private readonly defaultLanguage = 'en';

  // Default English messages for error codes
  private readonly defaultMessages: Record<ErrorCode, string> = {
    // Generic errors
    [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again later.',
    [ErrorCode.VALIDATION_ERROR]: 'Validation failed. Please check your input.',
    [ErrorCode.INVALID_INPUT]: 'The provided input is invalid.',
    [ErrorCode.MISSING_REQUIRED_FIELD]: 'A required field is missing.',
    [ErrorCode.INVALID_FORMAT]: 'The format of the provided value is invalid.',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait before trying again.',
    [ErrorCode.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable. Please try again later.',
    [ErrorCode.INTERNAL_SERVER_ERROR]: 'An internal server error occurred. Our team has been notified.',

    // Authentication errors
    [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',
    [ErrorCode.AUTH_TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
    [ErrorCode.AUTH_TOKEN_INVALID]: 'Invalid authentication token. Please log in again.',
    [ErrorCode.AUTH_TOKEN_MISSING]: 'Authentication token is required. Please log in.',
    [ErrorCode.AUTH_UNAUTHORIZED]: 'You need to be authenticated to access this resource.',
    [ErrorCode.AUTH_FORBIDDEN]: 'You do not have permission to access this resource.',
    [ErrorCode.AUTH_ACCOUNT_DISABLED]: 'Your account has been disabled. Contact support.',
    [ErrorCode.AUTH_ACCOUNT_LOCKED]: 'Your account has been locked due to multiple failed attempts.',
    [ErrorCode.AUTH_MFA_REQUIRED]: 'Multi-factor authentication is required.',
    [ErrorCode.AUTH_MFA_INVALID]: 'Invalid MFA code. Please try again.',
    [ErrorCode.AUTH_SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
    [ErrorCode.AUTH_PASSWORD_EXPIRED]: 'Your password has expired. Please reset it.',
    [ErrorCode.AUTH_INVALID_REFRESH_TOKEN]: 'Invalid refresh token. Please log in again.',

    // User errors
    [ErrorCode.USER_NOT_FOUND]: 'User not found.',
    [ErrorCode.USER_ALREADY_EXISTS]: 'A user with this email already exists.',
    [ErrorCode.USER_EMAIL_NOT_VERIFIED]: 'Please verify your email address to continue.',
    [ErrorCode.USER_INVALID_EMAIL]: 'Please provide a valid email address.',
    [ErrorCode.USER_INVALID_PASSWORD]: 'Password must be at least 8 characters with letters and numbers.',
    [ErrorCode.USER_PASSWORD_MISMATCH]: 'Passwords do not match.',
    [ErrorCode.USER_PROFILE_INCOMPLETE]: 'Please complete your profile to continue.',

    // Resource errors
    [ErrorCode.RESOURCE_NOT_FOUND]: 'The requested resource was not found.',
    [ErrorCode.RESOURCE_ALREADY_EXISTS]: 'This resource already exists.',
    [ErrorCode.RESOURCE_DELETED]: 'This resource has been deleted.',
    [ErrorCode.RESOURCE_ARCHIVED]: 'This resource has been archived.',
    [ErrorCode.RESOURCE_LOCKED]: 'This resource is currently locked.',
    [ErrorCode.RESOURCE_CONFLICT]: 'A conflict occurred with the current state of the resource.',

    // Course errors
    [ErrorCode.COURSE_NOT_FOUND]: 'Course not found.',
    [ErrorCode.COURSE_NOT_PUBLISHED]: 'This course is not yet published.',
    [ErrorCode.COURSE_ENROLLMENT_CLOSED]: 'Enrollment for this course is closed.',
    [ErrorCode.COURSE_ALREADY_ENROLLED]: 'You are already enrolled in this course.',
    [ErrorCode.COURSE_PREREQUISITE_NOT_MET]: 'You must complete the prerequisite courses first.',
    [ErrorCode.COURSE_CAPACITY_REACHED]: 'This course has reached its maximum capacity.',
    [ErrorCode.COURSE_INVALID_MODULE]: 'Invalid course module.',
    [ErrorCode.COURSE_INVALID_LESSON]: 'Invalid course lesson.',

    // Assignment errors
    [ErrorCode.ASSIGNMENT_NOT_FOUND]: 'Assignment not found.',
    [ErrorCode.ASSIGNMENT_DEADLINE_PASSED]: 'The deadline for this assignment has passed.',
    [ErrorCode.ASSIGNMENT_NOT_SUBMITTED]: 'No submission found for this assignment.',
    [ErrorCode.ASSIGNMENT_ALREADY_GRADED]: 'This assignment has already been graded.',
    [ErrorCode.ASSIGNMENT_SUBMISSION_INVALID]: 'Invalid assignment submission.',

    // Payment errors
    [ErrorCode.PAYMENT_FAILED]: 'Payment processing failed. Please try again.',
    [ErrorCode.PAYMENT_DECLINED]: 'Your payment was declined. Contact your bank.',
    [ErrorCode.PAYMENT_EXPIRED]: 'Payment session has expired. Please try again.',
    [ErrorCode.PAYMENT_AMOUNT_INVALID]: 'Invalid payment amount.',
    [ErrorCode.PAYMENT_CURRENCY_INVALID]: 'Invalid currency.',
    [ErrorCode.SUBSCRIPTION_NOT_FOUND]: 'Subscription not found.',
    [ErrorCode.SUBSCRIPTION_EXPIRED]: 'Your subscription has expired.',
    [ErrorCode.SUBSCRIPTION_CANCELED]: 'This subscription has been canceled.',
    [ErrorCode.REFUND_NOT_POSSIBLE]: 'Refund is not possible for this transaction.',

    // File errors
    [ErrorCode.FILE_NOT_FOUND]: 'File not found.',
    [ErrorCode.FILE_TOO_LARGE]: 'File size exceeds the maximum allowed limit.',
    [ErrorCode.FILE_TYPE_INVALID]: 'File type is not supported.',
    [ErrorCode.FILE_UPLOAD_FAILED]: 'File upload failed. Please try again.',
    [ErrorCode.FILE_VIRUS_DETECTED]: 'File was rejected for security reasons.',

    // Blockchain errors
    [ErrorCode.BLOCKCHAIN_TRANSACTION_FAILED]: 'Blockchain transaction failed. Please try again.',
    [ErrorCode.BLOCKCHAIN_INSUFFICIENT_FUNDS]: 'Insufficient funds for this transaction.',
    [ErrorCode.BLOCKCHAIN_INVALID_WALLET]: 'Invalid wallet address.',
    [ErrorCode.BLOCKCHAIN_NETWORK_ERROR]: 'Blockchain network error. Please try again later.',
    [ErrorCode.BLOCKCHAIN_SIGNATURE_INVALID]: 'Invalid transaction signature.',
    [ErrorCode.CREDENTIAL_VERIFICATION_FAILED]: 'Credential verification failed.',

    // Forum errors
    [ErrorCode.FORUM_POST_NOT_FOUND]: 'Post not found.',
    [ErrorCode.FORUM_THREAD_LOCKED]: 'This thread has been locked.',
    [ErrorCode.FORUM_ACCESS_DENIED]: 'You do not have access to this forum.',
    [ErrorCode.FORUM_REPLY_NOT_ALLOWED]: 'Replies are not allowed in this thread.',

    // Integration errors
    [ErrorCode.INTEGRATION_NOT_CONFIGURED]: 'Integration is not configured.',
    [ErrorCode.INTEGRATION_AUTH_FAILED]: 'Integration authentication failed.',
    [ErrorCode.INTEGRATION_RATE_LIMITED]: 'Integration rate limit exceeded.',
    [ErrorCode.INTEGRATION_TIMEOUT]: 'Integration request timed out.',
    [ErrorCode.INTEGRATION_ERROR]: 'An integration error occurred.',

    // Database errors
    [ErrorCode.DATABASE_CONNECTION_ERROR]: 'Database connection error. Please try again.',
    [ErrorCode.DATABASE_QUERY_ERROR]: 'Database query error.',
    [ErrorCode.DATABASE_TIMEOUT]: 'Database request timed out.',
    [ErrorCode.DATABASE_CONSTRAINT_VIOLATION]: 'Database constraint violation.',

    // Cache errors
    [ErrorCode.CACHE_ERROR]: 'Cache error occurred.',
    [ErrorCode.CACHE_MISS]: 'Cache miss.',
  };

  // Developer/technical messages (always in English)
  private readonly technicalMessages: Record<ErrorCode, string> = {
    [ErrorCode.UNKNOWN_ERROR]: 'An unhandled exception occurred.',
    [ErrorCode.VALIDATION_ERROR]: 'Request validation failed using class-validator.',
    [ErrorCode.INVALID_INPUT]: 'Input validation failed.',
    [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is null or undefined.',
    [ErrorCode.INVALID_FORMAT]: 'Value format validation failed.',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Rate limit threshold exceeded.',
    [ErrorCode.SERVICE_UNAVAILABLE]: 'Service health check failed.',
    [ErrorCode.INTERNAL_SERVER_ERROR]: 'Internal server error - check logs for details.',
    [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'User authentication failed - invalid credentials.',
    [ErrorCode.AUTH_TOKEN_EXPIRED]: 'JWT token has expired.',
    [ErrorCode.AUTH_TOKEN_INVALID]: 'JWT token validation failed.',
    [ErrorCode.AUTH_TOKEN_MISSING]: 'Authorization header missing or malformed.',
    [ErrorCode.AUTH_UNAUTHORIZED]: 'User not authenticated.',
    [ErrorCode.AUTH_FORBIDDEN]: 'User lacks required permissions.',
    [ErrorCode.AUTH_ACCOUNT_DISABLED]: 'User account status is disabled.',
    [ErrorCode.AUTH_ACCOUNT_LOCKED]: 'User account is locked.',
    [ErrorCode.AUTH_MFA_REQUIRED]: 'MFA verification required but not provided.',
    [ErrorCode.AUTH_MFA_INVALID]: 'MFA code validation failed.',
    [ErrorCode.AUTH_SESSION_EXPIRED]: 'Session has expired.',
    [ErrorCode.AUTH_PASSWORD_EXPIRED]: 'Password has expired and requires reset.',
    [ErrorCode.AUTH_INVALID_REFRESH_TOKEN]: 'Refresh token validation failed.',
    [ErrorCode.USER_NOT_FOUND]: 'User entity not found in database.',
    [ErrorCode.USER_ALREADY_EXISTS]: 'Unique constraint violation on user.',
    [ErrorCode.USER_EMAIL_NOT_VERIFIED]: 'User email verification pending.',
    [ErrorCode.USER_INVALID_EMAIL]: 'Email format validation failed.',
    [ErrorCode.USER_INVALID_PASSWORD]: 'Password policy validation failed.',
    [ErrorCode.USER_PASSWORD_MISMATCH]: 'Password confirmation does not match.',
    [ErrorCode.USER_PROFILE_INCOMPLETE]: 'User profile missing required fields.',
    [ErrorCode.RESOURCE_NOT_FOUND]: 'Requested entity not found.',
    [ErrorCode.RESOURCE_ALREADY_EXISTS]: 'Entity already exists.',
    [ErrorCode.RESOURCE_DELETED]: 'Entity has been soft-deleted.',
    [ErrorCode.RESOURCE_ARCHIVED]: 'Entity has been archived.',
    [ErrorCode.RESOURCE_LOCKED]: 'Entity is locked by another process.',
    [ErrorCode.RESOURCE_CONFLICT]: 'Optimistic locking or state conflict.',
    [ErrorCode.COURSE_NOT_FOUND]: 'Course entity not found.',
    [ErrorCode.COURSE_NOT_PUBLISHED]: 'Course status is not published.',
    [ErrorCode.COURSE_ENROLLMENT_CLOSED]: 'Course enrollment is disabled.',
    [ErrorCode.COURSE_ALREADY_ENROLLED]: 'User already enrolled in course.',
    [ErrorCode.COURSE_PREREQUISITE_NOT_MET]: 'Prerequisite courses not completed.',
    [ErrorCode.COURSE_CAPACITY_REACHED]: 'Course max capacity reached.',
    [ErrorCode.COURSE_INVALID_MODULE]: 'Course module not found.',
    [ErrorCode.COURSE_INVALID_LESSON]: 'Course lesson not found.',
    [ErrorCode.ASSIGNMENT_NOT_FOUND]: 'Assignment entity not found.',
    [ErrorCode.ASSIGNMENT_DEADLINE_PASSED]: 'Assignment deadline exceeded.',
    [ErrorCode.ASSIGNMENT_NOT_SUBMITTED]: 'No submission record found.',
    [ErrorCode.ASSIGNMENT_ALREADY_GRADED]: 'Assignment has existing grade.',
    [ErrorCode.ASSIGNMENT_SUBMISSION_INVALID]: 'Submission validation failed.',
    [ErrorCode.PAYMENT_FAILED]: 'Payment gateway returned failure.',
    [ErrorCode.PAYMENT_DECLINED]: 'Payment was declined by provider.',
    [ErrorCode.PAYMENT_EXPIRED]: 'Payment session expired.',
    [ErrorCode.PAYMENT_AMOUNT_INVALID]: 'Amount validation failed.',
    [ErrorCode.PAYMENT_CURRENCY_INVALID]: 'Currency not supported.',
    [ErrorCode.SUBSCRIPTION_NOT_FOUND]: 'Subscription entity not found.',
    [ErrorCode.SUBSCRIPTION_EXPIRED]: 'Subscription end date passed.',
    [ErrorCode.SUBSCRIPTION_CANCELED]: 'Subscription status is canceled.',
    [ErrorCode.REFUND_NOT_POSSIBLE]: 'Refund conditions not met.',
    [ErrorCode.FILE_NOT_FOUND]: 'File not found in storage.',
    [ErrorCode.FILE_TOO_LARGE]: 'File size exceeds limit.',
    [ErrorCode.FILE_TYPE_INVALID]: 'File MIME type not allowed.',
    [ErrorCode.FILE_UPLOAD_FAILED]: 'File upload to storage failed.',
    [ErrorCode.FILE_VIRUS_DETECTED]: 'Virus scan detected threat.',
    [ErrorCode.BLOCKCHAIN_TRANSACTION_FAILED]: 'Stellar transaction failed.',
    [ErrorCode.BLOCKCHAIN_INSUFFICIENT_FUNDS]: 'Account balance too low.',
    [ErrorCode.BLOCKCHAIN_INVALID_WALLET]: 'Invalid Stellar public key.',
    [ErrorCode.BLOCKCHAIN_NETWORK_ERROR]: 'Stellar network unreachable.',
    [ErrorCode.BLOCKCHAIN_SIGNATURE_INVALID]: 'Transaction signature invalid.',
    [ErrorCode.CREDENTIAL_VERIFICATION_FAILED]: 'On-chain credential verification failed.',
    [ErrorCode.FORUM_POST_NOT_FOUND]: 'Forum post entity not found.',
    [ErrorCode.FORUM_THREAD_LOCKED]: 'Thread is locked.',
    [ErrorCode.FORUM_ACCESS_DENIED]: 'User lacks forum access.',
    [ErrorCode.FORUM_REPLY_NOT_ALLOWED]: 'Replies disabled on thread.',
    [ErrorCode.INTEGRATION_NOT_CONFIGURED]: 'Third-party integration not configured.',
    [ErrorCode.INTEGRATION_AUTH_FAILED]: 'OAuth or API key authentication failed.',
    [ErrorCode.INTEGRATION_RATE_LIMITED]: 'Third-party rate limit hit.',
    [ErrorCode.INTEGRATION_TIMEOUT]: 'Third-party request timeout.',
    [ErrorCode.INTEGRATION_ERROR]: 'Third-party integration error.',
    [ErrorCode.DATABASE_CONNECTION_ERROR]: 'PostgreSQL connection failed.',
    [ErrorCode.DATABASE_QUERY_ERROR]: 'SQL query error.',
    [ErrorCode.DATABASE_TIMEOUT]: 'Query timeout exceeded.',
    [ErrorCode.DATABASE_CONSTRAINT_VIOLATION]: 'Constraint violation error.',
    [ErrorCode.CACHE_ERROR]: 'Redis cache error.',
    [ErrorCode.CACHE_MISS]: 'Cache key not found.',
  };

  // Suggestions for resolving errors
  private readonly suggestions: Partial<Record<ErrorCode, string>> = {
    [ErrorCode.AUTH_TOKEN_EXPIRED]: 'Try logging in again to get a new token.',
    [ErrorCode.AUTH_TOKEN_INVALID]: 'Make sure your token is correctly formatted.',
    [ErrorCode.AUTH_TOKEN_MISSING]: 'Include an Authorization header with your Bearer token.',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Wait a few seconds before making another request.',
    [ErrorCode.VALIDATION_ERROR]: 'Check the errors array for details on which fields failed.',
    [ErrorCode.FILE_TOO_LARGE]: 'Compress your file or choose a smaller one.',
    [ErrorCode.FILE_TYPE_INVALID]: 'Use one of the supported file types: JPG, PNG, PDF.',
    [ErrorCode.COURSE_PREREQUISITE_NOT_MET]: 'Complete the required prerequisite courses first.',
    [ErrorCode.ASSIGNMENT_DEADLINE_PASSED]: 'Contact your instructor for a deadline extension.',
    [ErrorCode.PAYMENT_DECLINED]: 'Verify your card details or try a different payment method.',
    [ErrorCode.BLOCKCHAIN_INSUFFICIENT_FUNDS]: 'Add more funds to your wallet address.',
  };

  constructor(
    @Optional() @Inject('I18nService') private readonly i18nService?: I18nService,
  ) {}

  /**
   * Get localized error message
   * @param errorCode The error code
   * @param language Preferred language (defaults to 'en')
   * @param params Optional interpolation parameters
   */
  getLocalizedMessage(
    errorCode: ErrorCode,
    language: string = this.defaultLanguage,
    params?: Record<string, unknown>,
  ): string {
    // Try to get translation from i18n service
    if (this.i18nService) {
      const translationKey = `errors.${errorCode}`;
      const translated = this.i18nService.translate(translationKey, language, params);
      
      // If translation found (not returning the key itself)
      if (translated && translated !== translationKey) {
        return translated;
      }
    }

    // Fall back to default English message
    return this.defaultMessages[errorCode] || this.defaultMessages[ErrorCode.UNKNOWN_ERROR];
  }

  /**
   * Get technical/developer message (always in English)
   * @param errorCode The error code
   */
  getTechnicalMessage(errorCode: ErrorCode): string {
    return this.technicalMessages[errorCode] || this.technicalMessages[ErrorCode.UNKNOWN_ERROR];
  }

  /**
   * Get suggestion for resolving the error
   * @param errorCode The error code
   */
  getSuggestion(errorCode: ErrorCode): string | undefined {
    return this.suggestions[errorCode];
  }

  /**
   * Localize an array of error details
   * @param errors Array of error details
   * @param language Preferred language
   */
  localizeErrorDetails(
    errors: ErrorDetail[],
    language: string = this.defaultLanguage,
  ): ErrorDetail[] {
    return errors.map((error) => ({
      ...error,
      message: this.getLocalizedMessage(error.code as ErrorCode, language) || error.message,
    }));
  }

  /**
   * Get documentation URL for an error code
   * @param errorCode The error code
   */
  getDocumentationUrl(errorCode: ErrorCode): string {
    return `https://docs.strellerminds.com/errors/${errorCode}`;
  }

  /**
   * Check if error code is valid
   * @param errorCode The error code to validate
   */
  isValidErrorCode(errorCode: string): errorCode is ErrorCode {
    return Object.values(ErrorCode).includes(errorCode as ErrorCode);
  }

  /**
   * Parse error code from string, returning UNKNOWN_ERROR if invalid
   * @param errorCodeString String representation of error code
   */
  parseErrorCode(errorCodeString: string): ErrorCode {
    if (this.isValidErrorCode(errorCodeString)) {
      return errorCodeString;
    }
    return ErrorCode.UNKNOWN_ERROR;
  }
}
