import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  ParseUUIDPipe,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { PrivacyService } from '../services/privacy.service';
import { UserProfileService } from '../services/user-profile.service';
import {
  UpdatePrivacySettingsDto,
  PrivacySettingsResponseDto,
  DataExportDto,
  DataExportResponseDto,
} from '../dto/privacy.dto';

@ApiTags('Privacy & Security')
@Controller('privacy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PrivacyController {
  constructor(
    private readonly privacyService: PrivacyService,
    private readonly userProfileService: UserProfileService,
  ) {}

  @Get('me/settings')
  @ApiOperation({ summary: 'Get my privacy settings' })
  @ApiResponse({ status: 200, description: 'Privacy settings retrieved' })
  async getMyPrivacySettings(
    @Request() req,
  ): Promise<PrivacySettingsResponseDto> {
    return this.privacyService.getPrivacySettings(req.user.id);
  }

  @Put('me/settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update my privacy settings' })
  @ApiResponse({ status: 200, description: 'Privacy settings updated' })
  async updateMyPrivacySettings(
    @Request() req,
    @Body() updateDto: UpdatePrivacySettingsDto,
  ): Promise<PrivacySettingsResponseDto> {
    return this.privacyService.updatePrivacySettings(req.user.id, updateDto);
  }

  @Post('me/block/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 200, description: 'User blocked' })
  async blockUser(
    @Request() req,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<PrivacySettingsResponseDto> {
    return this.privacyService.blockUser(req.user.id, userId);
  }

  @Post('me/unblock/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, description: 'User unblocked' })
  async unblockUser(
    @Request() req,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<PrivacySettingsResponseDto> {
    return this.privacyService.unblockUser(req.user.id, userId);
  }

  @Post('me/mute/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mute a user' })
  @ApiResponse({ status: 200, description: 'User muted' })
  async muteUser(
    @Request() req,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<PrivacySettingsResponseDto> {
    return this.privacyService.muteUser(req.user.id, userId);
  }

  @Post('me/unmute/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unmute a user' })
  @ApiResponse({ status: 200, description: 'User unmuted' })
  async unmuteUser(
    @Request() req,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<PrivacySettingsResponseDto> {
    return this.privacyService.unmuteUser(req.user.id, userId);
  }

  @Post('me/export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export my data' })
  @ApiResponse({ status: 200, description: 'Data exported' })
  async exportData(
    @Request() req,
    @Body() exportDto: DataExportDto,
  ): Promise<Record<string, unknown>> {
    return this.privacyService.exportUserData(req.user.id);
  }

  @Get('me/data')
  @ApiOperation({ summary: 'Get my exported data' })
  @ApiResponse({ status: 200, description: 'Data retrieved' })
  async getExportedData(@Request() req): Promise<Record<string, unknown>> {
    return this.privacyService.exportUserData(req.user.id);
  }

  @Post('me/data/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete my account and data' })
  @ApiResponse({ status: 200, description: 'Account deletion initiated' })
  async deleteAccount(
    @Request() req,
    @Body() body: { password: string },
  ): Promise<{ message: string }> {
    // This would integrate with auth service to verify password
    // and handle account deletion
    return { message: 'Account deletion initiated. Check your email for confirmation.' };
  }

  @Get(':userId/can-view')
  @ApiOperation({ summary: 'Check if profile is viewable' })
  @ApiResponse({ status: 200, description: 'Viewability checked' })
  async canViewProfile(
    @Request() req,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<{ canView: boolean }> {
    const canView = await this.privacyService.canViewProfile(userId, req.user.id);
    return { canView };
  }
}
