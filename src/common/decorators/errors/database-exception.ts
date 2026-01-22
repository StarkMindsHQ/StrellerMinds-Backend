// database.exception.ts
import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base-exception';
import { ErrorCode } from './error-code';

export class DatabaseException extends BaseException {
  constructor(message = 'Database operation failed', details?: any) {
    super(
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCode.DATABASE_ERROR,
      message,
      details,
    );
  }
}
