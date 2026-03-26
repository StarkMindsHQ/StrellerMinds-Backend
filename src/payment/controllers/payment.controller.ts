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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { PaymentService, StripeService, PayPalService } from '../services';
import { CreatePaymentDto, ProcessPaymentDto, PaymentResponseDto } from '../dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(
    private paymentService: PaymentService,
    private stripeService: StripeService,
    private paypalService: PayPalService,
  ) {}

  @Post('initialize')
  @ApiOperation({ summary: 'Initialize a new payment', description: 'Starts a payment session and returns the necessary client secrets for Stripe or PayPal.' })
  @ApiResponse({ status: 201, description: 'Payment session successfully initialized.' })
  async initializePayment(@Request() req, @Body() dto: ProcessPaymentDto): Promise<any> {
    return this.paymentService.initializePayment(req.user.id, dto.amount, dto.paymentMethod);
  }

  @Post('stripe/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm Stripe payment', description: 'Verifies and completes a transaction after the client confirms the PaymentIntent with Stripe.' })
  @ApiResponse({ status: 200, description: 'Stripe payment confirmed and recorded.', type: PaymentResponseDto })
  async confirmStripePayment(
    @Request() req,
    @Body() body: { paymentIntentId: string; paymentDto: CreatePaymentDto },
  ): Promise<PaymentResponseDto> {
    return this.stripeService.confirmPayment(req.user.id, body.paymentIntentId, body.paymentDto);
  }

  @Post('paypal/capture')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Capture PayPal order', description: 'Captures a PayPal order after the user has approved the transaction on the PayPal portal.' })
  @ApiResponse({ status: 200, description: 'PayPal order captured successfully.', type: PaymentResponseDto })
  async capturePayPalPayment(
    @Request() req,
    @Body() body: { orderId: string; amount: number },
  ): Promise<PaymentResponseDto> {
    return this.paypalService.captureOrder(body.orderId, req.user.id, body.amount);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user payment history', description: 'Retrieves a list of all past payments and subscriptions for the current user.' })
  @ApiResponse({ status: 200, description: 'Payment history retrieved successfully.', type: [PaymentResponseDto] })
  async getPaymentHistory(@Request() req): Promise<PaymentResponseDto[]> {
    return this.paymentService.getPaymentHistory(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment details', description: 'Retrieves details about a specific payment transaction by its ID.' })
  @ApiParam({ name: 'id', example: 'uuid-v4-string' })
  @ApiResponse({ status: 200, description: 'Payment details retrieved successfully.', type: PaymentResponseDto })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  async getPayment(@Param('id') id: string): Promise<PaymentResponseDto> {
    return this.paymentService.getPayment(id);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a refund', description: 'Initiates a refund request for a specific payment. Admin approval may be required.' })
  @ApiParam({ name: 'id', example: 'uuid-v4-string' })
  @ApiBody({ schema: { properties: { amount: { type: 'number', example: 19.99 }, reason: { type: 'string', example: 'Accidental purchase' } } } })
  @ApiResponse({ status: 200, description: 'Refund request initiated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid refund amount or status.' })
  async requestRefund(
    @Param('id') id: string,
    @Body() body: { amount?: number; reason: string },
  ): Promise<any> {
    return this.paymentService.createRefundRequest(id, body.amount, body.reason);
  }
}
