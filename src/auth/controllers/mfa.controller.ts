import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { MfaService } from '../services/mfa.service';
import { MfaTokenDto } from '../dtos/mfa.dto';
import { JwtCookieGuard } from '../guards/jwt-cookie.guard';

interface AuthRequest {
  user: { id: string };
}

@ApiTags('MFA')
@UseGuards(JwtCookieGuard)
@ApiBearerAuth('bearerAuth')
@Controller('auth/mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Post('setup')
  @ApiOperation({
    summary: 'Setup multi-factor authentication',
    description: 'Initiates MFA setup for the authenticated user. Returns QR code and backup codes.',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA setup initiated',
    schema: {
      type: 'object',
      properties: {
        qrCode: { type: 'string', description: 'QR code for authenticator app' },
        secret: { type: 'string', description: 'Secret key for manual entry' },
        backupCodes: { type: 'array', items: { type: 'string' }, description: 'Backup codes for account recovery' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - no valid token provided',
  })
  setup(@Req() req: AuthRequest) {
    return this.mfaService.setupMfa(req.user.id);
  }

  @Post('verify')
  @ApiOperation({
    summary: 'Verify and enable MFA',
    description: 'Verifies the MFA token from authenticator app and enables MFA for the user.',
  })
  @ApiBody({ type: MfaTokenDto })
  @ApiResponse({
    status: 200,
    description: 'MFA enabled successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'MFA enabled successfully' },
        backupCodes: { type: 'array', items: { type: 'string' }, description: 'Backup codes for account recovery' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid token format (must be 6 digits)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid MFA token or no valid JWT',
  })
  verify(@Req() req: AuthRequest, @Body() dto: MfaTokenDto) {
    return this.mfaService.verifyAndEnable(req.user.id, dto.token);
  }

  @Post('disable')
  @ApiOperation({
    summary: 'Disable multi-factor authentication',
    description: 'Disables MFA for the authenticated user. Requires current MFA token for verification.',
  })
  @ApiBody({ type: MfaTokenDto })
  @ApiResponse({
    status: 200,
    description: 'MFA disabled successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'MFA disabled successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid token format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid MFA token or no valid JWT',
  })
  disable(@Req() req: AuthRequest, @Body() dto: MfaTokenDto) {
    return this.mfaService.disable(req.user.id, dto.token);
  }
}
