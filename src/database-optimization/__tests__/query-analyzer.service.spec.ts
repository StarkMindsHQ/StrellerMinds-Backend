import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { QueryAnalyzerService } from '../services/query-analyzer.service';
import {
  DatabaseOptimizationConfig,
  DEFAULT_OPTIMIZATION_CONFIG,
} from '../interfaces/optimization-config.interface';

// Mock jest if not available globally
const mockFn = () => {
  const fn = (...args: any[]) => fn;
  fn.mockResolvedValue = (value: any) => {
    fn._mockResolvedValue = value;
    return fn;
  };
  fn.mockRejectedValue = (value: any) => {
    fn._mockRejectedValue = value;
    return fn;
  };
  fn.mockImplementationOnce = (impl: any) => {
    fn._mockImplementationOnce = impl;
    return fn;
  };
  fn.mockClear = () => {
    delete fn._mockResolvedValue;
    delete fn._mockRejectedValue;
    return fn;
  };
  return fn;
};

const jest = {
  fn: mockFn,
  clearAllMocks: () => {},
};

describe('QueryAnalyzerService', () => {
  let service: QueryAnalyzerService;
  let dataSource: any;

  const mockExecutionPlan = {
    nodeType: 'Seq Scan',
    totalCost: 1500.0,
    startupCost: 0.0,
    planRows: 1000,
    planWidth: 100,
    actualRows: 950,
    actualLoops: 1,
    actualTotalTime: 25.5,
    children: [],
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryAnalyzerService,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        {
          provide: DatabaseOptimizationConfig,
          useValue: DEFAULT_OPTIMIZATION_CONFIG,
        },
      ],
    }).compile();

    service = module.get<QueryAnalyzerService>(QueryAnalyzerService);
    dataSource = module.get(getDataSourceToken());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeQuery', () => {
    it('should analyze a query and return optimization suggestions', async () => {
      const testQuery = 'SELECT * FROM users WHERE age > 25';

      dataSource.query.mockResolvedValue([{ 'QUERY PLAN': [mockExecutionPlan] }]);

      const result = await service.analyzeQuery(testQuery);

      expect(result).toBeDefined();
      expect(result.query).toBe(testQuery);
      expect(result.executionPlan).toEqual(mockExecutionPlan);
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.indexRecommendations).toBeInstanceOf(Array);
      expect(typeof result.performanceScore).toBe('number');
      expect(result.performanceScore).toBeGreaterThanOrEqual(0);
      expect(result.performanceScore).toBeLessThanOrEqual(100);
    });

    it('should detect sequential scan and suggest index creation', async () => {
      const testQuery = 'SELECT * FROM large_table WHERE column1 = 123';

      dataSource.query.mockResolvedValue([{ 'QUERY PLAN': [mockExecutionPlan] }]);

      const result = await service.analyzeQuery(testQuery);

      const indexSuggestion = result.suggestions.find((s) => s.type === 'INDEX');
      expect(indexSuggestion).toBeDefined();
      expect(indexSuggestion?.priority).toBe('HIGH');
      expect(indexSuggestion?.description).toContain('Sequential scan detected');
    });

    it('should detect SELECT * usage and suggest optimization', async () => {
      const testQuery = 'SELECT * FROM users';

      dataSource.query.mockResolvedValue([
        { 'QUERY PLAN': [{ ...mockExecutionPlan, nodeType: 'Index Scan' }] },
      ]);

      const result = await service.analyzeQuery(testQuery);

      const selectStarSuggestion = result.suggestions.find((s) =>
        s.description.includes('SELECT * usage detected'),
      );
      expect(selectStarSuggestion).toBeDefined();
      expect(selectStarSuggestion?.priority).toBe('LOW');
    });

    it('should detect missing WHERE clause', async () => {
      const testQuery = 'SELECT name, email FROM users';

      dataSource.query.mockResolvedValue([{ 'QUERY PLAN': [mockExecutionPlan] }]);

      const result = await service.analyzeQuery(testQuery);

      const whereClauseSuggestion = result.suggestions.find((s) =>
        s.description.includes('Query without WHERE clause'),
      );
      expect(whereClauseSuggestion).toBeDefined();
      expect(whereClauseSuggestion?.priority).toBe('CRITICAL');
    });

    it('should handle query analysis errors gracefully', async () => {
      const testQuery = 'INVALID SQL QUERY';

      dataSource.query.mockRejectedValue(new Error('SQL syntax error'));

      await expect(service.analyzeQuery(testQuery)).rejects.toThrow('SQL syntax error');
    });
  });

  describe('query history management', () => {
    it('should track query performance metrics', async () => {
      const testQuery = 'SELECT id FROM users WHERE active = true';

      dataSource.query.mockResolvedValue([
        { 'QUERY PLAN': [{ ...mockExecutionPlan, nodeType: 'Index Scan' }] },
      ]);

      // Execute the same query multiple times
      await service.analyzeQuery(testQuery);
      await service.analyzeQuery(testQuery);
      await service.analyzeQuery(testQuery);

      const history = service.getQueryHistory();
      expect(history.length).toBe(1);

      const queryMetrics = history[0];
      expect(queryMetrics.totalExecutions).toBe(3);
      expect(queryMetrics.query).toBe(testQuery);
      expect(queryMetrics.avgExecutionTime).toBeGreaterThan(0);
    });

    it('should identify slow queries correctly', async () => {
      const fastQuery = 'SELECT id FROM users LIMIT 1';
      const slowQuery = 'SELECT * FROM large_table';

      // Mock fast execution
      dataSource.query.mockResolvedValue([
        { 'QUERY PLAN': [{ ...mockExecutionPlan, totalCost: 10 }] },
      ]);

      await service.analyzeQuery(fastQuery);

      // Mock slow execution by delaying
      dataSource.query.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve([{ 'QUERY PLAN': [mockExecutionPlan] }]), 1100),
          ),
      );

      await service.analyzeQuery(slowQuery);

      const slowQueries = service.getSlowQueries(1000);
      expect(slowQueries.length).toBe(1);
      expect(slowQueries[0].query).toBe(slowQuery);
    });

    it('should clear query history', async () => {
      const testQuery = 'SELECT * FROM test_table';

      dataSource.query.mockResolvedValue([{ 'QUERY PLAN': [mockExecutionPlan] }]);

      await service.analyzeQuery(testQuery);
      expect(service.getQueryHistory().length).toBe(1);

      service.clearQueryHistory();
      expect(service.getQueryHistory().length).toBe(0);
    });
  });

  describe('performance scoring', () => {
    it('should calculate performance score based on execution time and cost', async () => {
      const efficientQuery = 'SELECT id FROM users WHERE id = 1';

      dataSource.query.mockResolvedValue([
        { 'QUERY PLAN': [{ ...mockExecutionPlan, totalCost: 10, nodeType: 'Index Scan' }] },
      ]);

      const result = await service.analyzeQuery(efficientQuery);
      expect(result.performanceScore).toBeGreaterThan(80);
    });

    it('should penalize queries with sequential scans', async () => {
      const inefficientQuery = 'SELECT * FROM large_table WHERE column = value';

      dataSource.query.mockResolvedValue([
        { 'QUERY PLAN': [mockExecutionPlan] }, // Sequential scan with high cost
      ]);

      const result = await service.analyzeQuery(inefficientQuery);
      expect(result.performanceScore).toBeLessThan(80);
    });
  });

  describe('index recommendations', () => {
    it('should recommend indexes for sequential scans', async () => {
      const testQuery = 'SELECT * FROM products WHERE category_id = 5';

      dataSource.query.mockResolvedValue([{ 'QUERY PLAN': [mockExecutionPlan] }]);

      const result = await service.analyzeQuery(testQuery);

      expect(result.indexRecommendations.length).toBeGreaterThan(0);
      const recommendation = result.indexRecommendations[0];
      expect(recommendation.indexType).toBe('BTREE');
      expect(recommendation.estimatedImprovement).toBeGreaterThan(0);
      expect(recommendation.reason).toContain('Sequential scan detected');
    });
  });
});
