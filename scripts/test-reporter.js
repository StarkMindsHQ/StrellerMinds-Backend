#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TestReporter {
  constructor() {
    this.reportDir = path.join(process.cwd(), 'test-reports');
    this.coverageDir = path.join(process.cwd(), 'coverage');
    this.timestamp = new Date().toISOString();

    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async generateComprehensiveReport() {
    console.log('🔍 Generating comprehensive test report...');

    const report = {
      timestamp: this.timestamp,
      summary: await this.generateSummary(),
      coverage: await this.parseCoverageReport(),
      unitTests: await this.parseUnitTestResults(),
      integrationTests: await this.parseIntegrationTestResults(),
      e2eTests: await this.parseE2ETestResults(),
      performance: await this.parsePerformanceResults(),
      accessibility: await this.parseAccessibilityResults(),
      quality: await this.generateQualityMetrics(),
      trends: await this.generateTrends(),
      recommendations: await this.generateRecommendations(),
    };

    await this.saveReport(report);
    await this.generateHTMLReport(report);
    await this.generateMarkdownReport(report);

    console.log('✅ Test report generated successfully!');
    console.log(`📊 Report available at: ${path.join(this.reportDir, 'index.html')}`);

    return report;
  }

  async generateSummary() {
    const summary = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0,
      coverage: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
      status: 'unknown',
    };

    try {
      // Parse Jest results
      const jestResults = await this.parseJestResults();
      if (jestResults) {
        summary.totalTests += jestResults.numTotalTests;
        summary.passedTests += jestResults.numPassedTests;
        summary.failedTests += jestResults.numFailedTests;
        summary.skippedTests += jestResults.numPendingTests;
        summary.duration += jestResults.testResults.reduce(
          (acc, result) => acc + result.perfStats.end - result.perfStats.start,
          0,
        );
      }

      // Parse coverage
      const coverage = await this.parseCoverageReport();
      if (coverage) {
        summary.coverage = coverage.total;
      }

      // Determine overall status
      summary.status = summary.failedTests === 0 ? 'passed' : 'failed';
    } catch (error) {
      console.warn('Warning: Could not parse test results:', error.message);
    }

    return summary;
  }

  async parseJestResults() {
    const resultsPath = path.join(this.coverageDir, 'test-results.json');

    if (!fs.existsSync(resultsPath)) {
      return null;
    }

    try {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      return results;
    } catch (error) {
      console.warn('Could not parse Jest results:', error.message);
      return null;
    }
  }

  async parseCoverageReport() {
    const coveragePath = path.join(this.coverageDir, 'coverage-summary.json');

    if (!fs.existsSync(coveragePath)) {
      return null;
    }

    try {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      return coverage;
    } catch (error) {
      console.warn('Could not parse coverage report:', error.message);
      return null;
    }
  }

  async parseUnitTestResults() {
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      duration: 0,
      suites: [],
    };

    try {
      const jestResults = await this.parseJestResults();
      if (jestResults) {
        jestResults.testResults.forEach((testFile) => {
          if (testFile.name.includes('/unit/') || testFile.name.includes('.spec.ts')) {
            results.total += testFile.numPassingTests + testFile.numFailingTests;
            results.passed += testFile.numPassingTests;
            results.failed += testFile.numFailingTests;
            results.duration += testFile.perfStats.end - testFile.perfStats.start;

            results.suites.push({
              name: path.basename(testFile.name),
              tests: testFile.numPassingTests + testFile.numFailingTests,
              passed: testFile.numPassingTests,
              failed: testFile.numFailingTests,
              duration: testFile.perfStats.end - testFile.perfStats.start,
            });
          }
        });
      }
    } catch (error) {
      console.warn('Could not parse unit test results:', error.message);
    }

    return results;
  }

  async parseIntegrationTestResults() {
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      duration: 0,
      suites: [],
    };

    try {
      const jestResults = await this.parseJestResults();
      if (jestResults) {
        jestResults.testResults.forEach((testFile) => {
          if (testFile.name.includes('/integration/')) {
            results.total += testFile.numPassingTests + testFile.numFailingTests;
            results.passed += testFile.numPassingTests;
            results.failed += testFile.numFailingTests;
            results.duration += testFile.perfStats.end - testFile.perfStats.start;

            results.suites.push({
              name: path.basename(testFile.name),
              tests: testFile.numPassingTests + testFile.numFailingTests,
              passed: testFile.numPassingTests,
              failed: testFile.numFailingTests,
              duration: testFile.perfStats.end - testFile.perfStats.start,
            });
          }
        });
      }
    } catch (error) {
      console.warn('Could not parse integration test results:', error.message);
    }

    return results;
  }

  async parseE2ETestResults() {
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      duration: 0,
      suites: [],
    };

    try {
      // Parse Cypress results if available
      const cypressResultsPath = path.join(this.reportDir, 'cypress-results.json');
      if (fs.existsSync(cypressResultsPath)) {
        const cypressResults = JSON.parse(fs.readFileSync(cypressResultsPath, 'utf8'));

        cypressResults.runs.forEach((run) => {
          run.tests.forEach((test) => {
            results.total++;
            if (test.state === 'passed') {
              results.passed++;
            } else if (test.state === 'failed') {
              results.failed++;
            }
            results.duration += test.duration || 0;
          });
        });
      }
    } catch (error) {
      console.warn('Could not parse E2E test results:', error.message);
    }

    return results;
  }

  async parsePerformanceResults() {
    const results = {
      loadTime: {
        average: 0,
        p95: 0,
        max: 0,
      },
      throughput: {
        requestsPerSecond: 0,
        averageResponseTime: 0,
      },
      errors: {
        total: 0,
        rate: 0,
      },
    };

    try {
      // Parse Artillery results if available
      const artilleryResultsPath = path.join(this.reportDir, 'artillery-results.json');
      if (fs.existsSync(artilleryResultsPath)) {
        const artilleryResults = JSON.parse(fs.readFileSync(artilleryResultsPath, 'utf8'));

        if (artilleryResults.aggregate) {
          results.loadTime.average = artilleryResults.aggregate.latency?.mean || 0;
          results.loadTime.p95 = artilleryResults.aggregate.latency?.p95 || 0;
          results.loadTime.max = artilleryResults.aggregate.latency?.max || 0;
          results.throughput.requestsPerSecond = artilleryResults.aggregate.rps?.mean || 0;
          results.errors.total = artilleryResults.aggregate.errors || 0;
          results.errors.rate =
            (results.errors.total / (artilleryResults.aggregate.requestsCompleted || 1)) * 100;
        }
      }
    } catch (error) {
      console.warn('Could not parse performance results:', error.message);
    }

    return results;
  }

  async parseAccessibilityResults() {
    const results = {
      violations: 0,
      passes: 0,
      incomplete: 0,
      inapplicable: 0,
      score: 100,
    };

    try {
      // Parse accessibility results if available
      const a11yResultsPath = path.join(this.reportDir, 'accessibility-results.json');
      if (fs.existsSync(a11yResultsPath)) {
        const a11yResults = JSON.parse(fs.readFileSync(a11yResultsPath, 'utf8'));

        results.violations = a11yResults.violations?.length || 0;
        results.passes = a11yResults.passes?.length || 0;
        results.incomplete = a11yResults.incomplete?.length || 0;
        results.inapplicable = a11yResults.inapplicable?.length || 0;

        // Calculate score (100 - percentage of violations)
        const total = results.violations + results.passes;
        results.score = total > 0 ? Math.round(((total - results.violations) / total) * 100) : 100;
      }
    } catch (error) {
      console.warn('Could not parse accessibility results:', error.message);
    }

    return results;
  }

  async generateQualityMetrics() {
    const metrics = {
      codeQuality: {
        complexity: 'unknown',
        maintainability: 'unknown',
        reliability: 'unknown',
      },
      testQuality: {
        coverage: 0,
        testRatio: 0,
        assertionDensity: 0,
      },
      performance: {
        grade: 'unknown',
        score: 0,
      },
    };

    try {
      const coverage = await this.parseCoverageReport();
      if (coverage && coverage.total) {
        metrics.testQuality.coverage = coverage.total.lines.pct;

        // Calculate test quality grade
        if (metrics.testQuality.coverage >= 90) {
          metrics.codeQuality.reliability = 'excellent';
        } else if (metrics.testQuality.coverage >= 80) {
          metrics.codeQuality.reliability = 'good';
        } else if (metrics.testQuality.coverage >= 70) {
          metrics.codeQuality.reliability = 'fair';
        } else {
          metrics.codeQuality.reliability = 'poor';
        }
      }

      const performance = await this.parsePerformanceResults();
      if (performance.loadTime.average > 0) {
        if (performance.loadTime.average < 1000) {
          metrics.performance.grade = 'excellent';
          metrics.performance.score = 95;
        } else if (performance.loadTime.average < 2000) {
          metrics.performance.grade = 'good';
          metrics.performance.score = 85;
        } else if (performance.loadTime.average < 3000) {
          metrics.performance.grade = 'fair';
          metrics.performance.score = 75;
        } else {
          metrics.performance.grade = 'poor';
          metrics.performance.score = 60;
        }
      }
    } catch (error) {
      console.warn('Could not generate quality metrics:', error.message);
    }

    return metrics;
  }

  async generateTrends() {
    const trends = {
      coverage: [],
      performance: [],
      testCount: [],
    };

    try {
      // Load historical data if available
      const trendsPath = path.join(this.reportDir, 'trends.json');
      if (fs.existsSync(trendsPath)) {
        const historicalTrends = JSON.parse(fs.readFileSync(trendsPath, 'utf8'));
        trends.coverage = historicalTrends.coverage || [];
        trends.performance = historicalTrends.performance || [];
        trends.testCount = historicalTrends.testCount || [];
      }

      // Add current data point
      const summary = await this.generateSummary();
      const performance = await this.parsePerformanceResults();

      const dataPoint = {
        timestamp: this.timestamp,
        coverage: summary.coverage.lines,
        performance: performance.loadTime.average,
        testCount: summary.totalTests,
      };

      trends.coverage.push(dataPoint);
      trends.performance.push(dataPoint);
      trends.testCount.push(dataPoint);

      // Keep only last 30 data points
      trends.coverage = trends.coverage.slice(-30);
      trends.performance = trends.performance.slice(-30);
      trends.testCount = trends.testCount.slice(-30);

      // Save updated trends
      fs.writeFileSync(trendsPath, JSON.stringify(trends, null, 2));
    } catch (error) {
      console.warn('Could not generate trends:', error.message);
    }

    return trends;
  }

  async generateRecommendations() {
    const recommendations = [];

    try {
      const summary = await this.generateSummary();
      const coverage = await this.parseCoverageReport();
      const performance = await this.parsePerformanceResults();
      const accessibility = await this.parseAccessibilityResults();

      // Coverage recommendations
      if (summary.coverage.lines < 80) {
        recommendations.push({
          type: 'coverage',
          priority: 'high',
          title: 'Improve Test Coverage',
          description: `Current coverage is ${summary.coverage.lines}%. Aim for 80%+ coverage.`,
          action: 'Add unit tests for uncovered code paths',
        });
      }

      // Performance recommendations
      if (performance.loadTime.average > 2000) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          title: 'Optimize Performance',
          description: `Average load time is ${performance.loadTime.average}ms. Target < 2000ms.`,
          action: 'Profile and optimize slow endpoints',
        });
      }

      // Accessibility recommendations
      if (accessibility.violations > 0) {
        recommendations.push({
          type: 'accessibility',
          priority: 'high',
          title: 'Fix Accessibility Issues',
          description: `Found ${accessibility.violations} accessibility violations.`,
          action: 'Review and fix accessibility issues',
        });
      }

      // Test stability recommendations
      if (summary.failedTests > 0) {
        recommendations.push({
          type: 'stability',
          priority: 'high',
          title: 'Fix Failing Tests',
          description: `${summary.failedTests} tests are currently failing.`,
          action: 'Investigate and fix failing tests',
        });
      }
    } catch (error) {
      console.warn('Could not generate recommendations:', error.message);
    }

    return recommendations;
  }

  async saveReport(report) {
    const reportPath = path.join(this.reportDir, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  async generateHTMLReport(report) {
    const htmlTemplate = this.getHTMLTemplate();
    const html = htmlTemplate.replace('{{REPORT_DATA}}', JSON.stringify(report, null, 2));

    const htmlPath = path.join(this.reportDir, 'index.html');
    fs.writeFileSync(htmlPath, html);
  }

  async generateMarkdownReport(report) {
    const markdown = this.generateMarkdownContent(report);
    const markdownPath = path.join(this.reportDir, 'README.md');
    fs.writeFileSync(markdownPath, markdown);
  }

  getHTMLTemplate() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StrellerMinds Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; color: #007bff; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .status-passed { color: #28a745; }
        .status-failed { color: #dc3545; }
        .status-warning { color: #ffc107; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; }
        .recommendation { margin-bottom: 15px; padding: 10px; border-left: 4px solid #007bff; background: white; }
        .priority-high { border-left-color: #dc3545; }
        .priority-medium { border-left-color: #ffc107; }
        .priority-low { border-left-color: #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>StrellerMinds Test Report</h1>
            <p>Generated on: <span id="timestamp"></span></p>
        </div>
        
        <div id="report-content">
            <!-- Report content will be injected here -->
        </div>
    </div>
    
    <script>
        const reportData = {{REPORT_DATA}};
        
        // Render report content
        function renderReport() {
            const content = document.getElementById('report-content');
            content.innerHTML = generateReportHTML(reportData);
            document.getElementById('timestamp').textContent = new Date(reportData.timestamp).toLocaleString();
        }
        
        function generateReportHTML(data) {
            return \`
                <div class="summary">
                    <div class="metric">
                        <h3>Total Tests</h3>
                        <div class="value">\${data.summary.totalTests}</div>
                    </div>
                    <div class="metric">
                        <h3>Passed</h3>
                        <div class="value status-passed">\${data.summary.passedTests}</div>
                    </div>
                    <div class="metric">
                        <h3>Failed</h3>
                        <div class="value status-failed">\${data.summary.failedTests}</div>
                    </div>
                    <div class="metric">
                        <h3>Coverage</h3>
                        <div class="value">\${data.summary.coverage.lines}%</div>
                    </div>
                </div>
                
                <div class="section">
                    <h2>Test Results</h2>
                    <p>Unit Tests: \${data.unitTests.passed}/\${data.unitTests.total} passed</p>
                    <p>Integration Tests: \${data.integrationTests.passed}/\${data.integrationTests.total} passed</p>
                    <p>E2E Tests: \${data.e2eTests.passed}/\${data.e2eTests.total} passed</p>
                </div>
                
                <div class="section">
                    <h2>Performance</h2>
                    <p>Average Load Time: \${data.performance.loadTime.average}ms</p>
                    <p>Throughput: \${data.performance.throughput.requestsPerSecond} req/s</p>
                    <p>Error Rate: \${data.performance.errors.rate}%</p>
                </div>
                
                <div class="section">
                    <h2>Recommendations</h2>
                    <div class="recommendations">
                        \${data.recommendations.map(rec => \`
                            <div class="recommendation priority-\${rec.priority}">
                                <h4>\${rec.title}</h4>
                                <p>\${rec.description}</p>
                                <strong>Action:</strong> \${rec.action}
                            </div>
                        \`).join('')}
                    </div>
                </div>
            \`;
        }
        
        renderReport();
    </script>
</body>
</html>
    `;
  }

  generateMarkdownContent(report) {
    return `# StrellerMinds Test Report

Generated on: ${new Date(report.timestamp).toLocaleString()}

## Summary

- **Total Tests**: ${report.summary.totalTests}
- **Passed**: ${report.summary.passedTests}
- **Failed**: ${report.summary.failedTests}
- **Coverage**: ${report.summary.coverage.lines}%
- **Status**: ${report.summary.status}

## Test Results

### Unit Tests
- Total: ${report.unitTests.total}
- Passed: ${report.unitTests.passed}
- Failed: ${report.unitTests.failed}
- Duration: ${report.unitTests.duration}ms

### Integration Tests
- Total: ${report.integrationTests.total}
- Passed: ${report.integrationTests.passed}
- Failed: ${report.integrationTests.failed}
- Duration: ${report.integrationTests.duration}ms

### E2E Tests
- Total: ${report.e2eTests.total}
- Passed: ${report.e2eTests.passed}
- Failed: ${report.e2eTests.failed}
- Duration: ${report.e2eTests.duration}ms

## Performance

- **Average Load Time**: ${report.performance.loadTime.average}ms
- **95th Percentile**: ${report.performance.loadTime.p95}ms
- **Throughput**: ${report.performance.throughput.requestsPerSecond} req/s
- **Error Rate**: ${report.performance.errors.rate}%

## Accessibility

- **Violations**: ${report.accessibility.violations}
- **Score**: ${report.accessibility.score}%

## Quality Metrics

- **Code Quality**: ${report.quality.codeQuality.reliability}
- **Test Coverage**: ${report.quality.testQuality.coverage}%
- **Performance Grade**: ${report.quality.performance.grade}

## Recommendations

${report.recommendations
  .map(
    (rec) => `
### ${rec.title} (${rec.priority} priority)

${rec.description}

**Action**: ${rec.action}
`,
  )
  .join('\n')}

---

*Report generated by StrellerMinds Test Reporter*
`;
  }
}

// CLI interface
if (require.main === module) {
  const reporter = new TestReporter();

  reporter
    .generateComprehensiveReport()
    .then(() => {
      console.log('✅ Test report generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test report generation failed:', error);
      process.exit(1);
    });
}

module.exports = TestReporter;
