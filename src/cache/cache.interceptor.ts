import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';
import { createHash } from 'crypto';
import { CACHE_TTL, HTTP_CACHE_HEADERS } from './cache.constants';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest();
    
    // Skip caching for non-GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Generate ETag based on request
    const etag = this.generateETag(request);
    const lastModified = new Date().toUTCString();

    // Check if client has cached version
    const clientETag = request.headers['if-none-match'];
    const ifModifiedSince = request.headers['if-modified-since'];

    if (clientETag === etag || (ifModifiedSince && new Date(ifModifiedSince) >= new Date(lastModified))) {
      response.status(HttpStatus.NOT_MODIFIED);
      response.set({
        'ETag': etag,
        'Last-Modified': lastModified,
        'Cache-Control': HTTP_CACHE_HEADERS['Cache-Control'],
      });
      response.end();
      return new Observable();
    }

    return next.handle().pipe(
      tap((data) => {
        // Set cache headers for successful responses
        if (response.statusCode === HttpStatus.OK) {
          response.set({
            'ETag': etag,
            'Last-Modified': lastModified,
            'Cache-Control': HTTP_CACHE_HEADERS['Cache-Control'],
            'Vary': 'Accept, Authorization',
          });
        }
      }),
    );
  }

  private generateETag(request: any): string {
    const etagData = {
      url: request.url,
      method: request.method,
      query: request.query,
      headers: {
        'accept': request.headers['accept'],
        'accept-encoding': request.headers['accept-encoding'],
      },
    };
    
    return createHash('md5').update(JSON.stringify(etagData)).digest('hex');
  }
}