/* eslint-disable prettier/prettier */
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RedisService } from 'src/shared/services/redis.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private redisService: RedisService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Extract token from request
    const request = context.switchToHttp().getRequest();
    const authHeader = request?.headers?.authorization;
    const token = authHeader?.split(' ')[1];
    if (token && (await this.redisService.isTokenBlacklisted(token))) {
      throw new UnauthorizedException('Token is blacklisted');
    }

    // Await and cast the result to boolean
    const result = await super.canActivate(context);
    return !!result;
  }

  handleRequest(err: any, user: any, info: any) {
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Token has expired');
    }
    if (err || !user) {
      throw new UnauthorizedException('Invalid token');
    }
    return user;
  }
}
