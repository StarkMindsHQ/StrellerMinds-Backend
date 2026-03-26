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
import { RequestUser } from '../../../common/types/request.types';

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
  async createGoogleConfig(@CurrentUser() user: RequestUser, @Body() dto: GoogleConfigDto) {
    const config = await this.googleConfigService.createGoogleConfig(
      user.sub,
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
  getAuthUrl(@Query('clientId') clientId: string, @Query('redirectUri') redirectUri: string) {
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
    @CurrentUser() user: RequestUser,
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
  async getGoogleConfig(@CurrentUser() user: RequestUser, @Param('configId') configId: string) {
    const config = await this.googleConfigService.getGoogleConfig(configId, user.sub);
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
  async syncCourses(@CurrentUser() user: RequestUser, @Body() body: { configId: string }) {
    const syncLog = await this.googleConfigService.syncCourses(body.configId, user.sub);

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
    @CurrentUser() user: RequestUser,
    @Body() body: { configId: string; courseId: string },
  ) {
    const syncLog = await this.googleConfigService.syncAssignments(
      body.configId,
      user.sub,
      body.courseId,
    );

    return {
      success: true,
      data: syncLog,
      message: 'Assignment sync completed',
    };
  }
}
