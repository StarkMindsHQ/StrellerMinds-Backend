import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const gqlContext = GqlExecutionContext.create(context);
    const info = gqlContext.getInfo();
    const args = gqlContext.getArgs();

    const cacheKey = this.generateCacheKey(info.fieldName, args);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return new Observable((observer) => {
        observer.next(cached.data);
        observer.complete();
      });
    }

    return next.handle().pipe(
      tap((data) => {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }),
    );
  }

  private generateCacheKey(fieldName: string, args: any): string {
    return `${fieldName}_${JSON.stringify(args)}`;
  }
}
