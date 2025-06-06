import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheManagerService } from '../services/cache-manager.service';
import { CACHEABLE_KEY } from '../decorators/cacheable.decorator';
import { CACHE_KEY_OPTIONS } from '../decorators/cache-key.decorator';
import { CACHE_TTL_KEY } from '../decorators/cache-ttl.decorator';
import { CacheConfig, CacheKeyOptions } from '../interfaces/cache-config.interface';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private cacheManager: CacheManagerService,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheConfig = this.reflector.get<CacheConfig>(
      CACHEABLE_KEY,
      context.getHandler(),
    );

    if (!cacheConfig) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    if (cacheConfig.condition && !cacheConfig.condition(context)) {
      return next.handle();
    }

    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = this.generateCacheKey(context, cacheConfig);
    
    try {
      const cachedResponse = await this.cacheManager.getCachedResponse(cacheKey);
      
      if (cachedResponse) {
        this.logger.debug(`Serving cached response for key: ${cacheKey}`);
        
        response.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
        });
        
        return of(cachedResponse);
      }

      return next.handle().pipe(
        tap(async (data) => {
          const ttl = this.getTTL(context, cacheConfig);
          await this.cacheManager.cacheResponse(cacheKey, data, ttl);
          
          response.set({
            'X-Cache': 'MISS',
            'X-Cache-Key': cacheKey,
            'X-Cache-TTL': ttl.toString(),
          });
          
          this.logger.debug(`Response cached with key: ${cacheKey}, TTL: ${ttl}`);
        }),
      );
    } catch (error) {
      this.logger.error(`Cache error for key ${cacheKey}:`, error);
      return next.handle();
    }
  }

  private generateCacheKey(context: ExecutionContext, config: CacheConfig): string {
    const request = context.switchToHttp().getRequest();
    const keyOptions = this.reflector.get<CacheKeyOptions>(
      CACHE_KEY_OPTIONS,
      context.getHandler(),
    ) || {};

    if (keyOptions.customKey) {
      return keyOptions.customKey(context);
    }

    const method = request.method;
    const url = request.url;
    const query = keyOptions.includeQuery ? request.query : undefined;
    const headers = keyOptions.includeHeaders 
      ? this.extractHeaders(request.headers, keyOptions.includeHeaders)
      : undefined;
    const body = keyOptions.includeBody ? request.body : undefined;

    return this.cacheManager.generateCacheKey(
      method,
      url,
      query,
      headers,
      body,
      config.keyPrefix || keyOptions.prefix,
    );
  }

  private extractHeaders(allHeaders: any, headerNames: string[]): any {
    const headers = {};
    headerNames.forEach(name => {
      if (allHeaders[name]) {
        headers[name] = allHeaders[name];
      }
    });
    return headers;
  }

  private getTTL(context: ExecutionContext, config: CacheConfig): number {
    const customTTL = this.reflector.get<number>(
      CACHE_TTL_KEY,
      context.getHandler(),
    );
    
    return customTTL || config.ttl || 300; 
  }
}
