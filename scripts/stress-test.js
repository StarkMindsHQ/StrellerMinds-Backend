#!/usr/bin/env node

const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

class StressTestRunner {
  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    this.results = [];
  }

  async run() {
    console.log('🔥 Starting Stress Test Suite...');
    console.log(`Target: ${this.baseUrl}`);

    const testSuites = [
      {
        name: 'Health Check Stress',
        url: `${this.baseUrl}/health`,
        connections: 50,
        duration: 30,
      },
      {
        name: 'Course List Stress',
        url: `${this.baseUrl}/courses?page=1&limit=20`,
        connections: 100,
        duration: 60,
      },
      {
        name: 'Search Stress',
        url: `${this.baseUrl}/courses/search?q=blockchain`,
        connections: 75,
        duration: 45,
      },
      {
        name: 'High Concurrency Test',
        url: `${this.baseUrl}/health`,
        connections: 200,
        duration: 30,
      },
    ];

    for (const suite of testSuites) {
      await this.runStressTest(suite);
    }

    await this.generateReport();
    console.log('✅ Stress testing completed!');
  }

  async runStressTest(config) {
    console.log(`\n🎯 Running: ${config.name}`);
    console.log(`   URL: ${config.url}`);
    console.log(`   Connections: ${config.connections}`);
    console.log(`   Duration: ${config.duration}s`);

    return new Promise((resolve, reject) => {
      const instance = autocannon(
        {
          url: config.url,
          connections: config.connections,
          duration: config.duration,
          pipelining: 1,
          headers: {
            'User-Agent': 'StrellerMinds-StressTest/1.0',
          },
        },
        (err, result) => {
          if (err) {
            console.error(`❌ Error in ${config.name}:`, err);
            reject(err);
            return;
          }

          const processedResult = {
            testName: config.name,
            config: config,
            timestamp: new Date().toISOString(),
            summary: {
              duration: result.duration,
              requests: result.requests,
              bytes: result.bytes,
              errors: result.errors,
              timeouts: result.timeouts,
              mismatches: result.mismatches,
              non2xx: result.non2xx,
              resets: result.resets,
              throughput: result.throughput,
              latency: result.latency,
            },
            detailed: result,
          };

          this.results.push(processedResult);
          this.printTestResult(processedResult);
          resolve(processedResult);
        },
      );

      // Handle progress updates
      instance.on('response', (client, statusCode, resBytes, responseTime) => {
        // Optional: Log individual responses for debugging
      });

      instance.on('reqError', (error) => {
        console.warn(`⚠️  Request error: ${error.message}`);
      });
    });
  }

  printTestResult(result) {
    const { summary } = result;

    console.log(`\n📊 Results for ${result.testName}:`);
    console.log(`   Duration: ${summary.duration}s`);
    console.log(`   Requests: ${summary.requests.total} (${summary.requests.average}/s)`);
    console.log(`   Throughput: ${(summary.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
    console.log(`   Latency:`);
    console.log(`     Average: ${summary.latency.average.toFixed(2)}ms`);
    console.log(`     P50: ${summary.latency.p50}ms`);
    console.log(`     P95: ${summary.latency.p95}ms`);
    console.log(`     P99: ${summary.latency.p99}ms`);
    console.log(`   Errors: ${summary.errors}`);
    console.log(`   Timeouts: ${summary.timeouts}`);
    console.log(`   Non-2xx: ${summary.non2xx}`);

    // Performance assessment
    const avgLatency = summary.latency.average;
    const errorRate = (summary.errors / summary.requests.total) * 100;

    let assessment = '✅ GOOD';
    if (avgLatency > 1000 || errorRate > 1) {
      assessment = '⚠️  CONCERNING';
    }
    if (avgLatency > 2000 || errorRate > 5) {
      assessment = '❌ POOR';
    }

    console.log(`   Assessment: ${assessment}`);
  }

  async generateReport() {
    console.log('\n📋 Generating comprehensive stress test report...');

    const reportData = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      summary: this.generateSummary(),
      results: this.results,
      recommendations: this.generateRecommendations(),
    };

    // Save detailed report
    const reportsDir = path.join(process.cwd(), 'test', 'performance', 'stress-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `stress-test-${new Date().toISOString().split('T')[0]}-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(reportData, null, 2));
    console.log(`💾 Detailed report saved to: ${filepath}`);

    // Print summary
    this.printSummaryReport(reportData.summary);
  }

  generateSummary() {
    const totalRequests = this.results.reduce((sum, r) => sum + r.summary.requests.total, 0);
    const totalErrors = this.results.reduce((sum, r) => sum + r.summary.errors, 0);
    const avgThroughput =
      this.results.reduce((sum, r) => sum + r.summary.throughput.average, 0) / this.results.length;
    const avgLatency =
      this.results.reduce((sum, r) => sum + r.summary.latency.average, 0) / this.results.length;

    const worstPerforming = this.results.reduce((worst, current) =>
      current.summary.latency.average > worst.summary.latency.average ? current : worst,
    );

    const bestPerforming = this.results.reduce((best, current) =>
      current.summary.latency.average < best.summary.latency.average ? current : best,
    );

    return {
      totalTests: this.results.length,
      totalRequests,
      totalErrors,
      overallErrorRate: (totalErrors / totalRequests) * 100,
      avgThroughput: avgThroughput / 1024 / 1024, // MB/s
      avgLatency,
      worstPerforming: worstPerforming.testName,
      bestPerforming: bestPerforming.testName,
    };
  }

  generateRecommendations() {
    const recommendations = [];

    this.results.forEach((result) => {
      const { summary } = result;
      const errorRate = (summary.errors / summary.requests.total) * 100;

      if (summary.latency.average > 1000) {
        recommendations.push({
          test: result.testName,
          type: 'PERFORMANCE',
          message: `High average latency (${summary.latency.average.toFixed(2)}ms). Consider optimizing endpoint or adding caching.`,
        });
      }

      if (errorRate > 1) {
        recommendations.push({
          test: result.testName,
          type: 'RELIABILITY',
          message: `Error rate is ${errorRate.toFixed(2)}%. Investigate error causes and improve error handling.`,
        });
      }

      if (summary.timeouts > 0) {
        recommendations.push({
          test: result.testName,
          type: 'TIMEOUT',
          message: `${summary.timeouts} timeouts detected. Consider increasing timeout values or optimizing response times.`,
        });
      }
    });

    return recommendations;
  }

  printSummaryReport(summary) {
    console.log('\n🎯 STRESS TEST SUMMARY REPORT');
    console.log('==============================');
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Total Requests: ${summary.totalRequests.toLocaleString()}`);
    console.log(`Total Errors: ${summary.totalErrors.toLocaleString()}`);
    console.log(`Overall Error Rate: ${summary.overallErrorRate.toFixed(2)}%`);
    console.log(`Average Throughput: ${summary.avgThroughput.toFixed(2)} MB/s`);
    console.log(`Average Latency: ${summary.avgLatency.toFixed(2)}ms`);
    console.log(`Best Performing: ${summary.bestPerforming}`);
    console.log(`Worst Performing: ${summary.worstPerforming}`);
  }
}

// Run if called directly
if (require.main === module) {
  const stressTest = new StressTestRunner();
  stressTest.run().catch(console.error);
}

module.exports = StressTestRunner;
