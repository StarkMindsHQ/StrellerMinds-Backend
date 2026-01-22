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
  Redirect,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { GoogleService } from '../services/google.service';
import { GoogleConfigService } from '../services/google-config.service';
import { GoogleConfigDto, GoogleCourseDto } from '../dto/google.dto';

@Controller('integrations/google')
export class GoogleController {
  constructor(
    private googleService: GoogleService,
    private googleConfigService: GoogleConfigService,
  ) {}

  /**
   * Create Google configuration
   */
  @Post('config')
  @UseGuards(JwtAuthGuard)
  async createGoogleConfig(
    @CurrentUser() user: any,
    @Body() dto: GoogleConfigDto,
  ) {
    const config = await this.googleConfigService.createGoogleConfig(
      user.id,
      dto.clientId,
      dto.clientSecret,
      dto.redirectUri,
      dto.refreshToken,
    );

    return {
      success: true,
      data: config,
      message: 'Google configuration created successfully',
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
  ) {
    if (!clientId || !redirectUri) {
      throw new BadRequestException('Missing clientId or redirectUri');
    }

    const authUrl = this.googleService.getAuthorizationUrl(clientId, redirectUri);
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
    @Query('redirectUri') redirectUri: string,
  ) {
    if (!code) {
      throw new BadRequestException('Missing authorization code');
    }

    try {
      const tokens = await this.googleService.exchangeCodeForToken(
        clientId,
        clientSecret,
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
   * Get Google configuration
   */
  @Get('config/:configId')
  @UseGuards(JwtAuthGuard)
  async getGoogleConfig(
    @CurrentUser() user: any,
    @Param('configId') configId: string,
  ) {
    const config = await this.googleConfigService.getGoogleConfig(configId, user.id);
    if (!config) {
      throw new NotFoundException('Google configuration not found');
    }

    return {
      success: true,
      data: config,
    };
  }

  /**
   * Get courses
   */
  @Get('courses')
  @UseGuards(JwtAuthGuard)
  async getCourses() {
    // In a real implementation, fetch from config and sync
    const courses = await this.googleService.getCourses('token');
    return {
      success: true,
      data: courses,
    };
  }

  /**
   * Sync courses
   */
  @Post('sync-courses')
  @UseGuards(JwtAuthGuard)
  async syncCourses(
    @CurrentUser() user: any,
    @Body() body: { configId: string },
  ) {
    const syncLog = await this.googleConfigService.syncCourses(body.configId, user.id);

    return {
      success: true,
      data: syncLog,
      message: 'Course sync completed',
    };
  }

  /**
   * Sync assignments
   */
  @Post('sync-assignments')
  @UseGuards(JwtAuthGuard)
  async syncAssignments(
    @CurrentUser() user: any,
    @Body() body: { configId: string; courseId: string },
  ) {
    const syncLog = await this.googleConfigService.syncAssignments(
      body.configId,
      user.id,
      body.courseId,
    );

    return {
      success: true,
      data: syncLog,
      message: 'Assignment sync completed',
    };
  }
}
