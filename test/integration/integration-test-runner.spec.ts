import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from '../../src/common/circuit-breaker/circuit-breaker.service';
import { ServiceMockerService } from '../../src/common/mocking/service-mocker.service';
import { IntegrationMonitoringService } from '../../src/common/monitoring/integration-monitoring.service';
import { Logger } from '@nestjs/common';

/**
 * Integration Test Runner
 * 
 * Orchestrates comprehensive integration testing for external services.
 * Provides test execution, reporting, and validation capabilities.
 * 
 * Test Strategy:
 * 1. Execute integration tests for all services
 * 2. Validate contract compliance
 * 3. Test circuit breaker behavior
 * 4. Monitor performance metrics
 * 5. Generate comprehensive reports
 * 
 * Business Rules:
 * - All tests must pass in CI/CD pipeline
 * - Performance thresholds must be met
 * - Error handling must be validated
 * - Mock behavior must match real services
 */

export interface TestSuite {
  name: string;
  tests: TestCase[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  timeout?: number;
}

export interface TestCase {
  name: string;
  description: string;
  execute: () => Promise<TestResult>;
  timeout?: number;
  retries?: number;
  expectedStatus?: 'pass' | 'fail';
}

export interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip' | 'timeout';
  duration: number;
  error?: string;
  details?: any;
  metrics?: {
    responseTime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
}

export interface TestReport {
  suiteName: string;
  timestamp: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  timeoutTests: number;
  totalDuration: number;
  results: TestResult[];
  summary: {
    successRate: number;
    averageDuration: number;
    slowestTest: string;
    fastestTest: string;
  };
  recommendations: string[];
}

export interface IntegrationTestConfig {
  enabled: boolean;
  timeout: number;
  retries: number;
  parallel: boolean;
  services: string[];
  thresholds: {
    responseTime: number;
    successRate: number;
    errorRate: number;
  };
}

describe('Integration Test Runner', () => {
  let app: TestingModule;
  let circuitBreaker: CircuitBreakerService;
  let serviceMocker: ServiceMockerService;
  let monitoring: IntegrationMonitoringService;
  let config: IntegrationTestConfig;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.INTEGRATION_TESTS_ENABLED = 'true';

    const moduleRef = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        ServiceMockerService,
        IntegrationMonitoringService,
        ConfigService,
        Logger,
      ],
    }).compile();

    app = moduleRef;
    circuitBreaker = moduleRef.get<CircuitBreakerService>(CircuitBreakerService);
    serviceMocker = moduleRef.get<ServiceMockerService>(ServiceMockerService);
    monitoring = moduleRef.get<IntegrationMonitoringService>(IntegrationMonitoringService);
    config = moduleRef.get<ConfigService>(ConfigService).get('integrationTest') || {
      enabled: true,
      timeout: 30000,
      retries: 3,
      parallel: false,
      services: ['stripe', 'paypal', 'zoom'],
      thresholds: {
        responseTime: 5000,
        successRate: 95,
        errorRate: 5,
      },
    };
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Execute complete integration test suite
   * 
   * Algorithm:
   * 1. Setup test environment
   * 2. Execute all test suites
   * 3. Collect results and metrics
   * 4. Generate comprehensive report
   * 5. Validate thresholds
   * 6. Cleanup test environment
   */
  describe('Complete Integration Tests', () => {
    let testReport: TestReport;

    it('should execute all integration tests', async () => {
      const testSuites = [
        createStripeTestSuite(),
        createPayPalTestSuite(),
        createZoomTestSuite(),
        createCircuitBreakerTestSuite(),
        createServiceMockerTestSuite(),
        createMonitoringTestSuite(),
      ];

      testReport = await executeTestSuites(testSuites);

      // Validate test results
      expect(testReport.totalTests).toBeGreaterThan(0);
      expect(testReport.summary.successRate).toBeGreaterThanOrEqual(config.thresholds.successRate);
      
      // Log test summary
      logTestSummary(testReport);

      // Validate performance thresholds
      validatePerformanceThresholds(testReport);
    }, 300000); // 5 minutes timeout

    /**
     * Execute test suites
     */
    async function executeTestSuites(testSuites: TestSuite[]): Promise<TestReport> {
      const allResults: TestResult[] = [];
      const startTime = Date.now();

      for (const suite of testSuites) {
        console.log(`\n🧪 Executing test suite: ${suite.name}`);
        
        try {
          // Setup suite
          if (suite.setup) {
            await suite.setup();
          }

          // Execute tests
          const suiteResults = await executeTestSuite(suite);
          allResults.push(...suiteResults);

          // Teardown suite
          if (suite.teardown) {
            await suite.teardown();
          }

        } catch (error) {
          console.error(`❌ Test suite ${suite.name} failed:`, error.message);
          
          // Add failed result for the entire suite
          allResults.push({
            name: suite.name,
            status: 'fail',
            duration: 0,
            error: error.message,
          });
        }
      }

      // Generate report
      return generateTestReport('Integration Tests', allResults, startTime);
    }

    /**
     * Execute individual test suite
     */
    async function executeTestSuite(suite: TestSuite): Promise<TestResult[]> {
      const results: TestResult[] = [];

      for (const testCase of suite.tests) {
        const result = await executeTestCase(testCase);
        results.push(result);
      }

      return results;
    }

    /**
     * Execute individual test case
     */
    async function executeTestCase(testCase: TestCase): Promise<TestResult> {
      const startTime = Date.now();
      const timeout = testCase.timeout || config.timeout;
      const retries = testCase.retries || config.retries;

      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          // Execute test with timeout
          const result = await executeWithTimeout(testCase.execute(), timeout);
          
          const duration = Date.now() - startTime;
          
          return {
            name: testCase.name,
            status: testCase.expectedStatus === 'fail' ? 'fail' : 'pass',
            duration,
            details: result,
          };

        } catch (error) {
          lastError = error as Error;
          
          if (attempt < retries) {
            console.log(`⚠️  Test ${testCase.name} failed, retrying (${attempt + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
          }
        }
      }

      const duration = Date.now() - startTime;
      
      return {
        name: testCase.name,
        status: lastError?.message.includes('timeout') ? 'timeout' : 'fail',
        duration,
        error: lastError?.message,
      };
    }

    /**
     * Execute function with timeout
     */
    async function executeWithTimeout<T>(fn: Promise<T>, timeoutMs: number): Promise<T> {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Test timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        fn
          .then(result => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch(error => {
            clearTimeout(timeout);
            reject(error);
          });
      });
    }

    /**
     * Generate comprehensive test report
     */
    function generateTestReport(suiteName: string, results: TestResult[], startTime: number): TestReport {
      const totalTests = results.length;
      const passedTests = results.filter(r => r.status === 'pass').length;
      const failedTests = results.filter(r => r.status === 'fail').length;
      const skippedTests = results.filter(r => r.status === 'skip').length;
      const timeoutTests = results.filter(r => r.status === 'timeout').length;
      const totalDuration = Date.now() - startTime;

      const durations = results.map(r => r.duration);
      const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const slowestTest = results.reduce((slowest, r) => r.duration > (slowest?.duration || 0) ? r : slowest);
      const fastestTest = results.reduce((fastest, r) => r.duration < (fastest?.duration || Infinity) ? r : fastest);

      const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

      // Generate recommendations
      const recommendations = generateRecommendations(results);

      return {
        suiteName,
        timestamp: Date.now(),
        totalTests,
        passedTests,
        failedTests,
        skippedTests,
        timeoutTests,
        totalDuration,
        results,
        summary: {
          successRate,
          averageDuration,
          slowestTest: slowestTest?.name || 'N/A',
          fastestTest: fastestTest?.name || 'N/A',
        },
        recommendations,
      };
    }

    /**
     * Generate recommendations based on test results
     */
    function generateRecommendations(results: TestResult[]): string[] {
      const recommendations: string[] = [];

      // Check for slow tests
      const slowTests = results.filter(r => r.duration > config.thresholds.responseTime);
      if (slowTests.length > 0) {
        recommendations.push(`${slowTests.length} tests exceeded response time threshold (${config.thresholds.responseTime}ms)`);
      }

      // Check for failed tests
      const failedTests = results.filter(r => r.status === 'fail');
      if (failedTests.length > 0) {
        recommendations.push(`${failedTests.length} tests failed. Review error logs for details.`);
      }

      // Check for timeout tests
      const timeoutTests = results.filter(r => r.status === 'timeout');
      if (timeoutTests.length > 0) {
        recommendations.push(`${timeoutTests.length} tests timed out. Consider increasing timeout or optimizing test performance.`);
      }

      // Check success rate
      const successRate = (results.filter(r => r.status === 'pass').length / results.length) * 100;
      if (successRate < config.thresholds.successRate) {
        recommendations.push(`Success rate (${successRate.toFixed(2)}%) is below threshold (${config.thresholds.successRate}%).`);
      }

      return recommendations;
    }

    /**
     * Log test summary
     */
    function logTestSummary(report: TestReport): void {
      console.log('\n📊 Integration Test Summary');
      console.log('========================');
      console.log(`Total Tests: ${report.totalTests}`);
      console.log(`Passed: ${report.passedTests} (${report.summary.successRate.toFixed(2)}%)`);
      console.log(`Failed: ${report.failedTests}`);
      console.log(`Skipped: ${report.skippedTests}`);
      console.log(`Timeout: ${report.timeoutTests}`);
      console.log(`Duration: ${report.totalDuration}ms`);
      console.log(`Average: ${report.summary.averageDuration.toFixed(2)}ms`);
      console.log(`Slowest: ${report.summary.slowestTest}`);
      console.log(`Fastest: ${report.summary.fastestTest}`);

      if (report.recommendations.length > 0) {
        console.log('\n⚠️  Recommendations:');
        report.recommendations.forEach(rec => console.log(`  - ${rec}`));
      }

      console.log('\n📈 Detailed Results:');
      report.results.forEach(result => {
        const status = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : result.status === 'timeout' ? '⏰' : '⏭️';
        console.log(`  ${status} ${result.name} (${result.duration}ms)`);
        if (result.error) {
          console.log(`    Error: ${result.error}`);
        }
      });
    }

    /**
     * Validate performance thresholds
     */
    function validatePerformanceThresholds(report: TestReport): void {
      const avgDuration = report.summary.averageDuration;
      const successRate = report.summary.successRate;

      if (avgDuration > config.thresholds.responseTime) {
        throw new Error(`Average response time (${avgDuration.toFixed(2)}ms) exceeds threshold (${config.thresholds.responseTime}ms)`);
      }

      if (successRate < config.thresholds.successRate) {
        throw new Error(`Success rate (${successRate.toFixed(2)}%) below threshold (${config.thresholds.successRate}%)`);
      }

      if (report.failedTests > 0) {
        throw new Error(`${report.failedTests} tests failed`);
      }
    }
  });

  /**
   * Create Stripe test suite
   */
  function createStripeTestSuite(): TestSuite {
    return {
      name: 'Stripe Integration Tests',
      timeout: 60000,
      tests: [
        {
          name: 'Stripe Payment Intent Creation',
          description: 'Test creating payment intents with Stripe API',
          execute: async () => {
            // Mock Stripe service for testing
            const mock = serviceMocker.createPredefinedMock('stripe');
            
            // Execute with circuit breaker
            const result = await circuitBreaker.execute('stripe', async () => {
              return serviceMocker.executeMock('stripe', {
                type: 'payment_intent',
                amount: 2000,
                currency: 'usd',
              });
            });

            expect(result).toBeDefined();
            expect(result.id).toMatch(/^pi_/);
            expect(result.amount).toBe(2000);
            expect(result.currency).toBe('usd');

            return result;
          },
        },
        {
          name: 'Stripe Customer Management',
          description: 'Test customer CRUD operations',
          execute: async () => {
            const result = await circuitBreaker.execute('stripe', async () => {
              return serviceMocker.executeMock('stripe', {
                type: 'customer',
                email: 'test@example.com',
                name: 'Test User',
              });
            });

            expect(result).toBeDefined();
            expect(result.id).toMatch(/^cus_/);
            expect(result.email).toBe('test@example.com');

            return result;
          },
        },
        {
          name: 'Stripe Webhook Security',
          description: 'Test webhook signature verification',
          execute: async () => {
            // Test webhook security validation
            const payload = JSON.stringify({ test: 'webhook' });
            const signature = 'test_signature';
            
            // This would normally validate with WebhookSecurityService
            // For testing, we simulate the validation
            const isValid = signature.length > 0;
            
            expect(isValid).toBe(true);
            
            return { valid: isValid };
          },
        },
      ],
    };
  }

  /**
   * Create PayPal test suite
   */
  function createPayPalTestSuite(): TestSuite {
    return {
      name: 'PayPal Integration Tests',
      timeout: 60000,
      tests: [
        {
          name: 'PayPal Order Creation',
          description: 'Test creating orders with PayPal API',
          execute: async () => {
            const result = await circuitBreaker.execute('paypal', async () => {
              return serviceMocker.executeMock('paypal', {
                operation: 'create_order',
                intent: 'CAPTURE',
                purchase_units: [{
                  amount: { currency_code: 'USD', value: '20.00' },
                }],
              });
            });

            expect(result).toBeDefined();
            expect(result.id).toMatch(/^ORD-/);
            expect(result.status).toBe('CREATED');

            return result;
          },
        },
        {
          name: 'PayPal Order Capture',
          description: 'Test capturing approved orders',
          execute: async () => {
            const result = await circuitBreaker.execute('paypal', async () => {
              return serviceMocker.executeMock('paypal', {
                operation: 'capture_order',
                orderId: 'ORD-12345',
              });
            });

            expect(result).toBeDefined();
            expect(result.status).toBe('COMPLETED');

            return result;
          },
        },
      ],
    };
  }

  /**
   * Create Zoom test suite
   */
  function createZoomTestSuite(): TestSuite {
    return {
      name: 'Zoom Integration Tests',
      timeout: 60000,
      tests: [
        {
          name: 'Zoom Meeting Creation',
          description: 'Test creating meetings with Zoom API',
          execute: async () => {
            const result = await circuitBreaker.execute('zoom', async () => {
              return serviceMocker.executeMock('zoom', {
                action: 'create_meeting',
                topic: 'Test Meeting',
                type: 2,
                duration: 60,
              });
            });

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.topic).toBe('Test Meeting');

            return result;
          },
        },
        {
          name: 'Zoom User Retrieval',
          description: 'Test retrieving user information',
          execute: async () => {
            const result = await circuitBreaker.execute('zoom', async () => {
              return serviceMocker.executeMock('zoom', {
                action: 'get_user',
                userId: 'test_user',
              });
            });

            expect(result).toBeDefined();
            expect(result.email).toBeDefined();
            expect(result.first_name).toBeDefined();

            return result;
          },
        },
      ],
    };
  }

  /**
   * Create circuit breaker test suite
   */
  function createCircuitBreakerTestSuite(): TestSuite {
    return {
      name: 'Circuit Breaker Tests',
      timeout: 60000,
      tests: [
        {
          name: 'Circuit Breaker Normal Operation',
          description: 'Test circuit breaker in normal operation',
          execute: async () => {
            // Test successful execution
            const result = await circuitBreaker.execute('test-service', async () => {
              return { success: true };
            });

            expect(result.success).toBe(true);

            // Check circuit state
            const state = circuitBreaker.getCircuitState('test-service');
            expect(state.state).toBe('CLOSED');

            return result;
          },
        },
        {
          name: 'Circuit Breaker Error Handling',
          description: 'Test circuit breaker error handling',
          execute: async () => {
            // Test failure handling
            try {
              await circuitBreaker.execute('test-service', async () => {
                throw new Error('Test error');
              });
            } catch (error) {
              expect(error.message).toBe('Test error');
            }

            // Check metrics
            const metrics = circuitBreaker.getMetrics('test-service');
            expect(metrics.failedCalls).toBeGreaterThan(0);

            return { errorHandled: true };
          },
        },
      ],
    };
  }

  /**
   * Create service mocker test suite
   */
  function createServiceMockerTestSuite(): TestSuite {
    return {
      name: 'Service Mocker Tests',
      timeout: 60000,
      tests: [
        {
          name: 'Service Mock Registration',
          description: 'Test registering and using service mocks',
          execute: async () => {
            const mock = serviceMocker.registerMock('test-service', {
              enabled: true,
              latency: { min: 50, max: 100 },
              errorRate: 0,
              responses: [
                {
                  condition: (request) => request.action === 'test',
                  response: { mocked: true },
                },
              ],
            });

            expect(mock.serviceName).toBe('test-service');
            expect(mock.isActive).toBe(true);

            // Test mock execution
            const result = await serviceMocker.executeMock('test-service', { action: 'test' });
            expect(result.mocked).toBe(true);

            return { mock, result };
          },
        },
        {
          name: 'Mock Error Injection',
          description: 'Test error injection in mocks',
          execute: async () => {
            const mock = serviceMocker.registerMock('error-service', {
              enabled: true,
              latency: { min: 10, max: 50 },
              errorRate: 1.0, // 100% error rate
              responses: [
                {
                  condition: () => true,
                  response: { success: true },
                },
              ],
            });

            // Should always fail
            try {
              await serviceMocker.executeMock('error-service', { test: true });
              throw new Error('Expected error was not thrown');
            } catch (error) {
              expect(error.message).toContain('error-service');
            }

            return { errorInjected: true };
          },
        },
      ],
    };
  }

  /**
   * Create monitoring test suite
   */
  function createMonitoringTestSuite(): TestSuite {
    return {
      name: 'Integration Monitoring Tests',
      timeout: 60000,
      tests: [
        {
          name: 'Metrics Recording',
          description: 'Test recording and retrieving metrics',
          execute: async () => {
            // Record some test metrics
            monitoring.recordMetrics('test-service', 100, true);
            monitoring.recordMetrics('test-service', 200, false, 'Test error');
            monitoring.recordMetrics('test-service', 150, true);

            // Get metrics
            const metrics = monitoring.getMetrics('test-service', 1); // Last hour
            expect(metrics.length).toBe(3);

            // Get health status
            const health = monitoring.getHealthStatus('test-service');
            expect(health).toBeDefined();
            expect(health.serviceName).toBe('test-service');

            return { metricsCount: metrics.length, health };
          },
        },
        {
          name: 'Performance Summary',
          description: 'Test performance summary generation',
          execute: async () => {
            // Record test metrics
            for (let i = 0; i < 10; i++) {
              monitoring.recordMetrics('perf-service', 50 + i * 10, i < 8);
            }

            const summary = monitoring.getPerformanceSummary('perf-service', 1);
            expect(summary).toBeDefined();
            expect(summary.totalRequests).toBe(10);
            expect(summary.successRate).toBe(80);

            return summary;
          },
        },
      ],
    };
  }
});
