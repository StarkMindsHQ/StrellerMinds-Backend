import { Injectable } from '@nestjs/common';
import { Response, Request } from 'express';
import {
  JWT_COOKIE_CONFIG,
  REFRESH_TOKEN_COOKIE_CONFIG,
  getCookieOptions,
} from '../config/cookie.config';

/**
 * Service for managing JWT tokens via secure httpOnly cookies
 */
@Injectable()
export class CookieTokenService {
  /**
   * Set access token as httpOnly cookie
   */
  setAccessTokenCookie(response: Response, token: string): void {
    response.cookie(
      JWT_COOKIE_CONFIG.name,
      token,
      getCookieOptions(JWT_COOKIE_CONFIG),
    );
  }

  /**
   * Set refresh token as httpOnly cookie
   */
  setRefreshTokenCookie(response: Response, token: string): void {
    response.cookie(
      REFRESH_TOKEN_COOKIE_CONFIG.name,
      token,
      getCookieOptions(REFRESH_TOKEN_COOKIE_CONFIG),
    );
  }

  /**
   * Set both access and refresh tokens
   */
  setAuthTokenCookies(response: Response, accessToken: string, refreshToken: string): void {
    this.setAccessTokenCookie(response, accessToken);
    this.setRefreshTokenCookie(response, refreshToken);
  }

  /**
   * Get access token from cookies
   */
  getAccessToken(request: Request): string | undefined {
    return request.cookies?.[JWT_COOKIE_CONFIG.name];
  }

  /**
   * Get refresh token from cookies
   */
  getRefreshToken(request: Request): string | undefined {
    return request.cookies?.[REFRESH_TOKEN_COOKIE_CONFIG.name];
  }

  /**
   * Clear access token cookie
   */
  clearAccessTokenCookie(response: Response): void {
    response.clearCookie(JWT_COOKIE_CONFIG.name, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  /**
   * Clear refresh token cookie
   */
  clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(REFRESH_TOKEN_COOKIE_CONFIG.name, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  /**
   * Clear all auth cookies (logout)
   */
  clearAuthTokenCookies(response: Response): void {
    this.clearAccessTokenCookie(response);
    this.clearRefreshTokenCookie(response);
  }

  /**
   * Check if cookies are available
   */
  hasAuthTokens(request: Request): boolean {
    return !!(
      this.getAccessToken(request) && this.getRefreshToken(request)
    );
  }

  /**
   * Check if request has valid token structure
   */
  hasAccessToken(request: Request): boolean {
    return !!this.getAccessToken(request);
  }
}
