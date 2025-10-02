// src/verification/verification.controller.ts
import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { VerifyCredentialDto } from './dto/verify-credential.dto';
import { BlockchainRateLimit } from '../common/decorators/rate-limit.decorator';

@ApiTags('Credential Verification')
@Controller('verify-credential')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @BlockchainRateLimit.verification()
  @Post()
  @ApiOperation({ summary: 'Verify the authenticity of a blockchain credential' })
  @ApiBody({ type: VerifyCredentialDto })
  @ApiResponse({ status: 200, description: 'Verification result returned' })
  @ApiResponse({ status: 400, description: 'Invalid verification method or data' })
  @ApiResponse({ status: 429, description: 'Too many verification attempts' })
  async verify(@Body() dto: VerifyCredentialDto) {
    try {
      return await this.verificationService.verify(dto);
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }
}
