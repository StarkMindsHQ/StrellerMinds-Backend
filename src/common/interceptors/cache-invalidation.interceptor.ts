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
        // Automatically invalidate on any state-changing request
        if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
          await this.cacheManager.reset(); 
        }
      }),
    );
  }
}