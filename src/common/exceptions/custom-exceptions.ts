import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessLogicException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        message,
        error: 'Business Logic Error',
        details,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, identifier: string | number) {
    super(
      {
        message: `${resource} with identifier '${identifier}' not found`,
        error: 'Resource Not Found',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ValidationException extends HttpException {
  constructor(errors: any) {
    super(
      {
        message: 'Validation failed',
        error: 'Validation Error',
        details: errors,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message = 'Unauthorized access') {
    super(
      {
        message,
        error: 'Unauthorized',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class ForbiddenException extends HttpException {
  constructor(message = 'Access forbidden') {
    super(
      {
        message,
        error: 'Forbidden',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
