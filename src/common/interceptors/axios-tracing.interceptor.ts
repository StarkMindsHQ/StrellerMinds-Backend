import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { context, trace, propagation, SpanKind } from '@opentelemetry/api';

@Injectable()
export class AddTraceContextInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const http = ctx.switchToHttp();
    const req = http.getRequest();

    // attach info to current span
    const currentSpan = trace.getSpan(context.active());
    if (currentSpan && req?.user?.id) {
      currentSpan.setAttribute('enduser.id', req.user.id);
    }
    return next.handle().pipe(tap());
  }
}
