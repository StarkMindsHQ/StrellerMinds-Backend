import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  UseFilters,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { CookieTokenService } from '../services/cookie-token.service';
import { PasswordStrengthService } from '../services/password-strength.service';

import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ResetPasswordDto,
  UpdatePasswordDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  CheckPasswordStrengthDto,
} from '../dtos';
import { RateLimitGuard } from '../guards';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordStrengthService: PasswordStrengthService,
    private readonly cookieTokenService: CookieTokenService,
  ) {}

  @Get('csrf-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get CSRF token',
    description: 'Retrieves a CSRF token for state-changing operations. Token is set in httpOnly cookie.',
  })
  @ApiResponse({
    status: 200,
    description: 'CSRF token generated successfully',
    schema: {
      type: 'object',
      properties: {
        csrfToken: { type: 'string', description: 'CSRF token for request validation' },
      },
    },
  })
  async getCsrfToken(@Res({ passthrough: true }) res: Response) {
    const token = this.cookieTokenService.generateCsrfToken();
    this.cookieTokenService.setCsrfCookie(res, token);
    return { csrfToken: token };
  }

  @Post('login')
  @UseGuards(RateLimitGuard('LOGIN'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates a user with email and password. Returns user info; JWT tokens are set in secure httpOnly cookies.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Access token set in httpOnly cookie.',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string', example: 'Login successful' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid email or password format',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many login attempts - rate limit exceeded',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('register')
  @UseGuards(RateLimitGuard('REGISTER'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'User registration',
    description: 'Registers a new user account. Password must be strong (uppercase, lowercase, numbers, special chars). Passwords must match.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Registration successful',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string', example: 'Registration successful' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid input or password too weak',
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists with this email',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many registration attempts - rate limit exceeded',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.firstName,
      registerDto.lastName,
    );
  }

  @Post('refresh')
  @UseGuards(RateLimitGuard('REFRESH_TOKEN'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Refreshes an expired access token using a valid refresh token. New access token is set in httpOnly cookie.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Token refreshed successfully' },
        expiresIn: { type: 'string', example: '15m' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid JWT format',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many refresh attempts - rate limit exceeded',
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('forgot-password')
  @UseGuards(RateLimitGuard('FORGOT_PASSWORD'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Initiates password reset flow. Sends reset link to user email. Does not reveal whether email exists (security best practice).',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (or silently ignored if email not found)',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'If email exists, password reset link has been sent' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid email format',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many password reset requests - rate limit exceeded',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @UseGuards(RateLimitGuard('RESET_PASSWORD'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Completes password reset using token from email. Passwords must match and be strong.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password reset successful' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid input or password too weak',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired reset token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many password reset attempts - rate limit exceeded',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.resetToken,
      resetPasswordDto.newPassword,
    );
  }

  @Post('verify-email')
  @UseGuards(RateLimitGuard('VERIFY_EMAIL'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description: 'Verifies user email using token sent to email address during registration.',
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Email verified successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid token format',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired verification token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many verification attempts - rate limit exceeded',
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @Post('update-password')
  @UseGuards()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Update password (authenticated)',
    description: 'Updates password for authenticated user. Requires current password and new strong password.',
  })
  @ApiBody({ type: UpdatePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password updated successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid input or password too weak',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid current password',
  })
  async updatePassword(@Body() updatePasswordDto: UpdatePasswordDto) {
    // TODO: pass req.user.id once JWT guard is properly wired
    const userId = 'TODO-get-from-jwt-guard';
    return this.authService.updatePassword(
      userId,
      updatePasswordDto.currentPassword,
      updatePasswordDto.newPassword,
    );
  }

  @Post('check-password-strength')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check password strength',
    description: 'Validates password strength and returns detailed feedback on requirements met.',
  })
  @ApiBody({ type: CheckPasswordStrengthDto })
  @ApiResponse({
    status: 200,
    description: 'Password strength analysis',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean', description: 'Whether password meets all requirements' },
        strength: { type: 'string', enum: ['weak', 'fair', 'good', 'strong'], description: 'Password strength level' },
        percentage: { type: 'number', minimum: 0, maximum: 100, description: 'Strength percentage' },
        description: { type: 'string', description: 'Human-readable strength description' },
        errors: { type: 'array', items: { type: 'string' }, description: 'List of unmet requirements' },
        score: { type: 'number', description: 'Numeric strength score' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - password field missing',
  })
  checkPasswordStrength(@Body() checkPasswordStrengthDto: CheckPasswordStrengthDto) {
    const validationResult = this.passwordStrengthService.validatePassword(
      checkPasswordStrengthDto.password,
    );
    const strengthDetails = this.passwordStrengthService.getPasswordStrengthDetails(
      checkPasswordStrengthDto.password,
    );

    return {
      isValid: validationResult.isValid,
      strength: strengthDetails.strength,
      percentage: strengthDetails.percentage,
      description: strengthDetails.description,
      errors: validationResult.errors,
      score: validationResult.score,
    };
  }

  @Get('password-policy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get password policy',
    description: 'Returns the password policy requirements for the application.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password policy retrieved',
    schema: {
      type: 'object',
      properties: {
        minLength: { type: 'number', example: 8 },
        maxLength: { type: 'number', example: 128 },
        requireUppercase: { type: 'boolean', example: true },
        requireLowercase: { type: 'boolean', example: true },
        requireNumbers: { type: 'boolean', example: true },
        requireSpecialChars: { type: 'boolean', example: true },
        specialChars: { type: 'string', example: '!@#$%^&*()_+-=[]{}|;:,.<>?' },
      },
    },
  })
  getPasswordPolicy() {
    return this.passwordStrengthService.getPasswordPolicy();
  }

  @Get('profile')
  @UseGuards()
  @ApiBearerAuth('bearerAuth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get authenticated user profile',
    description: 'Retrieves the profile of the currently authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Auth working' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - no valid token provided',
  })
  getProfile() {
    return { message: 'Auth working' };
  }
}
