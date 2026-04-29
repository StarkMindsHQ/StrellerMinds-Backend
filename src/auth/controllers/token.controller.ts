import {
  Controller,
  Post,
  Response,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response as ExpressResponse, Request as ExpressRequest } from 'express';
import { CookieTokenService } from '../services/cookie-token.service';
import { JwtCookieGuard } from '../guards/jwt-cookie.guard';
import { LogoutResponseDto } from '../dtos/auth-response.dto';

/**
 * Token management controller for cookie-based JWT operations
 */
@ApiTags('Authentication')
@Controller('auth/tokens')
export class TokenController {
  constructor(private readonly cookieTokenService: CookieTokenService) {}

  /**
   * Logout endpoint - clears auth tokens from cookies
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User logout',
    description: 'Logs out the authenticated user by clearing authentication tokens from cookies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logged out successfully' },
      },
    },
  })
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
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Verify token validity',
    description: 'Verifies that the provided JWT token is valid and not expired. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token is valid',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Token is valid' },
        email: { type: 'string', format: 'email' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - token missing or invalid',
  })
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
  @ApiOperation({
    summary: 'Clear access token',
    description: 'Clears only the access token cookie, useful for forcing re-authentication while keeping refresh token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Access token cleared',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Access token cleared' },
      },
    },
  })
  clearAccessToken(@Response() res: ExpressResponse) {
    this.cookieTokenService.clearAccessTokenCookie(res);
    res.json({ message: 'Access token cleared' });
  }

  /**
   * Clear refresh token only
   */
  @Post('clear-refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear refresh token',
    description: 'Clears only the refresh token cookie, preventing token refresh operations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Refresh token cleared',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Refresh token cleared' },
      },
    },
  })
  clearRefreshToken(@Response() res: ExpressResponse) {
    this.cookieTokenService.clearRefreshTokenCookie(res);
    res.json({ message: 'Refresh token cleared' });
  }
}
