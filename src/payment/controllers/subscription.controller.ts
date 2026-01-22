import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { SubscriptionService, PaymentPlanService } from '../services';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
  SubscriptionResponseDto,
  CreatePaymentPlanDto,
  UpdatePaymentPlanDto,
  PaymentPlanResponseDto,
} from '../dto';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService,
    private paymentPlanService: PaymentPlanService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(
    @Request() req,
    @Body() dto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.createSubscription(req.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserSubscriptions(@Request() req): Promise<SubscriptionResponseDto[]> {
    return this.subscriptionService.getUserSubscriptions(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getSubscription(@Param('id') id: string): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.getSubscription(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.updateSubscription(id, dto);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @Param('id') id: string,
    @Body() dto: CancelSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.cancelSubscription(id, dto);
  }

  @Post(':id/pause')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async pauseSubscription(@Param('id') id: string): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.pauseSubscription(id);
  }

  @Post(':id/resume')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async resumeSubscription(@Param('id') id: string): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.resumeSubscription(id);
  }

  // Payment Plans
  @Post('plans')
  async createPlan(@Body() dto: CreatePaymentPlanDto): Promise<PaymentPlanResponseDto> {
    return this.paymentPlanService.createPlan(dto);
  }

  @Get('plans')
  async listPlans(
    @Query('onlyActive') onlyActive: boolean = true,
  ): Promise<PaymentPlanResponseDto[]> {
    return this.paymentPlanService.listPlans(onlyActive);
  }

  @Get('plans/:id')
  async getPlan(@Param('id') id: string): Promise<PaymentPlanResponseDto> {
    return this.paymentPlanService.getPlan(id);
  }

  @Patch('plans/:id')
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentPlanDto,
  ): Promise<PaymentPlanResponseDto> {
    return this.paymentPlanService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivatePlan(@Param('id') id: string): Promise<void> {
    await this.paymentPlanService.deactivatePlan(id);
  }
}
