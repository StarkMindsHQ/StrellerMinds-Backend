import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard for JWT authentication using httpOnly cookies
 * Automatically extracts tokens from secure cookies
 */
@Injectable()
export class JwtCookieGuard extends AuthGuard('jwt-cookie') {}
