import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { RateLimiterPostgres } from 'rate-limiter-flexible';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private rateLimiter: RateLimiterPostgres;

  constructor(private dataSource: DataSource) {
    this.rateLimiter = new RateLimiterPostgres({
      storeClient: this.dataSource.driver['master'],
      tableName: 'rate_limiter',
      keyPrefix: 'auth',
      points: 5,
      duration: 60,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.ip;

    try {
      await this.rateLimiter.consume(key);
      return true;
    } catch {
      console.warn(`Rate limit exceeded for IP: ${req.ip}`);
      throw new HttpException('Too many requests. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
