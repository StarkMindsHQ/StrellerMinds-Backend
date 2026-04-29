import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MfaService } from '../services/mfa.service';
import { MfaTokenDto } from '../dtos/mfa.dto';
import { JwtCookieGuard } from '../guards/jwt-cookie.guard';

interface AuthRequest {
  user: { id: string };
}

@ApiTags('Authentication')
@ApiBearerAuth()
@UseGuards(JwtCookieGuard)
@Controller('auth/mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Post('setup')
  @ApiOperation({
    summary: 'Set up MFA',
    description: 'Initiates MFA setup for the authenticated user. Returns a TOTP secret and QR code URL to scan with an authenticator app.',
  })
  @ApiResponse({
    status: 201,
    description: 'MFA setup initiated',
    content: {
      'application/json': {
        example: {
          secret: 'JBSWY3DPEHPK3PXP',
          otpauthUrl: 'otpauth://totp/StrellerMinds:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=StrellerMinds',
          qrCodeUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized – valid session cookie required',
    content: {
      'application/json': {
        example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' },
      },
    },
  })
  setup(@Req() req: AuthRequest) {
    return this.mfaService.setupMfa(req.user.id);
  }

  @Post('verify')
  @ApiOperation({
    summary: 'Verify and enable MFA',
    description: 'Verifies the TOTP token from the authenticator app and enables MFA on the account.',
  })
  @ApiBody({ type: MfaTokenDto })
  @ApiResponse({
    status: 201,
    description: 'MFA enabled successfully',
    content: {
      'application/json': {
        example: { message: 'MFA has been enabled on your account.' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid TOTP token',
    content: {
      'application/json': {
        example: { statusCode: 400, message: 'Invalid MFA token', error: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    content: {
      'application/json': {
        example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' },
      },
    },
  })
  verify(@Req() req: AuthRequest, @Body() dto: MfaTokenDto) {
    return this.mfaService.verifyAndEnable(req.user.id, dto.token);
  }

  @Post('disable')
  @ApiOperation({
    summary: 'Disable MFA',
    description: 'Disables MFA on the authenticated user account after verifying the current TOTP token.',
  })
  @ApiBody({ type: MfaTokenDto })
  @ApiResponse({
    status: 201,
    description: 'MFA disabled successfully',
    content: {
      'application/json': {
        example: { message: 'MFA has been disabled on your account.' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid TOTP token',
    content: {
      'application/json': {
        example: { statusCode: 400, message: 'Invalid MFA token', error: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    content: {
      'application/json': {
        example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' },
      },
    },
  })
  disable(@Req() req: AuthRequest, @Body() dto: MfaTokenDto) {
    return this.mfaService.disable(req.user.id, dto.token);
  }
}
