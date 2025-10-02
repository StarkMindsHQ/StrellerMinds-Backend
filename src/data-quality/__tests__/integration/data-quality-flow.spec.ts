import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Repository } from 'typeorm';
import type { Queue } from 'bull';
import { jest } from '@jest/globals';

import { DataQualityService } from '../../services/data-quality.service';
import { DataValidationService } from '../../services/data-validation.service';
import { DataCleansingService } from '../../services/data-cleansing.service';
import { DataGovernanceService } from '../../services/data-governance.service';
import { DataQualityMonitoringService } from '../../services/data-quality-monitoring.service';
import { DataQualityReportingService } from '../../services/data-quality-reporting.service';

import {
  DataQualityRule,
  RuleType,
  RuleSeverity,
  RuleStatus,
} from '../../entities/data-quality-rule.entity';
import { DataQualityMetric } from '../../entities/data-quality-metric.entity';
import { DataQualityIssue } from '../../entities/data-quality-issue.entity';
import { DataGovernancePolicy } from '../../entities/data-governance-policy.entity';
import { DataLineage } from '../../entities/data-lineage.entity';
import { DataQualityReport } from '../../entities/data-quality-report.entity';

describe('Data Quality Management Integration', () => {
  let dataQualityService: DataQualityService;
  let validationService: DataValidationService;
  let cleansingService: DataCleansingService;
  let governanceService: DataGovernanceService;
  let monitoringService: DataQualityMonitoringService;
  let reportingService: DataQualityReportingService;

  let ruleRepository: Repository<DataQualityRule>;
  let metricRepository: Repository<DataQualityMetric>;
  let issueRepository: Repository<DataQualityIssue>;
  let policyRepository: Repository<DataGovernancePolicy>;
  let lineageRepository: Repository<DataLineage>;
  let reportRepository: Repository<DataQualityReport>;

  let dataQualityQueue: Queue;
  let cleansingQueue: Queue;
  let monitoringQueue: Queue;
  let eventEmitter: EventEmitter2;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataQualityService,
        DataValidationService,
        DataCleansingService,
        DataGovernanceService,
        DataQualityMonitoringService,
        DataQualityReportingService,
        {
          provide: getRepositoryToken(DataQualityRule),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(DataQualityMetric),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(DataQualityIssue),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(DataGovernancePolicy),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(DataLineage),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(DataQualityReport),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getQueueToken('data-quality'),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: getQueueToken('data-cleansing'),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: getQueueToken('data-quality-monitoring'),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    dataQualityService = module.get<DataQualityService>(DataQualityService);
    validationService = module.get<DataValidationService>(DataValidationService);
    cleansingService = module.get<DataCleansingService>(DataCleansingService);
    governanceService = module.get<DataGovernanceService>(DataGovernanceService);
    monitoringService = module.get<DataQualityMonitoringService>(DataQualityMonitoringService);
    reportingService = module.get<DataQualityReportingService>(DataQualityReportingService);

    ruleRepository = module.get<Repository<DataQualityRule>>(getRepositoryToken(DataQualityRule));
    metricRepository = module.get<Repository<DataQualityMetric>>(
      getRepositoryToken(DataQualityMetric),
    );
    issueRepository = module.get<Repository<DataQualityIssue>>(
      getRepositoryToken(DataQualityIssue),
    );
    policyRepository = module.get<Repository<DataGovernancePolicy>>(
      getRepositoryToken(DataGovernancePolicy),
    );
    lineageRepository = module.get<Repository<DataLineage>>(getRepositoryToken(DataLineage));
    reportRepository = module.get<Repository<DataQualityReport>>(
      getRepositoryToken(DataQualityReport),
    );

    dataQualityQueue = module.get<Queue>(getQueueToken('data-quality'));
    cleansingQueue = module.get<Queue>(getQueueToken('data-cleansing'));
    monitoringQueue = module.get<Queue>(getQueueToken('data-quality-monitoring'));
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Data Quality Flow', () => {
    it('should execute complete data quality check flow', async () => {
      // Setup test data
      const testData = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
        { id: 2, name: '', email: 'invalid-email', age: -5 },
        { id: 3, name: 'Jane Smith', email: 'jane@example.com', age: 25 },
      ];

      // Setup rules
      const mockRules = [
        {
          id: 'rule1',
          name: 'Name Completeness',
          ruleType: RuleType.COMPLETENESS,
          severity: RuleSeverity.HIGH,
          threshold: 90,
          entityType: 'user',
          conditions: { field: 'name' },
          status: RuleStatus.ACTIVE,
        },
        {
          id: 'rule2',
          name: 'Email Validity',
          ruleType: RuleType.VALIDITY,
          severity: RuleSeverity.HIGH,
          threshold: 95,
          entityType: 'user',
          conditions: { field: 'email', dataType: 'email' },
          status: RuleStatus.ACTIVE,
        },
        {
          id: 'rule3',
          name: 'Age Range',
          ruleType: RuleType.VALIDITY,
          severity: RuleSeverity.MEDIUM,
          threshold: 100,
          entityType: 'user',
          conditions: { field: 'age', range: { min: 0, max: 120 } },
          status: RuleStatus.ACTIVE,
        },
      ];

      // Mock repository responses
      jest.spyOn(ruleRepository, 'find').mockResolvedValue(mockRules as any);
      jest.spyOn(metricRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(metricRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(issueRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(issueRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(issueRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(dataQualityQueue, 'add').mockResolvedValue({} as any);

      // Execute data quality check
      const result = await dataQualityService.checkDataQuality('user', testData);

      // Verify results
      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.metrics.length).toBe(3); // One for each rule

      // Verify that metrics were recorded
      expect(metricRepository.save).toHaveBeenCalledTimes(3);

      // Verify that issues were created
      expect(issueRepository.save).toHaveBeenCalled();

      // Verify that background processing was queued
      expect(dataQualityQueue.add).toHaveBeenCalledWith('process-quality-check', {
        entityType: 'user',
        result,
        timestamp: expect.any(Date),
      });
    });

    it('should integrate with governance policies', async () => {
      // Setup governance policy
      const mockPolicy = {
        id: 'policy1',
        name: 'User Data Policy',
        category: 'privacy',
        rules: { requireEmailValidation: true, minAge: 18 },
        entityTypes: ['user'],
        status: 'active',
      };

      jest.spyOn(policyRepository, 'find').mockResolvedValue([mockPolicy] as any);

      const testData = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 25 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 16 },
      ];

      // Execute compliance validation
      const complianceResult = await governanceService.validateCompliance('user', testData);

      expect(complianceResult).toHaveProperty('compliant');
      expect(complianceResult).toHaveProperty('violations');
      expect(complianceResult).toHaveProperty('score');

      // Should have violations for underage user
      if (!complianceResult.compliant) {
        expect(complianceResult.violations.length).toBeGreaterThan(0);
      }
    });

    it('should perform data cleansing after quality check', async () => {
      const dirtyData = [
        { id: 1, name: '  John Doe  ', email: 'JOHN@EXAMPLE.COM', phone: '123-456-7890' },
        { id: 2, name: 'jane smith', email: 'jane@example.com', phone: '(555) 123-4567' },
      ];

      const cleansingRules = [
        { field: 'name', operations: ['trim', 'title_case'] },
        { field: 'email', operations: ['lowercase', 'trim'] },
        { field: 'phone', operations: ['normalize_phone'] },
      ];

      jest.spyOn(cleansingQueue, 'add').mockResolvedValue({} as any);

      // Execute cleansing
      const cleanedData = await cleansingService.cleanseData(dirtyData, cleansingRules);

      expect(cleanedData).toHaveLength(2);
      expect(cleanedData[0].name).toBe('John Doe');
      expect(cleanedData[0].email).toBe('john@example.com');
      expect(cleanedData[1].name).toBe('Jane Smith');
    });

    it('should generate comprehensive quality report', async () => {
      // Setup mock data for reporting
      const mockMetrics = [
        {
          id: 'metric1',
          entityType: 'user',
          metricCategory: 'completeness',
          value: 85,
          passed: true,
          timestamp: new Date(),
        },
        {
          id: 'metric2',
          entityType: 'user',
          metricCategory: 'accuracy',
          value: 92,
          passed: true,
          timestamp: new Date(),
        },
      ];

      const mockIssues = [
        {
          id: 'issue1',
          entityType: 'user',
          title: 'Email Validation Failed',
          priority: 'high',
          status: 'open',
          createdAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockMetrics);
      jest.spyOn(issueRepository, 'find').mockResolvedValue(mockIssues as any);
      jest.spyOn(reportRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(reportRepository, 'save').mockResolvedValue({} as any);

      // Generate report
      const report = await reportingService.generateQualityReport({
        entityType: 'user',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        includeRecommendations: true,
      });

      expect(report).toHaveProperty('reportId');
      expect(report).toHaveProperty('entityType', 'user');
      expect(report).toHaveProperty('overallScore');
      expect(report).toHaveProperty('categoryScores');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('generatedAt');

      // Verify report was saved
      expect(reportRepository.save).toHaveBeenCalled();
    });

    it('should handle real-time monitoring and alerting', async () => {
      // Setup monitoring scenario
      const mockMetrics = {
        currentScore: 45, // Low score to trigger alert
        trend: 'declining' as const,
        activeChecks: 10,
        failureRate: 65, // High failure rate
        lastCheckTime: new Date(),
      };

      // Mock unique entity types
      mockQueryBuilder.getRawMany.mockResolvedValue([{ entityType: 'user' }]);

      // Mock real-time metrics
      jest.spyOn(monitoringService, 'getRealTimeMetrics').mockResolvedValue(mockMetrics);

      // Execute real-time monitoring
      await monitoringService.performRealTimeMonitoring();

      // Verify alerts were emitted
      expect(eventEmitter.emit).toHaveBeenCalledWith('metrics.realtime', {
        entityType: 'user',
        metrics: mockMetrics,
        timestamp: expect.any(Date),
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('alert.critical', {
        type: 'high_failure_rate',
        entityType: 'user',
        failureRate: 65,
        timestamp: expect.any(Date),
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('alert.critical', {
        type: 'low_quality_score',
        entityType: 'user',
        score: 45,
        timestamp: expect.any(Date),
      });
    });

    it('should track data lineage through transformations', async () => {
      // Setup lineage tracking
      const lineageData = {
        sourceEntity: 'raw_users',
        targetEntity: 'processed_users',
        transformationType: 'cleansing' as any,
        transformationRules: {
          operations: ['trim', 'normalize', 'validate'],
          qualityRules: ['completeness', 'validity'],
        },
        dataFlow: 'User Data Processing Pipeline',
      };

      jest.spyOn(lineageRepository, 'create').mockReturnValue(lineageData as any);
      jest.spyOn(lineageRepository, 'save').mockResolvedValue(lineageData as any);

      // Create lineage record
      const lineage = await governanceService.createLineage(lineageData);

      expect(lineage).toEqual(lineageData);
      expect(lineageRepository.create).toHaveBeenCalledWith(lineageData);
      expect(lineageRepository.save).toHaveBeenCalledWith(lineageData);

      // Verify lineage can be retrieved
      mockQueryBuilder.getMany.mockResolvedValue([lineageData]);
      const retrievedLineage = await governanceService.getLineage('processed_users');

      expect(retrievedLineage).toContain(lineageData);
    });

    it('should handle end-to-end quality improvement workflow', async () => {
      // 1. Initial quality check reveals issues
      const initialData = [
        { id: 1, name: '', email: 'invalid', age: -1 },
        { id: 2, name: 'John', email: 'john@example.com', age: 30 },
      ];

      const mockRules = [
        {
          id: 'rule1',
          name: 'Completeness Check',
          ruleType: RuleType.COMPLETENESS,
          severity: RuleSeverity.HIGH,
          threshold: 100,
          entityType: 'user',
          conditions: { field: 'name' },
          status: RuleStatus.ACTIVE,
          autoFix: true,
          fixActions: { defaultValue: 'Unknown' },
        },
      ];

      jest.spyOn(ruleRepository, 'find').mockResolvedValue(mockRules as any);
      jest.spyOn(metricRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(metricRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(issueRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(issueRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(issueRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(dataQualityQueue, 'add').mockResolvedValue({} as any);

      // 2. Execute quality check
      const qualityResult = await dataQualityService.checkDataQuality('user', initialData);
      expect(qualityResult.passed).toBe(false);

      // 3. Apply cleansing rules
      const cleansingRules = [
        { field: 'name', operations: ['fill_empty'], defaultValue: 'Unknown' },
        { field: 'email', operations: ['validate_email'] },
        { field: 'age', operations: ['clamp'], min: 0, max: 120 },
      ];

      const cleanedData = await cleansingService.cleanseData(initialData, cleansingRules);
      expect(cleanedData[0].name).toBe('Unknown');
      expect(cleanedData[0].age).toBe(0);

      // 4. Re-run quality check on cleaned data
      const improvedResult = await dataQualityService.checkDataQuality('user', cleanedData);

      // Quality should be improved after cleansing
      expect(improvedResult.score).toBeGreaterThan(qualityResult.score);

      // 5. Generate improvement report
      const improvementReport = {
        originalScore: qualityResult.score,
        improvedScore: improvedResult.score,
        improvement: improvedResult.score - qualityResult.score,
        issuesResolved: qualityResult.issues.length - improvedResult.issues.length,
      };

      expect(improvementReport.improvement).toBeGreaterThan(0);
      expect(improvementReport.issuesResolved).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty datasets gracefully', async () => {
      const emptyData: any[] = [];
      jest.spyOn(ruleRepository, 'find').mockResolvedValue([]);

      const result = await dataQualityService.checkDataQuality('user', emptyData);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.issues).toHaveLength(0);
      expect(result.metrics).toHaveLength(0);
    });

    it('should handle missing rules gracefully', async () => {
      const testData = [{ id: 1, name: 'John' }];
      jest.spyOn(ruleRepository, 'find').mockResolvedValue([]);

      const result = await dataQualityService.checkDataQuality('unknown_entity', testData);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle service errors gracefully', async () => {
      const testData = [{ id: 1, name: 'John' }];
      jest.spyOn(ruleRepository, 'find').mockRejectedValue(new Error('Database error'));

      await expect(dataQualityService.checkDataQuality('user', testData)).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle malformed data gracefully', async () => {
      const malformedData = [null, undefined, { id: 1 }, { name: 'John' }, 'invalid data'];

      const cleansingRules = [{ field: 'name', operations: ['trim'] }];

      // Should not throw error, but handle gracefully
      const result = await cleansingService.cleanseData(malformedData as any, cleansingRules);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
