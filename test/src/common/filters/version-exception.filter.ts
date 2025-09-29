import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class VersionExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException 
      ? (exception as HttpException).getStatus() 
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const apiVersion = request.headers['api-version'] || 'v1';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      apiVersion,
      message: exception instanceof HttpException 
        ? (exception as HttpException).getResponse() 
        : 'Internal server error',
    };

    response.status(status).json(errorResponse);
  }
}
