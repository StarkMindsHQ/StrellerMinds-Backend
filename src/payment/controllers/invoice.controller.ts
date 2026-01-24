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
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { InvoiceService } from '../services';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  SendInvoiceDto,
  InvoiceResponseDto,
} from '../dto';

@Controller('invoices')
export class InvoiceController {
  constructor(private invoiceService: InvoiceService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(
    @Request() req,
    @Body() dto: CreateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.createInvoice(req.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserInvoices(@Request() req): Promise<InvoiceResponseDto[]> {
    return this.invoiceService.getUserInvoices(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getInvoice(@Param('id') id: string): Promise<InvoiceResponseDto> {
    return this.invoiceService.getInvoice(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateInvoice(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.updateInvoice(id, dto);
  }

  @Post(':id/send')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async sendInvoice(
    @Param('id') id: string,
    @Body() dto: SendInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.sendInvoice(id, dto);
  }

  @Post(':id/mark-paid')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async markAsPaid(
    @Param('id') id: string,
    @Body() body: { amountPaid?: number },
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.markAsPaid(id, body.amountPaid);
  }

  @Get('overdue')
  async getOverdueInvoices(): Promise<InvoiceResponseDto[]> {
    return this.invoiceService.getOverdueInvoices();
  }
}
