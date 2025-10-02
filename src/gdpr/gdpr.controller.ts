/**
 * GdprController handles endpoints for user consent, data export, and deletion requests.
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { GdprService } from './gdpr.service';
import { UpdateConsentDto, ConsentPreferencesDto } from './dto/consent.dto';
import { DataExportRequestDto } from './dto/data-export.dto';
import { CreateDeletionRequestDto } from './dto/deletion-request.dto';

@ApiTags('GDPR')
@Controller('gdpr')
export class GdprController {
  constructor(private gdprService: GdprService) {}

  // ==================== CONSENT ENDPOINTS ====================
  /**
   * Get user consents by user ID.
   */
  @Get('consents/:userId')
  @ApiOperation({ summary: 'Get user consents' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User consents retrieved' })
  async getUserConsents(@Param('userId') userId: string) {
    return this.gdprService.getConsentService().getUserConsents(userId);
  }

  /**
   * Update user consent by user ID.
   */
  @Put('consents/:userId')
  @ApiOperation({ summary: 'Update user consent' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: UpdateConsentDto })
  @ApiResponse({ status: 200, description: 'User consent updated' })
  async updateConsent(@Param('userId') userId: string, @Body() updateConsentDto: UpdateConsentDto) {
    return this.gdprService.getConsentService().updateConsent(userId, updateConsentDto);
  }

  /**
   * Update user consent preferences by user ID.
   */
  @Put('consents/:userId/preferences')
  @ApiOperation({ summary: 'Update user consent preferences' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: ConsentPreferencesDto })
  @ApiResponse({ status: 200, description: 'User consent preferences updated' })
  async updateConsentPreferences(
    @Param('userId') userId: string,
    @Body() preferences: ConsentPreferencesDto,
  ) {
    return this.gdprService.getConsentService().updateConsentPreferences(userId, preferences);
  }

  /**
   * Withdraw all consents for a user.
   */
  @Post('consents/:userId/withdraw-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Withdraw all consents' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'All consents withdrawn' })
  async withdrawAllConsents(@Param('userId') userId: string) {
    await this.gdprService.getConsentService().withdrawAllConsents(userId);
  }

  // ==================== DATA EXPORT ENDPOINTS ====================
  /**
   * Request data export for a user.
   */
  @Post('export/:userId')
  @ApiOperation({ summary: 'Request data export' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: DataExportRequestDto })
  @ApiResponse({ status: 200, description: 'Data export requested' })
  async exportUserData(
    @Param('userId') userId: string,
    @Body() dataExportRequestDto: DataExportRequestDto,
  ) {
    return this.gdprService.getDataExportService().exportUserData(userId, dataExportRequestDto);
  }

  // ==================== DELETION REQUEST ENDPOINTS ====================
  /**
   * Create a deletion request for a user.
   */
  @Post('deletion/:userId')
  @ApiOperation({ summary: 'Create deletion request' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: CreateDeletionRequestDto })
  @ApiResponse({ status: 201, description: 'Deletion request created' })
  async createDeletionRequest(
    @Param('userId') userId: string,
    @Body() createDeletionRequestDto: CreateDeletionRequestDto,
  ) {
    return this.gdprService
      .getDataDeletionService()
      .createDeletionRequest(userId, createDeletionRequestDto);
  }
}
