import { Request } from 'express';

/**
 * JWT payload attached to request.user after authentication.
 * Matches the shape produced by JwtService (auth/services/jwt.service.ts).
 * Use .sub for user id (JWT standard); .id is optional alias for compatibility.
 */
export interface RequestUser {
  sub: string;
  /** Optional alias for sub; set by auth guard for backward compatibility */
  id?: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Express Request with optional user (set by JwtAuthGuard or OptionalJwtAuthGuard).
 */
export interface RequestWithUser extends Request {
  user?: RequestUser;
}
