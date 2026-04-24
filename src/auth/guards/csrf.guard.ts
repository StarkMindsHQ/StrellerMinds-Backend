import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { CSRF_COOKIE_CONFIG } from '../config/cookie.config';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip CSRF check for safe methods
    if (this.safeMethods.includes(request.method)) {
      return true;
    }

    const csrfCookie = request.cookies[CSRF_COOKIE_CONFIG.name];
    const csrfHeader = request.headers['x-csrf-token'];

    if (!csrfCookie || !csrfHeader) {
      throw new ForbiddenException('CSRF token missing');
    }

    if (csrfCookie !== csrfHeader) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}
