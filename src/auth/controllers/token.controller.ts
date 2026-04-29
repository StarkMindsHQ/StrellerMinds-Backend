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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
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
    summary: 'Logout',
    description: 'Clears all authentication token cookies, effectively logging the user out.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    content: {
      'application/json': {
        example: { message: 'Logged out successfully' },
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify token',
    description: 'Validates the current access token cookie and returns basic user info if valid.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token is valid',
    content: {
      'application/json': {
        example: {
          isValid: true,
          message: 'Token is valid',
          email: 'alice@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token is invalid or expired',
    content: {
      'application/json': {
        example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' },
      },
    },
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
    description: 'Removes only the access token cookie, forcing the client to use the refresh token on the next request.',
  })
  @ApiResponse({
    status: 200,
    description: 'Access token cleared',
    content: {
      'application/json': {
        example: { message: 'Access token cleared' },
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
    description: 'Removes only the refresh token cookie. The user will need to log in again once the access token expires.',
  })
  @ApiResponse({
    status: 200,
    description: 'Refresh token cleared',
    content: {
      'application/json': {
        example: { message: 'Refresh token cleared' },
      },
    },
  })
  clearRefreshToken(@Response() res: ExpressResponse) {
    this.cookieTokenService.clearRefreshTokenCookie(res);
    res.json({ message: 'Refresh token cleared' });
  }
}
