import {
  Controller,
  Post,
  Response,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response as ExpressResponse, Request as ExpressRequest } from 'express';
import { CookieTokenService } from '../services/cookie-token.service';
import { JwtCookieGuard } from '../guards/jwt-cookie.guard';
import { LogoutResponseDto } from '../dtos/auth-response.dto';

/**
 * Token management controller for cookie-based JWT operations
 */
@Controller('auth/tokens')
export class TokenController {
  constructor(private readonly cookieTokenService: CookieTokenService) {}

  /**
   * Logout endpoint - clears auth tokens from cookies
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Response() res: ExpressResponse) {
    this.cookieTokenService.clearAuthTokenCookies(res);
    res.json(new LogoutResponseDto());
  }

  /**
   * Verify token validity without action
   */
  @Post('verify')
  @UseGuards(JwtCookieGuard)
  @HttpCode(HttpStatus.OK)
  verifyToken(@Request() req: ExpressRequest) {
    const user = (req as any).user;
    return {
      isValid: true,
      message: 'Token is valid',
      email: user.email,
    };
  }

  /**
   * Clear access token only (useful for forced re-login on certain conditions)
   */
  @Post('clear-access')
  @HttpCode(HttpStatus.OK)
  clearAccessToken(@Response() res: ExpressResponse) {
    this.cookieTokenService.clearAccessTokenCookie(res);
    res.json({ message: 'Access token cleared' });
  }

  /**
   * Clear refresh token only
   */
  @Post('clear-refresh')
  @HttpCode(HttpStatus.OK)
  clearRefreshToken(@Response() res: ExpressResponse) {
    this.cookieTokenService.clearRefreshTokenCookie(res);
    res.json({ message: 'Refresh token cleared' });
  }
}
