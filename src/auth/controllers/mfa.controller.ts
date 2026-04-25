import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { MfaService } from '../services/mfa.service';
import { MfaTokenDto } from '../dtos/mfa.dto';
import { JwtCookieGuard } from '../guards/jwt-cookie.guard';

interface AuthRequest {
  user: { id: string };
}

@UseGuards(JwtCookieGuard)
@Controller('auth/mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Post('setup')
  setup(@Req() req: AuthRequest) {
    return this.mfaService.setupMfa(req.user.id);
  }

  @Post('verify')
  verify(@Req() req: AuthRequest, @Body() dto: MfaTokenDto) {
    return this.mfaService.verifyAndEnable(req.user.id, dto.token);
  }

  @Post('disable')
  disable(@Req() req: AuthRequest, @Body() dto: MfaTokenDto) {
    return this.mfaService.disable(req.user.id, dto.token);
  }
}
