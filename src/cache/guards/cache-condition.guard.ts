import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class CacheConditionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    if (request.user) {
      return false;
    }
    
    const skipCacheHeaders = ['authorization', 'x-api-key'];
    const hasSkipHeaders = skipCacheHeaders.some(header => 
      request.headers[header] || request.headers[header.toLowerCase()]
    );
    
    if (hasSkipHeaders) {
      return false;
    }
    
    const writeOperations = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (writeOperations.includes(request.method)) {
      return false;
    }
    
    return true;
  }
}
