import { HttpException } from '@nestjs/common';
import { ErrorCode } from './error-codes.enum';
import { ErrorDetail } from './error-response.dto';

export class CustomException extends HttpException {
  constructor(
    readonly errorCode: ErrorCode,
    readonly message: string,
    readonly statusCode: number,
    readonly details?: ErrorDetail[],
  ) {
    super(
      {
        errorCode,
        message,
        details,
      },
      statusCode,
    );
  }
}