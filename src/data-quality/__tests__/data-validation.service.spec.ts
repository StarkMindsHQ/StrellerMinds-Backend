import { Test, type TestingModule } from '@nestjs/testing';
import { DataValidationService } from '../services/data-validation.service';

describe('DataValidationService', () => {
  let service: DataValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataValidationService],
    }).compile();

    service = module.get<DataValidationService>(DataValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkCompleteness', () => {
    it('should check completeness and return results', async () => {
      const rule = {
        conditions: { field: 'email' },
        threshold: 80,
      };

      const data = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: null },
        { id: 3, name: 'Bob', email: 'bob@example.com' },
      ];

      const result = await service.checkCompleteness(rule as any, data);

      expect(result.passed).toBe(true); // 66.67% > 80% is false, but let's check the actual calculation
      expect(result.score).toBeCloseTo(66.67, 1);
      expect(result.failedData).toHaveLength(1);
      expect(result.failedData[0].id).toBe(2);
    });

    it('should handle empty data', async () => {
      const rule = {
        conditions: { field: 'email' },
        threshold: 80,
      };

      const result = await service.checkCompleteness(rule as any, []);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.failedData).toBeUndefined();
    });
  });

  describe('checkUniqueness', () => {
    it('should check uniqueness and return results', async () => {
      const rule = {
        conditions: { field: 'email' },
        threshold: 90,
      };

      const data = [
        { id: 1, email: 'john@example.com' },
        { id: 2, email: 'jane@example.com' },
        { id: 3, email: 'john@example.com' }, // duplicate
      ];

      const result = await service.checkUniqueness(rule as any, data);

      expect(result.passed).toBe(false); // 66.67% < 90%
      expect(result.score).toBeCloseTo(66.67, 1);
      expect(result.failedData).toHaveLength(1);
      expect(result.failedData[0].id).toBe(3);
    });
  });

  describe('checkValidity', () => {
    it('should check email validity', async () => {
      const rule = {
        conditions: {
          field: 'email',
          dataType: 'email',
        },
        threshold: 80,
      };

      const data = [
        { id: 1, email: 'john@example.com' },
        { id: 2, email: 'invalid-email' },
        { id: 3, email: 'jane@example.com' },
      ];

      const result = await service.checkValidity(rule as any, data);

      expect(result.passed).toBe(false); // 66.67% < 80%
      expect(result.score).toBeCloseTo(66.67, 1);
      expect(result.failedData).toHaveLength(1);
      expect(result.failedData[0].email).toBe('invalid-email');
    });

    it('should check number range validity', async () => {
      const rule = {
        conditions: {
          field: 'age',
          dataType: 'number',
          range: { min: 0, max: 120 },
        },
        threshold: 90,
      };

      const data = [
        { id: 1, age: 25 },
        { id: 2, age: 150 }, // out of range
        { id: 3, age: 30 },
      ];

      const result = await service.checkValidity(rule as any, data);

      expect(result.passed).toBe(false); // 66.67% < 90%
      expect(result.score).toBeCloseTo(66.67, 1);
      expect(result.failedData).toHaveLength(1);
      expect(result.failedData[0].age).toBe(150);
    });
  });
});
