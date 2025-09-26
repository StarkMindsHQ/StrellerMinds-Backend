import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LoginDto, RegisterDto } from '../dto';
import { ApiVersion, Deprecated } from '../../../common/decorators/api-version.decorator';
import { AuthRateLimit } from '../../../common/decorators/rate-limit.decorator';

@ApiTags('Authentication v1')
@Controller({ path: 'auth', version: '1' })
@ApiVersion('v1')
@Deprecated('2024-01-01', '2024-12-31', 'https://docs.strellerminds.com/api/migration/v1-to-v2')
export class AuthControllerV1 {
  constructor(private authService: AuthService) {}

  @AuthRateLimit.login()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login (deprecated)' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.loginV1(loginDto);
  }

  @AuthRateLimit.register()
  @Post('register')
  @ApiOperation({ summary: 'User registration (deprecated)' })
  @ApiResponse({ status: 429, description: 'Too many registration attempts' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.registerV1(registerDto);
  }
}
