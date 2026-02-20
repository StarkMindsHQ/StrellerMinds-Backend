import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body, headers } = req;
    const startTime = Date.now();

    this.logger.log(
      `Incoming Request: ${method} ${url}`,
      JSON.stringify({ body, requestId: headers['x-request-id'] }),
    );

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        this.logger.log(
          `Response: ${method} ${url} - ${duration}ms`,
          JSON.stringify({ requestId: headers['x-request-id'] }),
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error(
          `Error: ${method} ${url} - ${duration}ms`,
          error.stack,
          JSON.stringify({ requestId: headers['x-request-id'] }),
        );
        throw error;
      }),
    );
  }
}
