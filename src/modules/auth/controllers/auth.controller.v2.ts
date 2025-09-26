import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LoginDtoV2, RegisterDtoV2 } from '../dto';
import { ApiVersion } from '../../../common/decorators/api-version.decorator';
import { AuthRateLimit } from '../../../common/decorators/rate-limit.decorator';

@ApiTags('Authentication v2')
@Controller({ path: 'auth', version: '2' })
@ApiVersion('v2')
export class AuthControllerV2 {
  constructor(private authService: AuthService) {}

  @AuthRateLimit.login()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enhanced user login' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async login(@Body() loginDto: LoginDtoV2) {
    return this.authService.loginV2(loginDto);
  }

  @AuthRateLimit.register()
  @Post('register')
  @ApiOperation({ summary: 'Enhanced user registration' })
  @ApiResponse({ status: 429, description: 'Too many registration attempts' })
  async register(@Body() registerDto: RegisterDtoV2) {
    return this.authService.registerV2(registerDto);
  }
}
