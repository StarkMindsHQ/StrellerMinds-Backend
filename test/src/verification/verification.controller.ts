// src/verification/verification.controller.ts
import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { VerifyCredentialDto } from './dto/verify-credential.dto';

@ApiTags('Credential Verification')
@Controller('verify-credential')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post()
  @ApiOperation({ summary: 'Verify the authenticity of a blockchain credential' })
  @ApiBody({ type: VerifyCredentialDto })
  @ApiResponse({ status: 200, description: 'Verification result returned' })
  @ApiResponse({ status: 400, description: 'Invalid verification method or data' })
  async verify(@Body() dto: VerifyCredentialDto) {
    try {
      return await this.verificationService.verify(dto);
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }
}