import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Get,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { BillingCycle, SubscriptionPlan } from '../payment/entities/subscription.entity';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @ApiOperation({ summary: 'Start a subscription for the current user' })
  @Post('subscriptions/start')
  async start(
    @Req() req: any,
    @Body()
    body: {
      plan: SubscriptionPlan | string;
      billingCycle: BillingCycle;
      seats?: number;
      trialDays?: number;
      priceIdOverride?: string;
    },
  ) {
    const userId = req?.user?.id || body['userId'];
    if (!userId) throw new BadRequestException('Missing user context');
    return this.billingService.startSubscription({
      userId,
      plan: body.plan as any,
      billingCycle: body.billingCycle,
      seats: body.seats,
      trialDays: body.trialDays,
      priceIdOverride: body.priceIdOverride,
    });
  }

  @ApiOperation({ summary: 'Cancel a subscription' })
  @Post('subscriptions/:id/cancel')
  async cancel(
    @Param('id', ParseUUIDPipe) subscriptionId: string,
    @Body() body: { cancelAtPeriodEnd?: boolean; reason?: string },
  ) {
    return this.billingService.cancelSubscription({
      subscriptionId,
      cancelAtPeriodEnd: body.cancelAtPeriodEnd,
      reason: body.reason,
    });
  }

  @ApiOperation({ summary: 'Create Stripe Billing Portal session for current user' })
  @Get('portal')
  async portal(@Req() req: any) {
    const userId = req?.user?.id || req.query['userId'];
    if (!userId) throw new BadRequestException('Missing user context');
    return this.billingService.createPortalSession(userId, req.query['returnUrl']);
  }

  @ApiOperation({ summary: 'Get active subscription for current user' })
  @Get('me/subscription')
  async my(@Req() req: any) {
    const userId = req?.user?.id || req.query['userId'];
    if (!userId) throw new BadRequestException('Missing user context');
    return this.billingService.getMySubscription(userId);
  }
}
