import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { PaymentService, StripeService, PayPalService } from '../services';
import { CreatePaymentDto, ProcessPaymentDto, PaymentResponseDto } from '../dto';

@Controller('payments')
export class PaymentController {
  constructor(
    private paymentService: PaymentService,
    private stripeService: StripeService,
    private paypalService: PayPalService,
  ) {}

  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  async initializePayment(@Request() req, @Body() dto: ProcessPaymentDto): Promise<any> {
    return this.paymentService.initializePayment(req.user.id, dto.amount, dto.paymentMethod);
  }

  @Post('stripe/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async confirmStripePayment(
    @Request() req,
    @Body() body: { paymentIntentId: string; paymentDto: CreatePaymentDto },
  ): Promise<PaymentResponseDto> {
    return this.stripeService.confirmPayment(req.user.id, body.paymentIntentId, body.paymentDto);
  }

  @Post('paypal/capture')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async capturePayPalPayment(
    @Request() req,
    @Body() body: { orderId: string; amount: number },
  ): Promise<PaymentResponseDto> {
    return this.paypalService.captureOrder(body.orderId, req.user.id, body.amount);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getPaymentHistory(@Request() req): Promise<PaymentResponseDto[]> {
    return this.paymentService.getPaymentHistory(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPayment(@Param('id') id: string): Promise<PaymentResponseDto> {
    return this.paymentService.getPayment(id);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async requestRefund(
    @Param('id') id: string,
    @Body() body: { amount?: number; reason: string },
  ): Promise<any> {
    return this.paymentService.createRefundRequest(id, body.amount, body.reason);
  }
}
