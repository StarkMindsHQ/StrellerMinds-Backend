import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PerformanceMetric, MetricType } from '../entities/performance-metric.entity';

export interface LoadTestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  concurrentUsers: number;
  duration: number; // seconds
  rampUp: number; // seconds to ramp up to full load
}

export interface LoadTestResult {
  testId: string;
  config: LoadTestConfig;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50: number;
  p95: number;
  p99: number;
  requestsPerSecond: number;
  errorRate: number;
  statusCodes: Record<number, number>;
  errors: Array<{ timestamp: Date; message: string }>;
}

@Injectable()
export class LoadTestingService {
  private readonly logger = new Logger(LoadTestingService.name);
  private activeTests = new Map<string, LoadTestResult>();
  private testHistory: LoadTestResult[] = [];

  constructor(private httpService: HttpService) {}

  /**
   * Run a load test
   */
  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();

    this.logger.log(`Starting load test ${testId} with ${config.concurrentUsers} concurrent users`);

    const result: LoadTestResult = {
      testId,
      config,
      startTime,
      endTime: new Date(),
      duration: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      statusCodes: {},
      errors: [],
    };

    this.activeTests.set(testId, result);

    try {
      const responseTimes: number[] = [];
      const endTime = Date.now() + config.duration * 1000;
      const rampUpStep = config.concurrentUsers / config.rampUp;
      let currentUsers = 0;

      // Ramp up phase
      const rampUpStart = Date.now();
      while (Date.now() < rampUpStart + config.rampUp * 1000 && Date.now() < endTime) {
        currentUsers = Math.min(
          config.concurrentUsers,
          Math.floor(((Date.now() - rampUpStart) / 1000) * rampUpStep),
        );
        await this.runConcurrentRequests(config, currentUsers, responseTimes, result);
        await this.sleep(100); // Small delay between ramp-up steps
      }

      // Full load phase
      while (Date.now() < endTime) {
        await this.runConcurrentRequests(config, config.concurrentUsers, responseTimes, result);
        await this.sleep(100);
      }

      // Calculate statistics
      this.calculateStatistics(result, responseTimes);

      result.endTime = new Date();
      result.duration = (result.endTime.getTime() - result.startTime.getTime()) / 1000;
      result.requestsPerSecond = result.totalRequests / result.duration;
      result.errorRate = (result.failedRequests / result.totalRequests) * 100;

      this.testHistory.push(result);
      if (this.testHistory.length > 100) {
        this.testHistory.shift();
      }

      this.logger.log(
        `Load test ${testId} completed: ${result.totalRequests} requests, ${result.requestsPerSecond.toFixed(2)} req/s, ${result.errorRate.toFixed(2)}% errors`,
      );
    } catch (error) {
      this.logger.error(`Load test ${testId} failed: ${error.message}`);
      result.errors.push({
        timestamp: new Date(),
        message: error.message,
      });
    } finally {
      this.activeTests.delete(testId);
    }

    return result;
  }

  /**
   * Run concurrent requests
   */
  private async runConcurrentRequests(
    config: LoadTestConfig,
    concurrentUsers: number,
    responseTimes: number[],
    result: LoadTestResult,
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < concurrentUsers; i++) {
      promises.push(this.makeRequest(config, responseTimes, result));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Make a single request
   */
  private async makeRequest(
    config: LoadTestConfig,
    responseTimes: number[],
    result: LoadTestResult,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const requestConfig: any = {
        method: config.method,
        url: config.url,
        headers: config.headers || {},
        timeout: 10000,
      };

      if (config.body && (config.method === 'POST' || config.method === 'PUT' || config.method === 'PATCH')) {
        requestConfig.data = config.body;
      }

      const response = await firstValueFrom(this.httpService.request(requestConfig));

      const duration = Date.now() - startTime;
      responseTimes.push(duration);

      result.totalRequests++;
      result.successfulRequests++;
      result.statusCodes[response.status] = (result.statusCodes[response.status] || 0) + 1;

      if (duration < result.minResponseTime) result.minResponseTime = duration;
      if (duration > result.maxResponseTime) result.maxResponseTime = duration;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      responseTimes.push(duration);

      result.totalRequests++;
      result.failedRequests++;

      const statusCode = error.response?.status || 0;
      result.statusCodes[statusCode] = (result.statusCodes[statusCode] || 0) + 1;

      result.errors.push({
        timestamp: new Date(),
        message: error.message || 'Unknown error',
      });
    }
  }

  /**
   * Calculate statistics from response times
   */
  private calculateStatistics(result: LoadTestResult, responseTimes: number[]): void {
    if (responseTimes.length === 0) return;

    const sorted = [...responseTimes].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    result.averageResponseTime = sum / sorted.length;
    result.p50 = sorted[Math.floor(sorted.length * 0.5)];
    result.p95 = sorted[Math.floor(sorted.length * 0.95)];
    result.p99 = sorted[Math.floor(sorted.length * 0.99)];
  }

  /**
   * Get active tests
   */
  getActiveTests(): LoadTestResult[] {
    return Array.from(this.activeTests.values());
  }

  /**
   * Get test history
   */
  getTestHistory(limit: number = 50): LoadTestResult[] {
    return this.testHistory.slice(-limit).reverse();
  }

  /**
   * Get test by ID
   */
  getTest(testId: string): LoadTestResult | undefined {
    return this.testHistory.find((t) => t.testId === testId);
  }

  /**
   * Run benchmark comparison
   */
  async runBenchmark(
    configs: LoadTestConfig[],
    iterations: number = 3,
  ): Promise<Array<{ config: LoadTestConfig; averageResult: LoadTestResult }>> {
    const results: Array<{ config: LoadTestConfig; averageResult: LoadTestResult }> = [];

    for (const config of configs) {
      const iterationResults: LoadTestResult[] = [];

      for (let i = 0; i < iterations; i++) {
        this.logger.log(`Running benchmark iteration ${i + 1}/${iterations} for ${config.url}`);
        const result = await this.runLoadTest(config);
        iterationResults.push(result);
        await this.sleep(2000); // Wait between iterations
      }

      // Calculate average
      const averageResult = this.calculateAverageResult(iterationResults);
      results.push({ config, averageResult });
    }

    return results;
  }

  /**
   * Calculate average result from multiple test runs
   */
  private calculateAverageResult(results: LoadTestResult[]): LoadTestResult {
    if (results.length === 0) {
      throw new Error('No results to average');
    }

    const avg = {
      ...results[0],
      testId: `benchmark_${Date.now()}`,
      averageResponseTime:
        results.reduce((sum, r) => sum + r.averageResponseTime, 0) / results.length,
      p50: results.reduce((sum, r) => sum + r.p50, 0) / results.length,
      p95: results.reduce((sum, r) => sum + r.p95, 0) / results.length,
      p99: results.reduce((sum, r) => sum + r.p99, 0) / results.length,
      requestsPerSecond: results.reduce((sum, r) => sum + r.requestsPerSecond, 0) / results.length,
      errorRate: results.reduce((sum, r) => sum + r.errorRate, 0) / results.length,
    };

    return avg as LoadTestResult;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
