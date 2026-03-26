import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MetricsService } from '../../metrics/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const startTime = Date.now();

    // Track active connections
    this.metricsService.activeConnections.inc();

    return next.handle().pipe(
      tap((data) => {
        const duration = (Date.now() - startTime) / 1000;
        const res = context.switchToHttp().getResponse();
        const status = res.statusCode;

        this.metricsService.httpRequestDuration.set({ method, route: url }, duration);
        this.metricsService.httpRequestsTotal.inc({ method, route: url, status });
        this.metricsService.activeConnections.dec();
      }),
      catchError((error) => {
        const duration = (Date.now() - startTime) / 1000;
        const status = error.status || 500;

        this.metricsService.httpRequestDuration.set({ method, route: url }, duration);
        this.metricsService.httpRequestsTotal.inc({ method, route: url, status });
        this.metricsService.errorTotal.inc({ type: error.name || 'UnknownError' });
        this.metricsService.activeConnections.dec();

        throw error;
      }),
    );
  }
}
