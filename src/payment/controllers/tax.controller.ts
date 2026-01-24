import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { TaxCalculationService } from '../services';
import {
  CreateTaxRateDto,
  UpdateTaxRateDto,
  CalculateTaxDto,
  TaxResponseDto,
} from '../dto';

@Controller('tax')
export class TaxController {
  constructor(private taxCalculationService: TaxCalculationService) {}

  @Post('rates')
  @HttpCode(HttpStatus.CREATED)
  async createTaxRate(@Body() dto: CreateTaxRateDto): Promise<any> {
    return this.taxCalculationService.createTaxRate(dto);
  }

  @Get('rates')
  async listTaxRates(@Query('country') country?: string): Promise<any> {
    return this.taxCalculationService.listTaxRates(country);
  }

  @Get('rates/:id')
  async getTaxRate(@Param('id') id: string): Promise<any> {
    return this.taxCalculationService.getTaxRate(id);
  }

  @Post('rates/:id')
  async updateTaxRate(
    @Param('id') id: string,
    @Body() dto: UpdateTaxRateDto,
  ): Promise<any> {
    return this.taxCalculationService.updateTaxRate(id, dto);
  }

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  async calculateTax(@Body() dto: CalculateTaxDto): Promise<TaxResponseDto> {
    return this.taxCalculationService.calculateTax(dto);
  }

  @Post('validate-compliance')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validateCompliance(
    @Request() req,
    @Body() body: { country: string; state?: string },
  ): Promise<any> {
    return this.taxCalculationService.validateTaxCompliance(
      req.user.id,
      body.country,
      body.state,
    );
  }
}
