// validation.exception.ts
import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base-exception';
import { ErrorCode } from './error-code';

export class ValidationException extends BaseException {
  constructor(errors: any) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.VALIDATION_ERROR,
      'Validation failed',
      errors,
    );
  }
}
