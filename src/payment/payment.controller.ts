import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { SubscriptionService } from './subscription.service';
import { InvoiceService } from './invoice.service';
import { PaymentAnalyticsService } from './payment-analytics.service';
import { PaymentEntity } from './entities/payment.entity';
import { SubscriptionEntity } from './entities/subscription.entity';
import { InvoiceEntity } from './entities/invoice.entity';

export class CreatePaymentDto {
  amount: number;
  currency: string;
  type: 'course_purchase' | 'subscription';
  courseId?: string;
  subscriptionId?: string;
  description?: string;
  paymentMethodId?: string;
  customerEmail?: string;
  customerName?: string;
  billingAddress?: string;
  taxAmount?: number;
  discountAmount?: number;
  couponCode?: string;
}

export class ProcessPaymentDto {
  paymentMethodId?: string;
  confirm?: boolean;
}

export class CreateSubscriptionDto {
  plan: 'basic' | 'premium' | 'enterprise' | 'student';
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  amount: number;
  currency: string;
  paymentMethodId?: string;
  trialDays?: number;
  customerEmail?: string;
  customerName?: string;
  couponCode?: string;
}

export class UpdateSubscriptionDto {
  plan?: 'basic' | 'premium' | 'enterprise' | 'student';
  billingCycle?: 'monthly' | 'quarterly' | 'yearly';
  amount?: number;
  paymentMethodId?: string;
}

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(
    private paymentService: PaymentService,
    private subscriptionService: SubscriptionService,
    private invoiceService: InvoiceService,
    private paymentAnalyticsService: PaymentAnalyticsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment created successfully',
    type: PaymentEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment data',
  })
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: any,
  ): Promise<PaymentEntity> {
    return this.paymentService.createPayment({
      userId: req.user.id,
      ...createPaymentDto,
    });
  }

  @Post('course-purchase')
  @ApiOperation({ summary: 'Create a course purchase payment' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Course purchase payment created successfully',
    type: PaymentEntity,
  })
  async createCoursePurchase(
    @Body()
    data: {
      courseId: string;
      amount: number;
      currency: string;
      paymentMethodId?: string;
      customerEmail?: string;
      customerName?: string;
      couponCode?: string;
    },
    @Request() req: any,
  ): Promise<PaymentEntity> {
    return this.paymentService.createCoursePurchase({
      userId: req.user.id,
      ...data,
    });
  }

  @Post(':paymentId/process')
  @ApiOperation({ summary: 'Process a payment' })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment processed successfully',
    type: PaymentEntity,
  })
  async processPayment(
    @Param('paymentId') paymentId: string,
    @Body() processPaymentDto: ProcessPaymentDto,
  ): Promise<PaymentEntity> {
    return this.paymentService.processPayment({
      paymentId,
      ...processPaymentDto,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get user payments' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User payments retrieved successfully',
    type: [PaymentEntity],
  })
  async getUserPayments(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<PaymentEntity[]> {
    return this.paymentService.getPaymentsByUserId(req.user.id);
  }

  @Get(':paymentId')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment retrieved successfully',
    type: PaymentEntity,
  })
  async getPayment(@Param('paymentId') paymentId: string): Promise<PaymentEntity> {
    return this.paymentService.getPaymentById(paymentId);
  }

  @Post(':paymentId/refund')
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment refunded successfully',
    type: PaymentEntity,
  })
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @Body() data: { reason?: string; amount?: number },
  ): Promise<PaymentEntity> {
    return this.paymentService.refundPayment(paymentId, data.reason, data.amount);
  }

  @Get('stats/user')
  @ApiOperation({ summary: 'Get user payment statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment statistics retrieved successfully',
  })
  async getUserPaymentStats(@Request() req: any): Promise<any> {
    return this.paymentService.getPaymentStats(req.user.id);
  }

  @Get('analytics/payments')
  @ApiOperation({ summary: 'Get payment analytics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment analytics retrieved successfully',
  })
  async getPaymentAnalytics(@Query('days') days: number = 30): Promise<any> {
    return this.paymentAnalyticsService.getPaymentAnalytics(days);
  }

  // Subscription endpoints
  @Post('subscriptions')
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Subscription created successfully',
    type: SubscriptionEntity,
  })
  async createSubscription(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @Request() req: any,
  ): Promise<SubscriptionEntity> {
    return this.subscriptionService.createSubscription({
      userId: req.user.id,
      ...createSubscriptionDto,
    });
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get user subscriptions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User subscriptions retrieved successfully',
    type: [SubscriptionEntity],
  })
  async getUserSubscriptions(@Request() req: any): Promise<SubscriptionEntity[]> {
    return this.subscriptionService.getSubscriptionsByUserId(req.user.id);
  }

  @Get('subscriptions/active')
  @ApiOperation({ summary: 'Get user active subscription' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active subscription retrieved successfully',
    type: SubscriptionEntity,
  })
  async getActiveSubscription(@Request() req: any): Promise<SubscriptionEntity | null> {
    return this.subscriptionService.getActiveSubscriptionByUserId(req.user.id);
  }

  @Get('subscriptions/:subscriptionId')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription retrieved successfully',
    type: SubscriptionEntity,
  })
  async getSubscription(
    @Param('subscriptionId') subscriptionId: string,
  ): Promise<SubscriptionEntity> {
    return this.subscriptionService.getSubscriptionById(subscriptionId);
  }

  @Put('subscriptions/:subscriptionId')
  @ApiOperation({ summary: 'Update subscription' })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription updated successfully',
    type: SubscriptionEntity,
  })
  async updateSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionEntity> {
    return this.subscriptionService.updateSubscription({
      subscriptionId,
      ...updateSubscriptionDto,
    });
  }

  @Delete('subscriptions/:subscriptionId')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription cancelled successfully',
    type: SubscriptionEntity,
  })
  async cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() data: { cancelAtPeriodEnd?: boolean; reason?: string },
  ): Promise<SubscriptionEntity> {
    return this.subscriptionService.cancelSubscription(
      subscriptionId,
      data.cancelAtPeriodEnd,
      data.reason,
    );
  }

  @Post('subscriptions/:subscriptionId/reactivate')
  @ApiOperation({ summary: 'Reactivate subscription' })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription reactivated successfully',
    type: SubscriptionEntity,
  })
  async reactivateSubscription(
    @Param('subscriptionId') subscriptionId: string,
  ): Promise<SubscriptionEntity> {
    return this.subscriptionService.reactivateSubscription(subscriptionId);
  }

  @Get('analytics/subscriptions')
  @ApiOperation({ summary: 'Get subscription analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription analytics retrieved successfully',
  })
  async getSubscriptionAnalytics(): Promise<any> {
    return this.paymentAnalyticsService.getSubscriptionAnalytics();
  }

  // Invoice endpoints
  @Get('invoices')
  @ApiOperation({ summary: 'Get user invoices' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User invoices retrieved successfully',
    type: [InvoiceEntity],
  })
  async getUserInvoices(@Request() req: any): Promise<InvoiceEntity[]> {
    // This would need to be implemented to get invoices by user
    return [];
  }

  @Get('invoices/:invoiceId')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice retrieved successfully',
    type: InvoiceEntity,
  })
  async getInvoice(@Param('invoiceId') invoiceId: string): Promise<InvoiceEntity> {
    return this.invoiceService.getInvoiceById(invoiceId);
  }

  @Post('invoices/:invoiceId/pay')
  @ApiOperation({ summary: 'Pay an invoice' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice paid successfully',
    type: InvoiceEntity,
  })
  async payInvoice(
    @Param('invoiceId') invoiceId: string,
    @Body() data: { paymentMethodId?: string },
  ): Promise<InvoiceEntity> {
    return this.invoiceService.payInvoice(invoiceId, data.paymentMethodId);
  }

  @Get('analytics/invoices')
  @ApiOperation({ summary: 'Get invoice analytics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice analytics retrieved successfully',
  })
  async getInvoiceAnalytics(@Query('days') days: number = 30): Promise<any> {
    return this.paymentAnalyticsService.getInvoiceAnalytics(days);
  }

  // Business Intelligence
  @Get('analytics/business-intelligence')
  @ApiOperation({ summary: 'Get business intelligence dashboard data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Business intelligence data retrieved successfully',
  })
  async getBusinessIntelligence(): Promise<any> {
    return this.paymentAnalyticsService.getBusinessIntelligence();
  }

  @Get('analytics/revenue-trends')
  @ApiOperation({ summary: 'Get revenue trends' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Revenue trends retrieved successfully',
  })
  async getRevenueTrends(@Query('days') days: number = 90): Promise<any> {
    return this.paymentAnalyticsService.getRevenueTrends(days);
  }

  @Get('analytics/customers')
  @ApiOperation({ summary: 'Get customer analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer analytics retrieved successfully',
  })
  async getCustomerAnalytics(): Promise<any> {
    return this.paymentAnalyticsService.getCustomerAnalytics();
  }
}
