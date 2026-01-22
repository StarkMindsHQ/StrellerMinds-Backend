import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode,
        message: data?.message || 'Request successful',
        // Standardization: handles nested 'result' or returns the raw data
        data: data?.result !== undefined ? data.result : data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}