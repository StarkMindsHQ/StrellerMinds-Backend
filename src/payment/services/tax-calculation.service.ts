import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxRate } from '../entities';
import { CreateTaxRateDto, UpdateTaxRateDto, CalculateTaxDto } from '../dto';

@Injectable()
export class TaxCalculationService {
  constructor(
    @InjectRepository(TaxRate)
    private taxRateRepository: Repository<TaxRate>,
  ) {}

  async createTaxRate(dto: CreateTaxRateDto): Promise<TaxRate> {
    const existingRate = await this.taxRateRepository.findOne({
      where: {
        country: dto.country,
        state: dto.state || null,
        region: dto.region || null,
      },
    });

    if (existingRate) {
      throw new BadRequestException(
        'Tax rate already exists for this location',
      );
    }

    const rate = this.taxRateRepository.create(dto);
    return this.taxRateRepository.save(rate);
  }

  async getTaxRate(taxRateId: string): Promise<TaxRate> {
    const rate = await this.taxRateRepository.findOneBy({ id: taxRateId });

    if (!rate) {
      throw new NotFoundException('Tax rate not found');
    }

    return rate;
  }

  async updateTaxRate(taxRateId: string, dto: UpdateTaxRateDto): Promise<TaxRate> {
    const rate = await this.getTaxRate(taxRateId);

    if (dto.rate) {
      rate.rate = dto.rate;
    }

    if (dto.metadata) {
      rate.metadata = { ...rate.metadata, ...dto.metadata };
    }

    return this.taxRateRepository.save(rate);
  }

  async calculateTax(dto: CalculateTaxDto): Promise<any> {
    const rate = await this.findApplicableTaxRate(
      dto.country,
      dto.state,
    );

    if (!rate) {
      return {
        amount: dto.amount,
        rate: 0,
        tax: 0,
        total: dto.amount,
        country: dto.country,
        currency: dto.currency || 'USD',
      };
    }

    const tax = (dto.amount * rate.rate) / 100;
    const total = dto.amount + tax;

    return {
      amount: dto.amount,
      rate: rate.rate,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      country: dto.country,
      state: dto.state,
      currency: dto.currency || 'USD',
      taxType: rate.type,
    };
  }

  async listTaxRates(country?: string): Promise<TaxRate[]> {
    const query = this.taxRateRepository.createQueryBuilder('tax_rate');

    if (country) {
      query.where('tax_rate.country = :country', { country });
    }

    query.andWhere('tax_rate.isActive = true');

    return query.getMany();
  }

  private async findApplicableTaxRate(
    country: string,
    state?: string,
  ): Promise<TaxRate | null> {
    // Try to find the most specific tax rate
    if (state) {
      const stateRate = await this.taxRateRepository.findOne({
        where: {
          country,
          state,
          isActive: true,
        },
      });

      if (stateRate) {
        return stateRate;
      }
    }

    // Fall back to country-level rate
    return this.taxRateRepository.findOne({
      where: {
        country,
        state: null,
        isActive: true,
      },
    });
  }

  async validateTaxCompliance(
    userId: string,
    country: string,
    state?: string,
  ): Promise<any> {
    const rate = await this.findApplicableTaxRate(country, state);

    return {
      compliant: !!rate,
      country,
      state: state || 'N/A',
      taxRate: rate?.rate || 0,
      requiresReporting: true,
      lastUpdated: rate?.updatedAt,
    };
  }
}
