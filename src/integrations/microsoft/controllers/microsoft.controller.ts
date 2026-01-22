import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { MicrosoftService } from '../services/microsoft.service';
import { MicrosoftConfigService } from '../services/microsoft-config.service';
import { MicrosoftConfigDto, TeamsAssignmentDto } from '../dto/microsoft.dto';

@Controller('integrations/microsoft')
export class MicrosoftController {
  constructor(
    private microsoftService: MicrosoftService,
    private microsoftConfigService: MicrosoftConfigService,
  ) {}

  /**
   * Create Microsoft configuration
   */
  @Post('config')
  @UseGuards(JwtAuthGuard)
  async createMicrosoftConfig(
    @CurrentUser() user: any,
    @Body() dto: MicrosoftConfigDto,
  ) {
    const config = await this.microsoftConfigService.createMicrosoftConfig(
      user.id,
      dto.clientId,
      dto.clientSecret,
      dto.tenantId,
      dto.redirectUri,
      dto.refreshToken,
    );

    return {
      success: true,
      data: config,
      message: 'Microsoft configuration created successfully',
    };
  }

  /**
   * Get authorization URL for OAuth flow
   */
  @Get('auth/url')
  @UseGuards(JwtAuthGuard)
  getAuthUrl(
    @Query('clientId') clientId: string,
    @Query('redirectUri') redirectUri: string,
    @Query('tenantId') tenantId: string,
  ) {
    if (!clientId || !redirectUri || !tenantId) {
      throw new BadRequestException('Missing required parameters');
    }

    const authUrl = this.microsoftService.getAuthorizationUrl(
      clientId,
      redirectUri,
      tenantId,
    );
    return {
      success: true,
      data: { authUrl },
    };
  }

  /**
   * Handle OAuth callback
   */
  @Get('auth/callback')
  @UseGuards(JwtAuthGuard)
  async handleCallback(
    @CurrentUser() user: any,
    @Query('code') code: string,
    @Query('clientId') clientId: string,
    @Query('clientSecret') clientSecret: string,
    @Query('tenantId') tenantId: string,
    @Query('redirectUri') redirectUri: string,
  ) {
    if (!code) {
      throw new BadRequestException('Missing authorization code');
    }

    try {
      const tokens = await this.microsoftService.exchangeCodeForToken(
        clientId,
        clientSecret,
        tenantId,
        redirectUri,
        code,
      );

      return {
        success: true,
        data: tokens,
        message: 'Authorization successful',
      };
    } catch (error) {
      throw new BadRequestException('Failed to exchange authorization code');
    }
  }

  /**
   * Get Microsoft configuration
   */
  @Get('config/:configId')
  @UseGuards(JwtAuthGuard)
  async getMicrosoftConfig(
    @CurrentUser() user: any,
    @Param('configId') configId: string,
  ) {
    const config = await this.microsoftConfigService.getMicrosoftConfig(configId, user.id);
    if (!config) {
      throw new NotFoundException('Microsoft configuration not found');
    }

    return {
      success: true,
      data: config,
    };
  }

  /**
   * Get teams
   */
  @Get('teams')
  @UseGuards(JwtAuthGuard)
  async getTeams() {
    const teams = await this.microsoftService.getTeams('token');
    return {
      success: true,
      data: teams,
    };
  }

  /**
   * Create Teams assignment
   */
  @Post('assignments')
  @UseGuards(JwtAuthGuard)
  async createAssignment(
    @Body() dto: TeamsAssignmentDto,
  ) {
    try {
      const assignment = await this.microsoftService.createAssignment(
        'token',
        dto.teamId,
        dto.channelId,
        dto.displayName,
        dto.instructions,
        dto.dueDateTime,
        dto.points,
      );

      return {
        success: true,
        data: assignment,
        message: 'Assignment created successfully',
      };
    } catch (error) {
      throw new BadRequestException('Failed to create assignment');
    }
  }

  /**
   * Sync teams
   */
  @Post('sync-teams')
  @UseGuards(JwtAuthGuard)
  async syncTeams(
    @CurrentUser() user: any,
    @Body() body: { configId: string },
  ) {
    const syncLog = await this.microsoftConfigService.syncTeams(body.configId, user.id);

    return {
      success: true,
      data: syncLog,
      message: 'Team sync completed',
    };
  }
}
