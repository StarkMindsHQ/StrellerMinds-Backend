import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  getSchemaPath,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ErrorCode, ErrorSeverity, ErrorCategory, ErrorDetail, StandardizedErrorResponse } from '../errors/error-types';

/**
 * Options for API error response documentation
 */
export interface ApiErrorResponseOptions {
  status: number;
  description: string;
  errorCode?: ErrorCode;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  errors?: Array<{ field: string; code: string; message: string }>;
}

/**
 * Decorator to document standardized error responses for Swagger
 * Use this on controller methods to document expected error responses
 */
export function ApiStandardErrorResponses(
  ...errorResponses: ApiErrorResponseOptions[]
): MethodDecorator & ClassDecorator {
  const decorators: (MethodDecorator | ClassDecorator)[] = [
    ApiExtraModels(StandardizedErrorResponse, ErrorDetail),
  ];

  for (const error of errorResponses) {
    decorators.push(
      ApiResponse({
        status: error.status,
        description: error.description,
        schema: {
          $ref: getSchemaPath(StandardizedErrorResponse),
          example: {
            success: false,
            errorCode: error.errorCode || 'UNKNOWN_ERROR',
            message: error.description,
            statusCode: error.status,
            severity: error.severity || ErrorSeverity.MEDIUM,
            category: error.category || ErrorCategory.BUSINESS_LOGIC,
            errors: error.errors,
            requestId: 'req_abc123xyz',
            timestamp: new Date().toISOString(),
            path: '/api/v1/example',
            method: 'GET',
            documentationUrl: `https://docs.strellerminds.com/errors/${error.errorCode}`,
          },
        },
      }),
    );
  }

  return applyDecorators(...decorators) as MethodDecorator & ClassDecorator;
}

/**
 * Common error response documentation for typical HTTP status codes
 * Can be used on controller methods to document common error responses
 */
export function ApiCommonErrorResponses(options?: {
  includeBadRequest?: boolean;
  includeUnauthorized?: boolean;
  includeForbidden?: boolean;
  includeNotFound?: boolean;
  includeTooManyRequests?: boolean;
  includeInternalServerError?: boolean;
}): MethodDecorator {
  const {
    includeBadRequest = true,
    includeUnauthorized = true,
    includeForbidden = true,
    includeNotFound = true,
    includeTooManyRequests = true,
    includeInternalServerError = true,
  } = options || {};

  const decorators: MethodDecorator[] = [ApiExtraModels(StandardizedErrorResponse, ErrorDetail)];

  if (includeBadRequest) {
    decorators.push(
      ApiResponse({
        status: 400,
        description: 'Bad Request - Invalid input data',
        schema: {
          $ref: getSchemaPath(StandardizedErrorResponse),
          example: {
            success: false,
            errorCode: ErrorCode.VALIDATION_ERROR,
            message: 'Validation failed. Please check your input.',
            statusCode: 400,
            severity: ErrorSeverity.LOW,
            category: ErrorCategory.VALIDATION,
            errors: [{ field: 'email', code: 'INVALID_EMAIL', message: 'Please provide a valid email address' }],
            requestId: 'req_abc123xyz',
            timestamp: new Date().toISOString(),
            path: '/api/v1/example',
            method: 'POST',
          },
        },
      }),
    );
  }

  if (includeUnauthorized) {
    decorators.push(
      ApiResponse({
        status: 401,
        description: 'Unauthorized - Authentication required',
        schema: {
          $ref: getSchemaPath(StandardizedErrorResponse),
          example: {
            success: false,
            errorCode: ErrorCode.AUTH_UNAUTHORIZED,
            message: 'You need to be authenticated to access this resource.',
            statusCode: 401,
            severity: ErrorSeverity.MEDIUM,
            category: ErrorCategory.AUTHENTICATION,
            requestId: 'req_abc123xyz',
            timestamp: new Date().toISOString(),
            path: '/api/v1/example',
            method: 'GET',
          },
        },
      }),
    );
  }

  if (includeForbidden) {
    decorators.push(
      ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
        schema: {
          $ref: getSchemaPath(StandardizedErrorResponse),
          example: {
            success: false,
            errorCode: ErrorCode.AUTH_FORBIDDEN,
            message: 'You do not have permission to access this resource.',
            statusCode: 403,
            severity: ErrorSeverity.MEDIUM,
            category: ErrorCategory.AUTHORIZATION,
            requestId: 'req_abc123xyz',
            timestamp: new Date().toISOString(),
            path: '/api/v1/example',
            method: 'GET',
          },
        },
      }),
    );
  }

  if (includeNotFound) {
    decorators.push(
      ApiResponse({
        status: 404,
        description: 'Not Found - Resource does not exist',
        schema: {
          $ref: getSchemaPath(StandardizedErrorResponse),
          example: {
            success: false,
            errorCode: ErrorCode.RESOURCE_NOT_FOUND,
            message: 'The requested resource was not found.',
            statusCode: 404,
            severity: ErrorSeverity.LOW,
            category: ErrorCategory.BUSINESS_LOGIC,
            requestId: 'req_abc123xyz',
            timestamp: new Date().toISOString(),
            path: '/api/v1/example/123',
            method: 'GET',
          },
        },
      }),
    );
  }

  if (includeTooManyRequests) {
    decorators.push(
      ApiResponse({
        status: 429,
        description: 'Too Many Requests - Rate limit exceeded',
        schema: {
          $ref: getSchemaPath(StandardizedErrorResponse),
          example: {
            success: false,
            errorCode: ErrorCode.RATE_LIMIT_EXCEEDED,
            message: 'Too many requests. Please wait before trying again.',
            statusCode: 429,
            severity: ErrorSeverity.LOW,
            category: ErrorCategory.SYSTEM,
            requestId: 'req_abc123xyz',
            timestamp: new Date().toISOString(),
            path: '/api/v1/example',
            method: 'POST',
          },
        },
      }),
    );
  }

  if (includeInternalServerError) {
    decorators.push(
      ApiResponse({
        status: 500,
        description: 'Internal Server Error',
        schema: {
          $ref: getSchemaPath(StandardizedErrorResponse),
          example: {
            success: false,
            errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
            message: 'An internal server error occurred. Our team has been notified.',
            statusCode: 500,
            severity: ErrorSeverity.CRITICAL,
            category: ErrorCategory.SYSTEM,
            requestId: 'req_abc123xyz',
            timestamp: new Date().toISOString(),
            path: '/api/v1/example',
            method: 'GET',
          },
        },
      }),
    );
  }

  return applyDecorators(...decorators);
}

