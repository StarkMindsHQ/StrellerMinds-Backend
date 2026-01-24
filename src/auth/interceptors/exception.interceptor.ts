import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpException, HttpStatus } from '@nestjs/common';

export interface ErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  stack?: string;
}

@Injectable()
export class ExceptionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    return next.handle().pipe(
      catchError((error) => {
        const response: ErrorResponse = {
          success: false,
          message: error.message || 'Internal server error',
          statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        if (process.env.NODE_ENV === 'development') {
          response.stack = error.stack;
        }

        throw new HttpException(response, response.statusCode);
      }),
    );
  }
}
