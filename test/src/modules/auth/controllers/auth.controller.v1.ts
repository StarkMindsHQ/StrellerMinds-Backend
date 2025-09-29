import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LoginDto, RegisterDto } from '../dto';
import { ApiVersion, Deprecated } from '../../../common/decorators/api-version.decorator';

@ApiTags('Authentication v1')
@Controller({ path: 'auth', version: '1' })
@ApiVersion('v1')
@Deprecated('2024-01-01', '2024-12-31', 'https://docs.strellerminds.com/api/migration/v1-to-v2')
export class AuthControllerV1 {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login (deprecated)' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.loginV1(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration (deprecated)' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.registerV1(registerDto);
  }
}
