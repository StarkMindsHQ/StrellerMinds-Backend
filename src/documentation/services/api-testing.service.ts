import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface TestCase {
  name: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: any;
  expectedStatus?: number;
  expectedResponse?: any;
  assertions?: Array<{
    type: 'status' | 'body' | 'header';
    field?: string;
    operator: 'equals' | 'contains' | 'matches' | 'exists';
    value: any;
  }>;
}

export interface TestSuite {
  name: string;
  baseUrl: string;
  tests: TestCase[];
}

export interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  statusCode?: number;
  response?: any;
  error?: string;
  assertions?: Array<{
    assertion: string;
    passed: boolean;
    error?: string;
  }>;
}

@Injectable()
export class ApiTestingService {
  private readonly logger = new Logger(ApiTestingService.name);

  constructor(private httpService: HttpService) {}

  /**
   * Run test suite
   */
  async runTestSuite(suite: TestSuite): Promise<{
    suiteName: string;
    totalTests: number;
    passed: number;
    failed: number;
    results: TestResult[];
    duration: number;
  }> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    this.logger.log(`Running test suite: ${suite.name}`);

    for (const test of suite.tests) {
      const result = await this.runTest(suite.baseUrl, test);
      results.push(result);
    }

    const duration = Date.now() - startTime;
    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;

    return {
      suiteName: suite.name,
      totalTests: suite.tests.length,
      passed,
      failed,
      results,
      duration,
    };
  }

  /**
   * Run single test
   */
  async runTest(baseUrl: string, test: TestCase): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const url = `${baseUrl}${test.path}`;
      const config: any = {
        method: test.method.toLowerCase(),
        url,
        headers: test.headers || {},
        timeout: 10000,
      };

      if (test.body) {
        config.data = test.body;
      }

      const response = await firstValueFrom(this.httpService.request(config));
      const duration = Date.now() - startTime;

      // Run assertions
      const assertions = test.assertions
        ? test.assertions.map((assertion) => this.runAssertion(assertion, response))
        : [];

      // Default assertions
      if (test.expectedStatus) {
        assertions.push({
          assertion: `Status code should be ${test.expectedStatus}`,
          passed: response.status === test.expectedStatus,
          error: response.status !== test.expectedStatus ? `Expected ${test.expectedStatus}, got ${response.status}` : undefined,
        });
      }

      const allPassed = assertions.every((a) => a.passed);

      return {
        testName: test.name,
        passed: allPassed,
        duration,
        statusCode: response.status,
        response: response.data,
        assertions,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        testName: test.name,
        passed: false,
        duration,
        error: error.message || 'Test failed',
        statusCode: error.response?.status,
        response: error.response?.data,
      };
    }
  }

  /**
   * Run assertion
   */
  private runAssertion(assertion: TestCase['assertions'][0], response: any): {
    assertion: string;
    passed: boolean;
    error?: string;
  } {
    try {
      let actualValue: any;
      let passed = false;

      switch (assertion.type) {
        case 'status':
          actualValue = response.status;
          break;
        case 'header':
          actualValue = response.headers[assertion.field!];
          break;
        case 'body':
          actualValue = assertion.field
            ? this.getNestedValue(response.data, assertion.field)
            : response.data;
          break;
      }

      switch (assertion.operator) {
        case 'equals':
          passed = JSON.stringify(actualValue) === JSON.stringify(assertion.value);
          break;
        case 'contains':
          passed = JSON.stringify(actualValue).includes(JSON.stringify(assertion.value));
          break;
        case 'matches':
          passed = new RegExp(assertion.value).test(String(actualValue));
          break;
        case 'exists':
          passed = actualValue !== undefined && actualValue !== null;
          break;
      }

      return {
        assertion: `${assertion.type} ${assertion.field || ''} ${assertion.operator} ${JSON.stringify(assertion.value)}`,
        passed,
        error: passed ? undefined : `Expected ${assertion.operator} ${JSON.stringify(assertion.value)}, got ${JSON.stringify(actualValue)}`,
      };
    } catch (error: any) {
      return {
        assertion: `${assertion.type} ${assertion.field || ''} ${assertion.operator} ${JSON.stringify(assertion.value)}`,
        passed: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate test suite from OpenAPI spec
   */
  generateTestSuiteFromOpenApi(spec: any, baseUrl: string): TestSuite {
    const tests: TestCase[] = [];

    if (spec.paths) {
      for (const [path, methods] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(methods as any)) {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
            const op = operation as any;
            const test: TestCase = {
              name: op.summary || `${method.toUpperCase()} ${path}`,
              method: method.toUpperCase(),
              path,
              expectedStatus: 200,
              assertions: [
                {
                  type: 'status',
                  operator: 'exists',
                  value: true,
                },
              ],
            };

            // Add request body if available
            if (op.requestBody?.content?.['application/json']?.example) {
              test.body = op.requestBody.content['application/json'].example;
            }

            // Add expected status from responses
            if (op.responses) {
              const successStatus = Object.keys(op.responses).find((s) => s.startsWith('2'));
              if (successStatus) {
                test.expectedStatus = parseInt(successStatus);
              }
            }

            tests.push(test);
          }
        }
      }
    }

    return {
      name: 'Generated Test Suite',
      baseUrl,
      tests,
    };
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
