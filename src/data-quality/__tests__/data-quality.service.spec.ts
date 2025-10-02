import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import type { Repository } from 'typeorm';
import type { Queue } from 'bull';
import { jest } from '@jest/globals';

import { DataQualityService } from '../services/data-quality.service';
import { DataValidationService } from '../services/data-validation.service';
import { DataQualityMonitoringService } from '../services/data-quality-monitoring.service';
import { DataQualityRule } from '../entities/data-quality-rule.entity';
import { DataQualityMetric } from '../entities/data-quality-metric.entity';
import { DataQualityIssue } from '../entities/data-quality-issue.entity';

describe('DataQualityService', () => {
  let service: DataQualityService;
  let ruleRepository: Repository<DataQualityRule>;
  let metricRepository: Repository<DataQualityMetric>;
  let issueRepository: Repository<DataQualityIssue>;
  let dataQualityQueue: Queue;
  let validationService: DataValidationService;
  let monitoringService: DataQualityMonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataQualityService,
        {
          provide: getRepositoryToken(DataQualityRule),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DataQualityMetric),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DataQualityIssue),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getQueueToken('data-quality'),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: DataValidationService,
          useValue: {
            checkCompleteness: jest.fn(),
            checkAccuracy: jest.fn(),
            checkConsistency: jest.fn(),
            checkValidity: jest.fn(),
            checkUniqueness: jest.fn(),
            checkTimeliness: jest.fn(),
            checkConformity: jest.fn(),
          },
        },
        {
          provide: DataQualityMonitoringService,
          useValue: {
            getDashboard: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DataQualityService>(DataQualityService);
    ruleRepository = module.get<Repository<DataQualityRule>>(getRepositoryToken(DataQualityRule));
    metricRepository = module.get<Repository<DataQualityMetric>>(
      getRepositoryToken(DataQualityMetric),
    );
    issueRepository = module.get<Repository<DataQualityIssue>>(
      getRepositoryToken(DataQualityIssue),
    );
    dataQualityQueue = module.get<Queue>(getQueueToken('data-quality'));
    validationService = module.get<DataValidationService>(DataValidationService);
    monitoringService = module.get<DataQualityMonitoringService>(DataQualityMonitoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkDataQuality', () => {
    it('should check data quality and return results', async () => {
      const mockRules = [
        {
          id: 'rule1',
          name: 'Test Rule',
          ruleType: 'completeness',
          severity: 'medium',
          threshold: 90,
          errorMessage: 'Test error',
        },
      ];

      const mockData = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: null },
      ];

      jest.spyOn(service, 'getActiveRules').mockResolvedValue(mockRules as any);
      jest.spyOn(validationService, 'checkCompleteness').mockResolvedValue({
        passed: false,
        score: 75,
        failedData: [{ id: 2, name: 'Jane', email: null }],
      });
      jest.spyOn(metricRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(metricRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(issueRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(issueRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(issueRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(dataQualityQueue, 'add').mockResolvedValue({} as any);

      const result = await service.checkDataQuality('user', mockData);

      expect(result.passed).toBe(false);
      expect(result.score).toBe(75);
      expect(result.issues).toHaveLength(1);
      expect(result.metrics).toHaveLength(1);
    });
  });

  describe('createRule', () => {
    it('should create a new data quality rule', async () => {
      const ruleData = {
        name: 'Test Rule',
        description: 'Test description',
        ruleType: 'completeness',
        entityType: 'user',
        conditions: { field: 'email' },
      };

      const mockRule = { id: 'rule1', ...ruleData };

      jest.spyOn(ruleRepository, 'create').mockReturnValue(mockRule as any);
      jest.spyOn(ruleRepository, 'save').mockResolvedValue(mockRule as any);

      const result = await service.createRule(ruleData);

      expect(result).toEqual(mockRule);
      expect(ruleRepository.create).toHaveBeenCalledWith(ruleData);
      expect(ruleRepository.save).toHaveBeenCalledWith(mockRule);
    });
  });

  describe('getActiveRules', () => {
    it('should return active rules for entity type', async () => {
      const mockRules = [
        { id: 'rule1', name: 'Rule 1', entityType: 'user', status: 'active' },
        { id: 'rule2', name: 'Rule 2', entityType: 'user', status: 'active' },
      ];

      jest.spyOn(ruleRepository, 'find').mockResolvedValue(mockRules as any);

      const result = await service.getActiveRules('user');

      expect(result).toEqual(mockRules);
      expect(ruleRepository.find).toHaveBeenCalledWith({
        where: {
          entityType: 'user',
          status: 'active',
        },
        order: {
          severity: 'DESC',
          createdAt: 'ASC',
        },
      });
    });
  });
});
