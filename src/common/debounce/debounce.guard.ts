import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DEBOUNCE_KEY } from './debounce.decorator';

interface DebounceOptions {
  windowMs: number;
  keyBy: 'ip' | 'user';
}

@Injectable()
export class DebounceGuard implements CanActivate {
  /** key → expiry timestamp */
  private readonly store = new Map<string, number>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<DebounceOptions>(DEBOUNCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) return true;

    const req = context.switchToHttp().getRequest();
    const routeKey = `${req.method}:${req.route?.path ?? req.url}`;
    const callerKey =
      options.keyBy === 'user' ? (req.user?.id ?? req.ip) : req.ip;
    const key = `${routeKey}:${callerKey}`;

    const now = Date.now();
    const expiry = this.store.get(key);

    if (expiry && now < expiry) {
      throw new HttpException(
        { message: 'Too many requests, please slow down.', retryAfter: expiry - now },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.store.set(key, now + options.windowMs);

    // Cleanup expired entries periodically to avoid memory leaks
    if (this.store.size > 10_000) {
      for (const [k, exp] of this.store) {
        if (now >= exp) this.store.delete(k);
      }
    }

    return true;
  }
}
