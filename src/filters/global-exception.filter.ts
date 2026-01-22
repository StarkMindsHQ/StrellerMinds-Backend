import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from 'express';
import { BaseException } from "src/common/decorators/errors/base-exception";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Something went wrong';
    let details = null;

    if (exception instanceof BaseException) {
      status = (exception as BaseException).statusCode;
      errorCode = (exception as BaseException).errorCode;
      message = (exception as BaseException).message;
      details = (exception as BaseException).details;
    } 
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      if (typeof errorResponse === 'object' && errorResponse !== null) {
        message = (errorResponse as any).message || exception.message;
        errorCode = (errorResponse as any).errorCode || errorCode;
        details = (errorResponse as any).details || details;
      }
      else {
        message = exception.message;
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      errorCode,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
