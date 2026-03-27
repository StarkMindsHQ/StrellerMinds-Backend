import { Controller, Post, Get, Req, Headers, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { DonationsService } from './donations.service';

@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post('webhook')
  async handleWebhook(
    @Headers('x-webhook-signature') signature: string,
    @Req() req: any,
  ) {
    return this.donationsService.handleWebhook(signature, req.body);
  }

  @Get('leaderboard')
  @UseInterceptors(CacheInterceptor)
  async getLeaderboard(
    @Query('scope') scope?: 'global' | 'project',
    @Query('projectId') projectId?: string,
  ) {
    return this.donationsService.getLeaderboard(scope, projectId);
  }
}