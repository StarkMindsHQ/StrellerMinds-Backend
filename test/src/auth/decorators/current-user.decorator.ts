import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

// Extend the Request interface to include the 'user' property
declare module 'express' {
  export interface Request {
    user?: any;
  }
}

export const CurrentUser = createParamDecorator(
  (
    data: { required?: boolean } = { required: true },
    ctx: ExecutionContext,
  ) => {
    const request = ctx.switchToHttp().getRequest<Request>();

    // Get user from request - the exact property may vary based on your auth implementation
    const user = request.user;

    // Check if authentication is required but user is not present
    if (data.required && !user) {
      throw new UnauthorizedException('User authentication required');
    }

    return user;
  },
);

export const OptionalUser = createParamDecorator(
  (data: any, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
