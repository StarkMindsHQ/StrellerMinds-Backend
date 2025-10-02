#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class PerformanceBaseline {
  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    this.results = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      endpoints: {},
      system: {},
      database: {},
      summary: {},
    };
  }

  async run() {
    console.log('🚀 Starting Performance Baseline Collection...');
    console.log(`Target: ${this.baseUrl}`);

    try {
      await this.collectSystemBaseline();
      await this.collectEndpointBaselines();
      await this.collectDatabaseBaselines();
      await this.generateSummary();
      await this.saveResults();

      console.log('✅ Performance baseline collection completed!');
      this.printSummary();
    } catch (error) {
      console.error('❌ Error collecting baseline:', error.message);
      process.exit(1);
    }
  }

  async collectSystemBaseline() {
    console.log('📊 Collecting system baseline...');

    try {
      const healthResponse = await axios.get(`${this.baseUrl}/health`);
      this.results.system = {
        health: healthResponse.data,
        responseTime: healthResponse.headers['x-response-time'] || 'N/A',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn('⚠️  Could not collect system baseline:', error.message);
    }
  }

  async collectEndpointBaselines() {
    console.log('🎯 Collecting endpoint baselines...');

    const endpoints = [
      { name: 'health', method: 'GET', path: '/health' },
      { name: 'courses_list', method: 'GET', path: '/courses?page=1&limit=20' },
      { name: 'courses_categories', method: 'GET', path: '/courses/categories' },
      { name: 'courses_search', method: 'GET', path: '/courses/search?q=blockchain' },
      {
        name: 'auth_register',
        method: 'POST',
        path: '/auth/register',
        data: {
          firstName: 'Baseline',
          lastName: 'Test',
          email: `baseline-${Date.now()}@test.com`,
          username: `baseline-${Date.now()}`,
          password: 'BaselineTest123!',
        },
      },
    ];

    for (const endpoint of endpoints) {
      await this.measureEndpoint(endpoint);
    }
  }

  async measureEndpoint(endpoint) {
    console.log(`  📈 Measuring ${endpoint.name}...`);

    const measurements = [];
    const iterations = 10;

    for (let i = 0; i < iterations; i++) {
      try {
        const startTime = process.hrtime.bigint();

        let response;
        if (endpoint.method === 'GET') {
          response = await axios.get(`${this.baseUrl}${endpoint.path}`);
        } else if (endpoint.method === 'POST') {
          response = await axios.post(`${this.baseUrl}${endpoint.path}`, endpoint.data);
        }

        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        measurements.push({
          duration,
          statusCode: response.status,
          responseSize: JSON.stringify(response.data).length,
        });

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        measurements.push({
          duration: null,
          statusCode: error.response?.status || 0,
          error: error.message,
        });
      }
    }

    // Calculate statistics
    const validMeasurements = measurements.filter((m) => m.duration !== null);
    const durations = validMeasurements.map((m) => m.duration);

    this.results.endpoints[endpoint.name] = {
      method: endpoint.method,
      path: endpoint.path,
      measurements: measurements.length,
      successRate: (validMeasurements.length / measurements.length) * 100,
      responseTime: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        p95: this.percentile(durations, 95),
        p99: this.percentile(durations, 99),
      },
      throughput: validMeasurements.length / (iterations * 0.1), // requests per second
      errors: measurements.filter((m) => m.error).length,
    };
  }

  async collectDatabaseBaselines() {
    console.log('🗄️  Collecting database baselines...');

    try {
      // Try to get database metrics if available
      const metricsResponse = await axios.get(`${this.baseUrl}/metrics`);

      // Extract database-related metrics
      this.results.database = {
        connectionPool: 'Available via metrics endpoint',
        queryPerformance: 'Monitored via application logs',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn('⚠️  Could not collect database baseline:', error.message);
      this.results.database = {
        status: 'Metrics endpoint not available',
        note: 'Database performance should be monitored via application logs',
      };
    }
  }

  generateSummary() {
    console.log('📋 Generating summary...');

    const endpointNames = Object.keys(this.results.endpoints);
    const avgResponseTimes = endpointNames.map(
      (name) => this.results.endpoints[name].responseTime?.avg || 0,
    );

    this.results.summary = {
      totalEndpoints: endpointNames.length,
      avgResponseTime: avgResponseTimes.reduce((a, b) => a + b, 0) / avgResponseTimes.length,
      slowestEndpoint: endpointNames.reduce((slowest, current) => {
        const currentAvg = this.results.endpoints[current].responseTime?.avg || 0;
        const slowestAvg = this.results.endpoints[slowest]?.responseTime?.avg || 0;
        return currentAvg > slowestAvg ? current : slowest;
      }),
      fastestEndpoint: endpointNames.reduce((fastest, current) => {
        const currentAvg = this.results.endpoints[current].responseTime?.avg || Infinity;
        const fastestAvg = this.results.endpoints[fastest]?.responseTime?.avg || Infinity;
        return currentAvg < fastestAvg ? current : fastest;
      }),
      overallSuccessRate:
        endpointNames.reduce(
          (total, name) => total + (this.results.endpoints[name].successRate || 0),
          0,
        ) / endpointNames.length,
    };
  }

  async saveResults() {
    const resultsDir = path.join(process.cwd(), 'test', 'performance', 'baselines');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filename = `baseline-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(resultsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    console.log(`💾 Results saved to: ${filepath}`);
  }

  printSummary() {
    console.log('\n📊 PERFORMANCE BASELINE SUMMARY');
    console.log('================================');
    console.log(`Overall Success Rate: ${this.results.summary.overallSuccessRate.toFixed(2)}%`);
    console.log(`Average Response Time: ${this.results.summary.avgResponseTime.toFixed(2)}ms`);
    console.log(`Fastest Endpoint: ${this.results.summary.fastestEndpoint}`);
    console.log(`Slowest Endpoint: ${this.results.summary.slowestEndpoint}`);
    console.log('\nEndpoint Details:');

    Object.entries(this.results.endpoints).forEach(([name, data]) => {
      if (data.responseTime) {
        console.log(
          `  ${name}: ${data.responseTime.avg.toFixed(2)}ms avg (${data.successRate.toFixed(1)}% success)`,
        );
      }
    });
  }

  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

// Run if called directly
if (require.main === module) {
  const baseline = new PerformanceBaseline();
  baseline.run();
}

module.exports = PerformanceBaseline;
