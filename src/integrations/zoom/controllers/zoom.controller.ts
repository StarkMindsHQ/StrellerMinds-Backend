import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Headers,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoomService } from '../services/zoom.service';
import { ZoomConfigService } from '../services/zoom-config.service';
import { ZoomConfigDto, CreateMeetingDto, WebhookEventDto } from '../dto/zoom.dto';
import { RequestUser } from '../../../common/types/request.types';

@Controller('integrations/zoom')
export class ZoomController {
  constructor(
    private zoomService: ZoomService,
    private zoomConfigService: ZoomConfigService,
  ) {}

  /**
   * Create Zoom configuration
   */
  @Post('config')
  @UseGuards(JwtAuthGuard)
  async createZoomConfig(@CurrentUser() user: RequestUser, @Body() dto: ZoomConfigDto) {
    const config = await this.zoomConfigService.createZoomConfig(
      user.sub,
      dto.accountId,
      dto.clientId,
      dto.clientSecret,
      dto.webhookSecret,
      dto.webhookUrl,
    );

    return {
      success: true,
      data: config,
      message: 'Zoom configuration created successfully',
    };
  }

  /**
   * Get Zoom configuration
   */
  @Get('config/:configId')
  @UseGuards(JwtAuthGuard)
  async getZoomConfig(@CurrentUser() user: RequestUser, @Param('configId') configId: string) {
    const config = await this.zoomConfigService.getZoomConfig(configId, user.sub);
    if (!config) {
      throw new NotFoundException('Zoom configuration not found');
    }

    return {
      success: true,
      data: config,
    };
  }

  /**
   * Create Zoom meeting
   */
  @Post('meetings')
  @UseGuards(JwtAuthGuard)
  async createMeeting(@CurrentUser() user: RequestUser, @Body() dto: CreateMeetingDto) {
    try {
      // In a real implementation, fetch the config and access token
      const accessToken = 'placeholder-token';

      const meeting = await this.zoomService.createMeeting(
        accessToken,
        user.sub,
        dto.topic,
        dto.startTime,
        dto.duration,
        dto.meetingType,
      );

      return {
        success: true,
        data: meeting,
        message: 'Meeting created successfully',
      };
    } catch (error) {
      throw new BadRequestException('Failed to create meeting');
    }
  }

  /**
   * Get Zoom meeting details
   */
  @Get('meetings/:meetingId')
  @UseGuards(JwtAuthGuard)
  async getMeetingDetails(@Param('meetingId') meetingId: string) {
    const meeting = await this.zoomService.getMeetingDetails('token', meetingId);
    return {
      success: true,
      data: meeting,
    };
  }

  /**
   * Update Zoom meeting
   */
  @Put('meetings/:meetingId')
  @UseGuards(JwtAuthGuard)
  async updateMeeting(@Param('meetingId') meetingId: string, @Body() updates: any) {
    const meeting = await this.zoomService.updateMeeting('token', meetingId, updates);
    return {
      success: true,
      data: meeting,
    };
  }

  /**
   * Delete Zoom meeting
   */
  @Delete('meetings/:meetingId')
  @UseGuards(JwtAuthGuard)
  async deleteMeeting(@Param('meetingId') meetingId: string) {
    await this.zoomService.deleteMeeting('token', meetingId);
    return {
      success: true,
      message: 'Meeting deleted',
    };
  }

  /**
   * Get recordings
   */
  @Get('recordings')
  @UseGuards(JwtAuthGuard)
  async getRecordings(@CurrentUser() user: RequestUser) {
    const recordings = await this.zoomService.getRecordings('token', user.sub);
    return {
      success: true,
      data: recordings,
    };
  }

  /**
   * Sync recordings
   */
  @Post('sync-recordings')
  @UseGuards(JwtAuthGuard)
  async syncRecordings(
    @CurrentUser() user: RequestUser,
    @Body() body: { configId: string; fromDate?: string; toDate?: string },
  ) {
    const syncLog = await this.zoomConfigService.syncRecordings(
      body.configId,
      user.sub,
      body.fromDate,
      body.toDate,
    );

    return {
      success: true,
      data: syncLog,
      message: 'Recording sync completed',
    };
  }

  /**
   * Handle Zoom webhooks
   */
  @Post('webhook')
  async handleWebhook(
    @Headers('x-zm-request-timestamp') timestamp: string,
    @Headers('x-zm-signature') signature: string,
    @Body() event: WebhookEventDto,
  ) {
    if (!this.zoomService.verifyWebhookSignature(JSON.stringify(event), timestamp, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Process webhook event
    // This would typically update recordings, meeting status, etc.

    return {
      success: true,
      message: 'Webhook processed',
    };
  }
}
