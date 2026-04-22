import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  UseFilters,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
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
import { ValidationExceptionFilter } from '../filters';

@Controller('auth')
@UseFilters(ValidationExceptionFilter)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordStrengthService: PasswordStrengthService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.firstName,
      registerDto.lastName,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.resetToken,
      resetPasswordDto.newPassword,
    );
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @Post('update-password')
  @UseGuards()
  @HttpCode(HttpStatus.OK)
  async updatePassword(@Body() updatePasswordDto: UpdatePasswordDto) {
    return this.authService.updatePassword(
      updatePasswordDto.currentPassword,
      updatePasswordDto.newPassword,
    );
  }

  @Post('check-password-strength')
  @HttpCode(HttpStatus.OK)
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
  getPasswordPolicy() {
    return this.passwordStrengthService.getPasswordPolicy();
  }

  @Get('profile')
  @UseGuards()
  getProfile() {
    return { message: 'Auth working' };
  }
}
