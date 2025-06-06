import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheManagerService } from '../services/cache-manager.service';

@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInvalidationInterceptor.name);

  constructor(
    private cacheManager: CacheManagerService,
    private eventEmitter: EventEmitter2,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (response) => {
        await this.invalidateRelatedCache(method, url, request, response);
      }),
    );
  }

  private async invalidateRelatedCache(
    method: string,
    url: string,
    request: any,
    response: any,
  ): Promise<void> {
    try {
      const invalidationPatterns = this.getInvalidationPatterns(method, url, request);
      
      if (invalidationPatterns.length > 0) {
        await this.cacheManager.invalidateCache(invalidationPatterns);
        this.logger.debug(`Cache invalidated for patterns: ${invalidationPatterns.join(', ')}`);
      }

      this.emitInvalidationEvents(method, url, request, response);
    } catch (error) {
      this.logger.error('Error during cache invalidation:', error);
    }
  }

  private getInvalidationPatterns(method: string, url: string, request: any): string[] {
    const patterns: string[] = [];

    const urlParts = url.split('/').filter(part => part);
    const resource = urlParts[0]; 

    switch (method) {
      case 'POST':
        patterns.push(`GET:/${resource}*`);
        patterns.push(`${resource}:*`);
        break;

      case 'PUT':
      case 'PATCH':
        const resourceId = urlParts[1];
        if (resourceId) {
          patterns.push(`*:/${resource}/${resourceId}*`);
          patterns.push(`${resource}:${resourceId}:*`);
        }
        patterns.push(`GET:/${resource}*`);
        patterns.push(`${resource}:*`);
        break;

      case 'DELETE':
       const deleteId = urlParts[1];
        if (deleteId) {
          patterns.push(`*:/${resource}/${deleteId}*`);
          patterns.push(`${resource}:${deleteId}:*`);
        }
        patterns.push(`GET:/${resource}*`);
        patterns.push(`${resource}:*`);
        break;
    }

    return patterns;
  }

  private emitInvalidationEvents(
    method: string,
    url: string,
    request: any,
    response: any,
  ): void {
    const urlParts = url.split('/').filter(part => part);
    const resource = urlParts[0];
    const resourceId = urlParts[1];

    switch (method) {
      case 'POST':
        this.eventEmitter.emit(`${resource}.created`, {
          resource,
          data: response,
          request: request.body,
        });
        break;

      case 'PUT':
      case 'PATCH':
        if (resourceId) {
          this.eventEmitter.emit(`${resource}.updated`, {
            resource,
            resourceId,
            data: response,
            request: request.body,
          });
        }
        break;

      case 'DELETE':
        if (resourceId) {
          this.eventEmitter.emit(`${resource}.deleted`, {
            resource,
            resourceId,
            data: response,
          });
        }
        break;
    }
  }
}
