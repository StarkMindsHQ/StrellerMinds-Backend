/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { TaxCalculationService } from './tax-calculation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaxRate } from '../entities';
import { CreateTaxRateDto, CalculateTaxDto } from '../dto';

describe('TaxCalculationService', () => {
  let service: TaxCalculationService;
  let mockTaxRateRepository: any;

  beforeEach(async () => {
    mockTaxRateRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxCalculationService,
        {
          provide: getRepositoryToken(TaxRate),
          useValue: mockTaxRateRepository,
        },
      ],
    }).compile();

    service = module.get<TaxCalculationService>(TaxCalculationService);
  });

  describe('calculateTax', () => {
    it('should calculate tax for a given amount and location', async () => {
      const dto: CalculateTaxDto = {
        amount: 100.0,
        country: 'US',
        state: 'CA',
      };

      const mockTaxRate = {
        rate: 8.625,
        type: 'Sales Tax',
      };

      mockTaxRateRepository.findOne.mockResolvedValue(mockTaxRate);

      const result = await service.calculateTax(dto);

      expect(result).toEqual({
        amount: 100.0,
        rate: 8.625,
        tax: 8.625,
        total: 108.625,
        country: 'US',
        state: 'CA',
        currency: 'USD',
        taxType: 'Sales Tax',
      });
    });

    it('should return zero tax if no rate found', async () => {
      const dto: CalculateTaxDto = {
        amount: 100.0,
        country: 'XX',
        state: 'XX',
      };

      mockTaxRateRepository.findOne.mockResolvedValue(null);

      const result = await service.calculateTax(dto);

      expect(result).toEqual({
        amount: 100.0,
        rate: 0,
        tax: 0,
        total: 100.0,
        country: 'XX',
        currency: 'USD',
      });
    });
  });

  describe('createTaxRate', () => {
    it('should create a new tax rate', async () => {
      const dto: CreateTaxRateDto = {
        country: 'US',
        state: 'NY',
        rate: 8.875,
        type: 'Sales Tax',
      };

      const mockTaxRate = {
        id: 'tax-rate-id',
        ...dto,
        isActive: true,
      };

      mockTaxRateRepository.findOne.mockResolvedValue(null);
      mockTaxRateRepository.create.mockReturnValue(mockTaxRate);
      mockTaxRateRepository.save.mockResolvedValue(mockTaxRate);

      const result = await service.createTaxRate(dto);

      expect(result).toEqual(mockTaxRate);
      expect(mockTaxRateRepository.save).toHaveBeenCalled();
    });

    it('should throw error if tax rate already exists', async () => {
      const dto: CreateTaxRateDto = {
        country: 'US',
        state: 'CA',
        rate: 8.625,
      };

      mockTaxRateRepository.findOne.mockResolvedValue({
        country: 'US',
        state: 'CA',
        rate: 8.625,
      });

      expect(service.createTaxRate(dto)).rejects.toThrow(
        'Tax rate already exists for this location',
      );
    });
  });

  describe('listTaxRates', () => {
    it('should list tax rates for a country', async () => {
      const country = 'US';
      const mockRates = [
        { id: '1', country, state: 'CA', rate: 8.625 },
        { id: '2', country, state: 'NY', rate: 8.875 },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockRates),
      };

      mockTaxRateRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.listTaxRates(country);

      expect(result).toEqual(mockRates);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });
  });

  describe('validateTaxCompliance', () => {
    it('should validate tax compliance for a location', async () => {
      const userId = 'user-id';
      const country = 'US';
      const state = 'CA';

      const mockTaxRate = {
        rate: 8.625,
        updatedAt: new Date(),
      };

      mockTaxRateRepository.findOne.mockResolvedValue(mockTaxRate);

      const result = await service.validateTaxCompliance(userId, country, state);

      expect(result).toEqual({
        compliant: true,
        country,
        state,
        taxRate: 8.625,
        requiresReporting: true,
        lastUpdated: expect.any(Date),
      });
    });
  });
});
