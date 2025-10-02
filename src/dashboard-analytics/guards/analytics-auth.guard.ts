import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

@Injectable()
export class AnalyticsAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const query = request.query;

    // Admin can access all analytics
    if (user.role === 'admin') {
      return true;
    }

    // Instructors can only access their own course analytics
    if (user.role === 'instructor') {
      // If courseId is specified, verify instructor owns the course
      if (query.courseId) {
        // This would typically check against a course repository
        // For now, we'll assume the service handles this validation
        return true;
      }

      // If instructorId is specified, verify it matches current user
      if (query.instructorId && query.instructorId !== user.id) {
        throw new ForbiddenException('Instructors can only access their own analytics');
      }

      return true;
    }

    // Students cannot access analytics endpoints
    throw new ForbiddenException('Insufficient permissions to access analytics');
  }
}
