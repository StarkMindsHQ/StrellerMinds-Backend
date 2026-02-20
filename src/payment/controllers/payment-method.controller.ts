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
import { PaymentMethodManagementService } from '../services';
import { PaymentMethodEntity } from '../entities';

@Controller('payment-methods')
export class PaymentMethodController {
  constructor(
    private paymentMethodManagementService: PaymentMethodManagementService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addPaymentMethod(
    @Request() req,
    @Body()
    body: {
      type: string;
      provider: string;
      externalId: string;
      last4?: string;
      brand?: string;
      expiresAt?: Date;
      metadata?: Record<string, any>;
    },
  ): Promise<PaymentMethodEntity> {
    return this.paymentMethodManagementService.addPaymentMethod(
      req.user.id,
      body.type,
      body.provider,
      body.externalId,
      body.last4,
      body.brand,
      body.expiresAt,
      body.metadata,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getPaymentMethods(@Request() req): Promise<PaymentMethodEntity[]> {
    return this.paymentMethodManagementService.getPaymentMethods(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPaymentMethod(
    @Request() req,
    @Param('id') id: string,
  ): Promise<PaymentMethodEntity> {
    return this.paymentMethodManagementService.getPaymentMethod(
      req.user.id,
      id,
    );
  }

  @Patch(':id/default')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async setDefaultPaymentMethod(
    @Request() req,
    @Param('id') id: string,
  ): Promise<PaymentMethodEntity> {
    return this.paymentMethodManagementService.setDefaultPaymentMethod(
      req.user.id,
      id,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updatePaymentMethod(
    @Request() req,
    @Param('id') id: string,
    @Body()
    body: {
      last4?: string;
      brand?: string;
      expiresAt?: Date;
      metadata?: Record<string, any>;
    },
  ): Promise<PaymentMethodEntity> {
    return this.paymentMethodManagementService.updatePaymentMethod(
      req.user.id,
      id,
      body,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePaymentMethod(
    @Request() req,
    @Param('id') id: string,
  ): Promise<void> {
    return this.paymentMethodManagementService.removePaymentMethod(
      req.user.id,
      id,
    );
  }

  @Get('default')
  @UseGuards(JwtAuthGuard)
  async getDefaultPaymentMethod(@Request() req): Promise<PaymentMethodEntity> {
    const method = await this.paymentMethodManagementService.getDefaultPaymentMethod(
      req.user.id,
    );
    if (!method) {
      throw new Error('No default payment method found');
    }
    return method;
  }

  @Get('provider/:provider')
  @UseGuards(JwtAuthGuard)
  async getPaymentMethodsByProvider(
    @Request() req,
    @Param('provider') provider: string,
  ): Promise<PaymentMethodEntity[]> {
    return this.paymentMethodManagementService.getPaymentMethodsByProvider(
      req.user.id,
      provider,
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getPaymentMethodStats(@Request() req): Promise<any> {
    return this.paymentMethodManagementService.getPaymentMethodStats(
      req.user.id,
    );
  }

  @Post('validate/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validatePaymentMethod(
    @Request() req,
    @Param('id') id: string,
  ): Promise<{ valid: boolean }> {
    const valid = await this.paymentMethodManagementService.validatePaymentMethod(
      req.user.id,
      id,
    );
    return { valid };
  }
}