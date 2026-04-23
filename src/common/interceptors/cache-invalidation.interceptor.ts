import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { tap } from 'rxjs/operators';

@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const method = context.switchToHttp().getRequest().method;
    
    return next.handle().pipe(
      tap(async () => {
        if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
          // Check if 'stores' exists (modern cache-manager/keyv integration)
          if (this.cacheManager.stores) {
            await Promise.all(
              this.cacheManager.stores.map(store => store.clear())
            );
          }
        }
      }),
    );
  }
}