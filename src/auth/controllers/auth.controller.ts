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
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
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
    description: 'Generates a CSRF token and sets it as a cookie. Include this token in the X-CSRF-Token header for all state-changing requests.',
  })
  @ApiResponse({
    status: 200,
    description: 'CSRF token generated successfully',
    content: {
      'application/json': {
        example: { csrfToken: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4' },
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
    description: 'Authenticates a user with email and password. On success, sets httpOnly cookie tokens and returns user info.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Auth tokens are set as httpOnly cookies.',
    content: {
      'application/json': {
        example: {
          user: {
            id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            email: 'alice@example.com',
            firstName: 'Alice',
            lastName: 'Smith',
            isActive: true,
            createdAt: '2024-01-15T10:30:00.000Z',
          },
          message: 'Login successful',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    content: {
      'application/json': {
        example: { statusCode: 401, message: 'Invalid email or password', error: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many login attempts',
    content: {
      'application/json': {
        example: { statusCode: 429, message: 'Too many requests, please try again later.', error: 'Too Many Requests' },
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('register')
  @UseGuards(RateLimitGuard('REGISTER'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account. A verification email is sent after successful registration.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    content: {
      'application/json': {
        example: {
          user: {
            id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            email: 'alice@example.com',
            firstName: 'Alice',
            lastName: 'Smith',
            isActive: false,
            createdAt: '2024-01-15T10:30:00.000Z',
          },
          message: 'Registration successful. Please verify your email.',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    content: {
      'application/json': {
        example: {
          statusCode: 400,
          message: ['email must be a valid email address', 'Passwords do not match'],
          error: 'Bad Request',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email already in use',
    content: {
      'application/json': {
        example: { statusCode: 409, message: 'Email already registered', error: 'Conflict' },
      },
    },
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
    description: 'Issues a new access token using a valid refresh token. The new token is set as an httpOnly cookie.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    content: {
      'application/json': {
        example: { message: 'Token refreshed successfully', expiresIn: '15m' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
    content: {
      'application/json': {
        example: { statusCode: 401, message: 'Refresh token is invalid or expired', error: 'Unauthorized' },
      },
    },
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('forgot-password')
  @UseGuards(RateLimitGuard('FORGOT_PASSWORD'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends a password reset link to the provided email address if an account exists.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (response is the same whether the email exists or not)',
    content: {
      'application/json': {
        example: { message: 'If that email is registered, a reset link has been sent.' },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
    content: {
      'application/json': {
        example: { statusCode: 429, message: 'Too many requests, please try again later.', error: 'Too Many Requests' },
      },
    },
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @UseGuards(RateLimitGuard('RESET_PASSWORD'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Resets the user password using the token received via email.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    content: {
      'application/json': {
        example: { message: 'Password has been reset successfully.' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
    content: {
      'application/json': {
        example: { statusCode: 400, message: 'Reset token is invalid or has expired', error: 'Bad Request' },
      },
    },
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
    description: 'Confirms the user email address using the token sent during registration.',
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    content: {
      'application/json': {
        example: { message: 'Email verified successfully. Your account is now active.' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification token',
    content: {
      'application/json': {
        example: { statusCode: 400, message: 'Verification token is invalid or has expired', error: 'Bad Request' },
      },
    },
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @Post('update-password')
  @UseGuards()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update password',
    description: 'Updates the authenticated user password. Requires the current password for verification.',
  })
  @ApiBody({ type: UpdatePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
    content: {
      'application/json': {
        example: { message: 'Password updated successfully.' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Current password is incorrect or validation failed',
    content: {
      'application/json': {
        example: { statusCode: 400, message: 'Current password is incorrect', error: 'Bad Request' },
      },
    },
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
    description: 'Evaluates the strength of a given password without storing it.',
  })
  @ApiBody({ type: CheckPasswordStrengthDto })
  @ApiResponse({
    status: 200,
    description: 'Password strength evaluation result',
    content: {
      'application/json': {
        example: {
          isValid: true,
          strength: 'strong',
          percentage: 85,
          description: 'Strong password',
          errors: [],
          score: 4,
        },
      },
    },
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
    description: 'Returns the current password requirements enforced by the application.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password policy rules',
    content: {
      'application/json': {
        example: {
          minLength: 8,
          maxLength: 128,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        },
      },
    },
  })
  getPasswordPolicy() {
    return this.passwordStrengthService.getPasswordPolicy();
  }

  @Get('profile')
  @UseGuards()
  @ApiOperation({
    summary: 'Get auth profile',
    description: 'Returns a simple confirmation that the auth module is working.',
  })
  @ApiResponse({
    status: 200,
    description: 'Auth module status',
    content: {
      'application/json': {
        example: { message: 'Auth working' },
      },
    },
  })
  getProfile() {
    return { message: 'Auth working' };
  }
}
