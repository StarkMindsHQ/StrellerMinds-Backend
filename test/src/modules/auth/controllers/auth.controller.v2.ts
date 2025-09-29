import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LoginDtoV2, RegisterDtoV2 } from '../dto';
import { ApiVersion } from '../../../common/decorators/api-version.decorator';

@ApiTags('Authentication v2')
@Controller({ path: 'auth', version: '2' })
@ApiVersion('v2')
export class AuthControllerV2 {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enhanced user login' })
  async login(@Body() loginDto: LoginDtoV2) {
    return this.authService.loginV2(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Enhanced user registration' })
  async register(@Body() registerDto: RegisterDtoV2) {
    return this.authService.registerV2(registerDto);
  }
}
