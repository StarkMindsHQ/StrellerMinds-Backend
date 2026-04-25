import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const SLOW_THRESHOLD_MS = 1000;

@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseTimeInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = process.hrtime.bigint();
    const req = context.switchToHttp().getRequest<{ method: string; url: string }>();

    return next.handle().pipe(
      tap(() => {
        const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        const res = context.switchToHttp().getResponse<{ setHeader: (k: string, v: string) => void }>();
        res.setHeader('X-Response-Time', `${elapsedMs.toFixed(2)}ms`);

        if (elapsedMs > SLOW_THRESHOLD_MS) {
          this.logger.warn(
            `SLOW REQUEST: ${req.method} ${req.url} — ${elapsedMs.toFixed(0)}ms`,
          );
        }
      }),
    );
  }
}
