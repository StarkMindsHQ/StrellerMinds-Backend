/**
 * AuthController handles authentication and authorization endpoints.
 */
import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  UnauthorizedException,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Injectable,
  BadRequestException,
  Req,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { AuthService } from './auth.service';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordValidationService } from './password-validation.service';
import { PasswordRequirementsDto } from './dto/password-requirements.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UsersService } from 'src/users/services/users.service';
import { RateLimitGuard } from 'src/common/guards/rate-limiter.guard';
import { AuthRateLimit } from 'src/common/decorators/rate-limit.decorator';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { JwtLocalStrategy } from './strategies/jwt-local.strategy';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly jwtLocalStrategy: JwtLocalStrategy,
    private readonly usersService: UsersService,
    private readonly passwordValidationService: PasswordValidationService,
    private readonly authService: AuthService,
  ) {}

  @AuthRateLimit.login()
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    const user = await this.jwtLocalStrategy.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.jwtLocalStrategy.login(user);
  }

  @AuthRateLimit.register()
  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Registration successful.' })
  @ApiResponse({ status: 429, description: 'Too many registration attempts' })
  async register(@Body() registerDto: RegisterDto) {
    try {
      const { email, password, ...userData } = registerDto;
      return await this.jwtLocalStrategy.register(registerDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Registration failed');
    }
  }

  @Get('password-requirements')
  @ApiOperation({ summary: 'Get password requirements' })
  @ApiResponse({ status: 200, description: 'Password requirements retrieved' })
  getPasswordRequirements(): PasswordRequirementsDto {
    return {
      requirements: this.passwordValidationService.getPasswordRequirements(),
    };
  }

  @AuthRateLimit.refreshToken()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refresh successful' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiResponse({ status: 429, description: 'Too many token refresh attempts' })
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshTokenDto) {
    if (!body.userId || !body.refreshToken) {
      throw new UnauthorizedException('Missing credentials');
    }
    return this.jwtLocalStrategy.refreshToken(body.userId, body.refreshToken);
  }

  @AuthRateLimit.passwordReset()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset requested' })
  @ApiResponse({ status: 429, description: 'Too many password reset attempts' })
  async forgotPassword(@Body('email') email: string) {
    return this.jwtLocalStrategy.requestPasswordReset(email);
  }

  @Get('validate-reset-token')
  @ApiOperation({ summary: 'Validate password reset token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async validateToken(@Query('token') token: string) {
    await this.jwtLocalStrategy.validateResetToken(token);
    return { message: 'Token is valid' };
  }

  @AuthRateLimit.passwordReset()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 429, description: 'Too many password reset attempts' })
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    return this.jwtLocalStrategy.resetPassword(resetDto.token, resetDto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @Request() req,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const userId = req.user.id;
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Current password and new password are required');
    }

    return this.jwtLocalStrategy.changePassword(userId, currentPassword, newPassword);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    await this.jwtLocalStrategy.logout(req.user.userId);
    return { message: 'Logout successful' };
  }

  // Redirect to Google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleLogin() {
    return { msg: 'Redirecting to Google OAuth' };
  }

  // Google callback
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req) {
    return this.authService.login('google', req.user);
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookLogin() {
    return { msg: 'Redirecting to Facebook OAuth' };
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req) {
    return this.authService.login('facebook', req.user);
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  async appleLogin() {
    return { msg: 'Redirecting to Apple Sign-In' };
  }

  @Post('apple/callback') // Apple uses POST with redirect_uri
  @UseGuards(AuthGuard('apple'))
  async appleCallback(@Req() req) {
    return this.authService.login('apple', req.user);
  }

  // Account linking (example)
  @Post('link')
  async linkAccount(@Query('provider') provider: string, @Body() credentials: any) {
    try {
      return await this.authService.register(provider, credentials);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

@Injectable()
export class JwtAuthStrategy extends JwtStrategy {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub };
  }
}
