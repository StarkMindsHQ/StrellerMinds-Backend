import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler, Logger } from "@nestjs/common"
import type { Observable } from "rxjs"
import { tap } from "rxjs/operators"

@Injectable()
export class AnalyticsLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AnalyticsLoggingInterceptor.name)

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const { method, url, user } = request
    const startTime = Date.now()

    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now()
        const duration = endTime - startTime

        this.logger.log(`Analytics API accessed: ${method} ${url} by user ${user?.id} (${user?.role}) - ${duration}ms`)
      }),
    )
  }
}
