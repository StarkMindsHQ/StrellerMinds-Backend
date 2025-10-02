#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');

class PerformanceReportGenerator {
  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    this.reportData = {
      timestamp: new Date().toISOString(),
      summary: {},
      loadTests: [],
      scalabilityTests: [],
      baselines: [],
      monitoring: {},
      trends: {},
      recommendations: [],
    };
  }

  async generateReport() {
    console.log('📊 Generating Comprehensive Performance Report...');
    console.log(`Target: ${this.baseUrl}`);

    try {
      // Collect all performance data
      await this.collectCurrentMetrics();
      await this.collectLoadTestResults();
      await this.collectScalabilityTestResults();
      await this.collectBaselineData();
      await this.collectMonitoringData();
      await this.analyzeTrends();
      await this.generateRecommendations();

      // Generate reports in multiple formats
      await this.generateHTMLReport();
      await this.generateJSONReport();
      await this.generateMarkdownReport();

      console.log('✅ Performance report generation completed!');
      this.printSummary();
    } catch (error) {
      console.error('❌ Error generating performance report:', error.message);
      process.exit(1);
    }
  }

  async collectCurrentMetrics() {
    console.log('📈 Collecting current performance metrics...');

    try {
      // Get system performance summary
      const response = await axios.get(`${this.baseUrl}/performance/system/summary`, {
        timeout: 10000,
        headers: { Authorization: `Bearer ${process.env.API_TOKEN || ''}` },
      });

      this.reportData.summary = response.data;
    } catch (error) {
      console.warn('⚠️  Could not collect current metrics:', error.message);
      this.reportData.summary = { error: 'Metrics not available' };
    }
  }

  async collectLoadTestResults() {
    console.log('🔥 Collecting load test results...');

    const loadTestDir = path.join(process.cwd(), 'test', 'performance', 'load-reports');

    if (fs.existsSync(loadTestDir)) {
      const files = fs
        .readdirSync(loadTestDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .slice(-5); // Get last 5 load test results

      files.forEach((file) => {
        try {
          const filepath = path.join(loadTestDir, file);
          const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
          this.reportData.loadTests.push(data);
        } catch (error) {
          console.warn(`⚠️  Could not load test result from ${file}:`, error.message);
        }
      });
    }

    console.log(`   Found ${this.reportData.loadTests.length} load test results`);
  }

  async collectScalabilityTestResults() {
    console.log('📊 Collecting scalability test results...');

    const scalabilityDir = path.join(process.cwd(), 'test', 'performance', 'scalability-reports');

    if (fs.existsSync(scalabilityDir)) {
      const files = fs
        .readdirSync(scalabilityDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .slice(-3); // Get last 3 scalability test results

      files.forEach((file) => {
        try {
          const filepath = path.join(scalabilityDir, file);
          const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
          this.reportData.scalabilityTests.push(data);
        } catch (error) {
          console.warn(`⚠️  Could not load scalability result from ${file}:`, error.message);
        }
      });
    }

    console.log(`   Found ${this.reportData.scalabilityTests.length} scalability test results`);
  }

  async collectBaselineData() {
    console.log('📋 Collecting baseline data...');

    const baselinesDir = path.join(process.cwd(), 'test', 'performance', 'baselines');

    if (fs.existsSync(baselinesDir)) {
      const files = fs
        .readdirSync(baselinesDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .slice(-3); // Get last 3 baselines

      files.forEach((file) => {
        try {
          const filepath = path.join(baselinesDir, file);
          const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
          this.reportData.baselines.push(data);
        } catch (error) {
          console.warn(`⚠️  Could not load baseline from ${file}:`, error.message);
        }
      });
    }

    console.log(`   Found ${this.reportData.baselines.length} baselines`);
  }

  async collectMonitoringData() {
    console.log('🔍 Collecting monitoring data...');

    const monitoringDir = path.join(process.cwd(), 'test', 'performance', 'monitoring-reports');

    if (fs.existsSync(monitoringDir)) {
      const files = fs
        .readdirSync(monitoringDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .slice(-1); // Get most recent monitoring report

      if (files.length > 0) {
        try {
          const filepath = path.join(monitoringDir, files[0]);
          this.reportData.monitoring = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        } catch (error) {
          console.warn(`⚠️  Could not load monitoring data:`, error.message);
        }
      }
    }
  }

  async analyzeTrends() {
    console.log('📈 Analyzing performance trends...');

    // Analyze load test trends
    if (this.reportData.loadTests.length > 1) {
      this.reportData.trends.loadTests = this.analyzeLoadTestTrends();
    }

    // Analyze scalability trends
    if (this.reportData.scalabilityTests.length > 1) {
      this.reportData.trends.scalability = this.analyzeScalabilityTrends();
    }

    // Analyze baseline trends
    if (this.reportData.baselines.length > 1) {
      this.reportData.trends.baselines = this.analyzeBaselineTrends();
    }
  }

  analyzeLoadTestTrends() {
    const tests = this.reportData.loadTests.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const latest = tests[tests.length - 1];
    const previous = tests[tests.length - 2];

    if (!latest.summary || !previous.summary) return null;

    const responseTimeChange =
      ((latest.summary.avgResponseTime - previous.summary.avgResponseTime) /
        previous.summary.avgResponseTime) *
      100;
    const throughputChange =
      ((latest.summary.avgThroughput - previous.summary.avgThroughput) /
        previous.summary.avgThroughput) *
      100;
    const errorRateChange = latest.summary.overallErrorRate - previous.summary.overallErrorRate;

    return {
      responseTime: {
        change: responseTimeChange,
        trend:
          responseTimeChange > 5 ? 'DEGRADING' : responseTimeChange < -5 ? 'IMPROVING' : 'STABLE',
      },
      throughput: {
        change: throughputChange,
        trend: throughputChange > 5 ? 'IMPROVING' : throughputChange < -5 ? 'DEGRADING' : 'STABLE',
      },
      errorRate: {
        change: errorRateChange,
        trend:
          errorRateChange > 0.5 ? 'DEGRADING' : errorRateChange < -0.5 ? 'IMPROVING' : 'STABLE',
      },
    };
  }

  analyzeScalabilityTrends() {
    const tests = this.reportData.scalabilityTests.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const latest = tests[tests.length - 1];
    const previous = tests[tests.length - 2];

    if (!latest.summary || !previous.summary) return null;

    const maxUsersChange = latest.summary.maxConcurrentUsers - previous.summary.maxConcurrentUsers;
    const maxThroughputChange =
      ((latest.summary.maxThroughput - previous.summary.maxThroughput) /
        previous.summary.maxThroughput) *
      100;

    return {
      maxUsers: {
        change: maxUsersChange,
        trend: maxUsersChange > 0 ? 'IMPROVING' : maxUsersChange < 0 ? 'DEGRADING' : 'STABLE',
      },
      maxThroughput: {
        change: maxThroughputChange,
        trend:
          maxThroughputChange > 5 ? 'IMPROVING' : maxThroughputChange < -5 ? 'DEGRADING' : 'STABLE',
      },
      scalabilityGrade: {
        current: latest.summary.scalabilityGrade,
        previous: previous.summary.scalabilityGrade,
        trend: this.compareGrades(
          latest.summary.scalabilityGrade,
          previous.summary.scalabilityGrade,
        ),
      },
    };
  }

  analyzeBaselineTrends() {
    const baselines = this.reportData.baselines.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    if (baselines.length < 2) return null;

    const latest = baselines[baselines.length - 1];
    const previous = baselines[baselines.length - 2];

    // Compare endpoint performance
    const endpointTrends = latest.endpoints
      .map((endpoint) => {
        const prevEndpoint = previous.endpoints.find((e) => e.endpoint === endpoint.endpoint);
        if (!prevEndpoint) return null;

        const responseTimeChange =
          ((endpoint.expectedResponseTime.p95 - prevEndpoint.expectedResponseTime.p95) /
            prevEndpoint.expectedResponseTime.p95) *
          100;

        return {
          endpoint: endpoint.endpoint,
          responseTimeChange,
          trend:
            responseTimeChange > 10
              ? 'DEGRADING'
              : responseTimeChange < -10
                ? 'IMPROVING'
                : 'STABLE',
        };
      })
      .filter(Boolean);

    return { endpoints: endpointTrends };
  }

  async generateRecommendations() {
    console.log('💡 Generating recommendations...');

    const recommendations = [];

    // Based on current performance
    if (this.reportData.summary.recommendations) {
      recommendations.push(
        ...this.reportData.summary.recommendations.map((r) => ({
          category: 'CURRENT_PERFORMANCE',
          priority: 'MEDIUM',
          recommendation: r,
        })),
      );
    }

    // Based on trends
    if (this.reportData.trends.loadTests) {
      const trends = this.reportData.trends.loadTests;

      if (trends.responseTime.trend === 'DEGRADING') {
        recommendations.push({
          category: 'PERFORMANCE_TREND',
          priority: 'HIGH',
          recommendation: `Response time is degrading (${trends.responseTime.change.toFixed(1)}% increase). Investigate performance bottlenecks.`,
        });
      }

      if (trends.errorRate.trend === 'DEGRADING') {
        recommendations.push({
          category: 'RELIABILITY_TREND',
          priority: 'HIGH',
          recommendation: `Error rate is increasing (${trends.errorRate.change.toFixed(2)}% increase). Review error logs and fix issues.`,
        });
      }
    }

    // Based on scalability tests
    if (this.reportData.scalabilityTests.length > 0) {
      const latest = this.reportData.scalabilityTests[this.reportData.scalabilityTests.length - 1];

      if (latest.summary.scalabilityGrade === 'F') {
        recommendations.push({
          category: 'SCALABILITY',
          priority: 'CRITICAL',
          recommendation: 'Scalability grade is F. Immediate performance optimization required.',
        });
      }

      if (latest.summary.breakingPoint) {
        recommendations.push({
          category: 'CAPACITY',
          priority: 'HIGH',
          recommendation: `System breaks at ${latest.summary.breakingPoint.users} concurrent users. Plan capacity accordingly.`,
        });
      }
    }

    this.reportData.recommendations = recommendations;
  }

  async generateHTMLReport() {
    console.log('🌐 Generating HTML report...');

    const html = this.generateHTMLContent();

    const reportsDir = path.join(process.cwd(), 'test', 'performance', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `performance-report-${new Date().toISOString().split('T')[0]}.html`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, html);
    console.log(`   HTML report saved to: ${filepath}`);
  }

  async generateJSONReport() {
    console.log('📄 Generating JSON report...');

    const reportsDir = path.join(process.cwd(), 'test', 'performance', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(this.reportData, null, 2));
    console.log(`   JSON report saved to: ${filepath}`);
  }

  async generateMarkdownReport() {
    console.log('📝 Generating Markdown report...');

    const markdown = this.generateMarkdownContent();

    const reportsDir = path.join(process.cwd(), 'test', 'performance', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `performance-report-${new Date().toISOString().split('T')[0]}.md`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, markdown);
    console.log(`   Markdown report saved to: ${filepath}`);
  }

  generateHTMLContent() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StrellerMinds Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #007bff; border-bottom: 1px solid #dee2e6; padding-bottom: 10px; }
        .metric-card { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007bff; }
        .metric-value { font-size: 24px; font-weight: bold; color: #28a745; }
        .metric-label { color: #6c757d; font-size: 14px; }
        .trend-up { color: #28a745; }
        .trend-down { color: #dc3545; }
        .trend-stable { color: #ffc107; }
        .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .recommendation.high { border-color: #f5c6cb; background: #f8d7da; }
        .recommendation.critical { border-color: #f5c6cb; background: #f8d7da; color: #721c24; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background-color: #f8f9fa; font-weight: 600; }
        .status-good { color: #28a745; font-weight: bold; }
        .status-warning { color: #ffc107; font-weight: bold; }
        .status-critical { color: #dc3545; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 StrellerMinds Performance Report</h1>
            <p>Generated on ${new Date(this.reportData.timestamp).toLocaleString()}</p>
            <p>Target: ${this.baseUrl}</p>
        </div>

        <div class="section">
            <h2>📊 Executive Summary</h2>
            ${this.generateSummaryHTML()}
        </div>

        <div class="section">
            <h2>📈 Performance Trends</h2>
            ${this.generateTrendsHTML()}
        </div>

        <div class="section">
            <h2>🔥 Load Test Results</h2>
            ${this.generateLoadTestHTML()}
        </div>

        <div class="section">
            <h2>📊 Scalability Analysis</h2>
            ${this.generateScalabilityHTML()}
        </div>

        <div class="section">
            <h2>💡 Recommendations</h2>
            ${this.generateRecommendationsHTML()}
        </div>
    </div>
</body>
</html>`;
  }

  generateSummaryHTML() {
    if (!this.reportData.summary.overallPerformance) {
      return '<p>No current performance data available.</p>';
    }

    const perf = this.reportData.summary.overallPerformance;
    return `
        <div class="metric-card">
            <div class="metric-value">${perf.averageResponseTime?.toFixed(2) || 'N/A'}ms</div>
            <div class="metric-label">Average Response Time</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${perf.throughput?.toFixed(2) || 'N/A'} req/s</div>
            <div class="metric-label">Throughput</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${perf.overallErrorRate?.toFixed(2) || 'N/A'}%</div>
            <div class="metric-label">Error Rate</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${this.reportData.summary.performanceGrade || 'N/A'}</div>
            <div class="metric-label">Performance Grade</div>
        </div>`;
  }

  generateTrendsHTML() {
    if (!this.reportData.trends.loadTests) {
      return '<p>Insufficient data for trend analysis.</p>';
    }

    const trends = this.reportData.trends.loadTests;
    return `
        <table>
            <tr>
                <th>Metric</th>
                <th>Change</th>
                <th>Trend</th>
            </tr>
            <tr>
                <td>Response Time</td>
                <td>${trends.responseTime.change.toFixed(1)}%</td>
                <td class="trend-${trends.responseTime.trend.toLowerCase()}">${trends.responseTime.trend}</td>
            </tr>
            <tr>
                <td>Throughput</td>
                <td>${trends.throughput.change.toFixed(1)}%</td>
                <td class="trend-${trends.throughput.trend.toLowerCase()}">${trends.throughput.trend}</td>
            </tr>
            <tr>
                <td>Error Rate</td>
                <td>${trends.errorRate.change.toFixed(2)}%</td>
                <td class="trend-${trends.errorRate.trend.toLowerCase()}">${trends.errorRate.trend}</td>
            </tr>
        </table>`;
  }

  generateLoadTestHTML() {
    if (this.reportData.loadTests.length === 0) {
      return '<p>No load test results available.</p>';
    }

    const latest = this.reportData.loadTests[this.reportData.loadTests.length - 1];
    return `
        <p><strong>Latest Load Test:</strong> ${new Date(latest.timestamp).toLocaleString()}</p>
        <p><strong>Test Results:</strong> ${latest.summary?.totalTests || 'N/A'} tests completed</p>
        <p><strong>Overall Success Rate:</strong> ${latest.summary?.overallSuccessRate?.toFixed(2) || 'N/A'}%</p>
        <p><strong>Average Response Time:</strong> ${latest.summary?.avgResponseTime?.toFixed(2) || 'N/A'}ms</p>`;
  }

  generateScalabilityHTML() {
    if (this.reportData.scalabilityTests.length === 0) {
      return '<p>No scalability test results available.</p>';
    }

    const latest = this.reportData.scalabilityTests[this.reportData.scalabilityTests.length - 1];
    return `
        <p><strong>Latest Scalability Test:</strong> ${new Date(latest.timestamp).toLocaleString()}</p>
        <p><strong>Max Concurrent Users:</strong> ${latest.summary?.maxConcurrentUsers || 'N/A'}</p>
        <p><strong>Max Throughput:</strong> ${latest.summary?.maxThroughput?.toFixed(2) || 'N/A'} req/s</p>
        <p><strong>Scalability Grade:</strong> ${latest.summary?.scalabilityGrade || 'N/A'}</p>
        ${
          latest.summary?.breakingPoint
            ? `<p><strong>Breaking Point:</strong> ${latest.summary.breakingPoint.users} users</p>`
            : '<p><strong>Breaking Point:</strong> Not reached</p>'
        }`;
  }

  generateRecommendationsHTML() {
    if (this.reportData.recommendations.length === 0) {
      return '<p>No specific recommendations at this time.</p>';
    }

    return this.reportData.recommendations
      .map(
        (rec) =>
          `<div class="recommendation ${rec.priority.toLowerCase()}">
         <strong>${rec.category}:</strong> ${rec.recommendation}
       </div>`,
      )
      .join('');
  }

  generateMarkdownContent() {
    return `# StrellerMinds Performance Report

Generated on: ${new Date(this.reportData.timestamp).toLocaleString()}
Target: ${this.baseUrl}

## Executive Summary

${
  this.reportData.summary.overallPerformance
    ? `
- **Average Response Time:** ${this.reportData.summary.overallPerformance.averageResponseTime?.toFixed(2) || 'N/A'}ms
- **Throughput:** ${this.reportData.summary.overallPerformance.throughput?.toFixed(2) || 'N/A'} req/s
- **Error Rate:** ${this.reportData.summary.overallPerformance.overallErrorRate?.toFixed(2) || 'N/A'}%
- **Performance Grade:** ${this.reportData.summary.performanceGrade || 'N/A'}
`
    : 'No current performance data available.'
}

## Performance Trends

${
  this.reportData.trends.loadTests
    ? `
| Metric | Change | Trend |
|--------|--------|-------|
| Response Time | ${this.reportData.trends.loadTests.responseTime.change.toFixed(1)}% | ${this.reportData.trends.loadTests.responseTime.trend} |
| Throughput | ${this.reportData.trends.loadTests.throughput.change.toFixed(1)}% | ${this.reportData.trends.loadTests.throughput.trend} |
| Error Rate | ${this.reportData.trends.loadTests.errorRate.change.toFixed(2)}% | ${this.reportData.trends.loadTests.errorRate.trend} |
`
    : 'Insufficient data for trend analysis.'
}

## Load Test Results

${
  this.reportData.loadTests.length > 0
    ? `
Latest test completed: ${new Date(this.reportData.loadTests[this.reportData.loadTests.length - 1].timestamp).toLocaleString()}
- Tests completed: ${this.reportData.loadTests[this.reportData.loadTests.length - 1].summary?.totalTests || 'N/A'}
- Success rate: ${this.reportData.loadTests[this.reportData.loadTests.length - 1].summary?.overallSuccessRate?.toFixed(2) || 'N/A'}%
- Average response time: ${this.reportData.loadTests[this.reportData.loadTests.length - 1].summary?.avgResponseTime?.toFixed(2) || 'N/A'}ms
`
    : 'No load test results available.'
}

## Scalability Analysis

${
  this.reportData.scalabilityTests.length > 0
    ? `
Latest test completed: ${new Date(this.reportData.scalabilityTests[this.reportData.scalabilityTests.length - 1].timestamp).toLocaleString()}
- Max concurrent users: ${this.reportData.scalabilityTests[this.reportData.scalabilityTests.length - 1].summary?.maxConcurrentUsers || 'N/A'}
- Max throughput: ${this.reportData.scalabilityTests[this.reportData.scalabilityTests.length - 1].summary?.maxThroughput?.toFixed(2) || 'N/A'} req/s
- Scalability grade: ${this.reportData.scalabilityTests[this.reportData.scalabilityTests.length - 1].summary?.scalabilityGrade || 'N/A'}
- Breaking point: ${
        this.reportData.scalabilityTests[this.reportData.scalabilityTests.length - 1].summary
          ?.breakingPoint
          ? `${this.reportData.scalabilityTests[this.reportData.scalabilityTests.length - 1].summary.breakingPoint.users} users`
          : 'Not reached'
      }
`
    : 'No scalability test results available.'
}

## Recommendations

${
  this.reportData.recommendations.length > 0
    ? this.reportData.recommendations
        .map((rec) => `- **${rec.category}** (${rec.priority}): ${rec.recommendation}`)
        .join('\n')
    : 'No specific recommendations at this time.'
}

---
*Report generated by StrellerMinds Performance Monitoring System*`;
  }

  compareGrades(current, previous) {
    const gradeValues = { A: 5, B: 4, C: 3, D: 2, F: 1 };
    const currentValue = gradeValues[current] || 0;
    const previousValue = gradeValues[previous] || 0;

    if (currentValue > previousValue) return 'IMPROVING';
    if (currentValue < previousValue) return 'DEGRADING';
    return 'STABLE';
  }

  printSummary() {
    console.log('\n📊 PERFORMANCE REPORT SUMMARY');
    console.log('==============================');
    console.log(`Load Tests: ${this.reportData.loadTests.length} results`);
    console.log(`Scalability Tests: ${this.reportData.scalabilityTests.length} results`);
    console.log(`Baselines: ${this.reportData.baselines.length} available`);
    console.log(`Recommendations: ${this.reportData.recommendations.length} generated`);

    if (this.reportData.summary.performanceGrade) {
      console.log(`Current Performance Grade: ${this.reportData.summary.performanceGrade}`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const reportGenerator = new PerformanceReportGenerator();
  reportGenerator.generateReport().catch(console.error);
}

module.exports = PerformanceReportGenerator;
