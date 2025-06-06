import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes.enum';
import { ErrorDetail } from './error-response.dto';
import { I18nService } from '../../i18n/i18n.service';

export class CustomException extends HttpException {
  constructor(
    readonly errorCode: ErrorCode,
    readonly i18n: I18nService,
    readonly lang: string,
    readonly messageKey: string,
    readonly statusCode: number,
    readonly details?: ErrorDetail[],
    readonly args?: Record<string, any>,
  ) {
    super(
      {
        errorCode,
        message: i18n.translate(messageKey, { lang, args }),
        details,
      },
      statusCode,
    );
  }
}