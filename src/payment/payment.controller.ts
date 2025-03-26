import { Controller, Post, Body, Get, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payment.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('process')
  @ApiOperation({ summary: 'Process a payment' })
  @ApiResponse({ status: 201, description: 'Payment processed successfully' })
  async processPayment(@Req() req, @Body() dto: ProcessPaymentDto) {
    return this.paymentsService.processPayment(req.user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments' })
  async findAll(@Req() req) {
    return this.paymentsService.getUserPayments(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  async findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Get(':id/verify')
  @ApiOperation({ summary: 'Verify payment status' })
  async verifyPayment(@Param('id') id: string) {
    return this.paymentsService.verifyPayment(id);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Process a refund' })
  async processRefund(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    if (!reason) {
      throw new BadRequestException('Refund reason is required');
    }
    return this.paymentsService.processRefund(id, reason);
  }
}
