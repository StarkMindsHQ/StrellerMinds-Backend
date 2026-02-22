import { Controller, Get, Query, Req } from '@nestjs/common';
import { MobileService } from './providers/mobile.service';
// import { MobileService } from './mobile.service';

@Controller('mobile')
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get('feed')
  async getMobileFeed(@Req() req, @Query('updatedSince') updatedSince?: string) {
    return this.mobileService.getOptimizedFeed(
      req.user?.id,
      updatedSince,
    );
  }
}