/**
 * Decorator to document a successful response with standard format
 * Includes success response documentation alongside common error responses
 */
export function ApiSuccessResponse(
  status: number = 200,
  description: string = 'Operation successful',
  dataType?: Type<unknown>,
): MethodDecorator {
  const decorators: MethodDecorator[] = [
    ApiOperation({ summary: description }),
    ApiExtraModels(StandardizedErrorResponse, ErrorDetail),
  ];

  decorators.push(
    ApiResponse({
      status,
      description,
      schema: dataType
        ? {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { $ref: getSchemaPath(dataType) },
              message: { type: 'string', example: 'Operation completed successfully' },
              timestamp: { type: 'string', example: new Date().toISOString() },
            },
          }
        : {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Operation completed successfully' },
              timestamp: { type: 'string', example: new Date().toISOString() },
            },
          },
    }),
  );

  return applyDecorators(...decorators);
}

/**
 * Document authentication-related error responses
 */
export function ApiAuthErrorResponses(): MethodDecorator {
  return ApiStandardErrorResponses(
    {
      status: 401,
      description: 'Authentication required',
      errorCode: ErrorCode.AUTH_UNAUTHORIZED,
      category: ErrorCategory.AUTHENTICATION,
    },
    {
      status: 401,
      description: 'Invalid or expired token',
      errorCode: ErrorCode.AUTH_TOKEN_EXPIRED,
      category: ErrorCategory.AUTHENTICATION,
    },
    {
      status: 403,
      description: 'Access forbidden',
      errorCode: ErrorCode.AUTH_FORBIDDEN,
      category: ErrorCategory.AUTHORIZATION,
    },
  );
}

/**
 * Document resource-related error responses (CRUD operations)
 */
export function ApiResourceErrorResponses(resourceName: string = 'Resource'): MethodDecorator {
  return ApiStandardErrorResponses(
    {
      status: 400,
      description: `Invalid ${resourceName.toLowerCase()} data`,
      errorCode: ErrorCode.VALIDATION_ERROR,
      category: ErrorCategory.VALIDATION,
    },
    {
      status: 404,
      description: `${resourceName} not found`,
      errorCode: ErrorCode.RESOURCE_NOT_FOUND,
      category: ErrorCategory.BUSINESS_LOGIC,
    },
    {
      status: 409,
      description: `${resourceName} already exists`,
      errorCode: ErrorCode.RESOURCE_ALREADY_EXISTS,
      category: ErrorCategory.BUSINESS_LOGIC,
    },
  );
}

/**
 * Document payment-related error responses
 */
export function ApiPaymentErrorResponses(): MethodDecorator {
  return ApiStandardErrorResponses(
    {
      status: 402,
      description: 'Payment failed',
      errorCode: ErrorCode.PAYMENT_FAILED,
      category: ErrorCategory.EXTERNAL,
      severity: ErrorSeverity.HIGH,
    },
    {
      status: 402,
      description: 'Payment declined',
      errorCode: ErrorCode.PAYMENT_DECLINED,
      category: ErrorCategory.EXTERNAL,
      severity: ErrorSeverity.MEDIUM,
    },
  );
}

/**
 * Document course-related error responses
 */
export function ApiCourseErrorResponses(): MethodDecorator {
  return ApiStandardErrorResponses(
    {
      status: 404,
      description: 'Course not found',
      errorCode: ErrorCode.COURSE_NOT_FOUND,
      category: ErrorCategory.BUSINESS_LOGIC,
    },
    {
      status: 409,
      description: 'Already enrolled in course',
      errorCode: ErrorCode.COURSE_ALREADY_ENROLLED,
      category: ErrorCategory.BUSINESS_LOGIC,
    },
    {
      status: 422,
      description: 'Prerequisite not met',
      errorCode: ErrorCode.COURSE_PREREQUISITE_NOT_MET,
      category: ErrorCategory.BUSINESS_LOGIC,
    },
  );
}
