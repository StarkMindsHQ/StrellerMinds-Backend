/**
 * Performance Regression Testing script for StrellerMinds-Backend.
 * Runs Artillery load test, then parses the JSON report to check for regression.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Performance Thresholds
const THRESHOLDS = {
  median: 200,   // ms
  p95: 500,      // ms
  p99: 1000,     // ms
  errorRate: 1,  // percentage
};

const REPORT_FILE = 'performance-report.json';
const CONFIG_FILE = 'artillery-config.yml';

console.log('--- Performance Regression Check ---');

try {
  // 1. Run Artillery and output JSON report
  console.log(`Running Artillery with config: ${CONFIG_FILE}...`);
  execSync(`npx artillery run --output ${REPORT_FILE} ${CONFIG_FILE}`, { stdio: 'inherit' });

  // 2. Parse the report
  if (!fs.existsSync(REPORT_FILE)) {
    console.error('Error: Performance report file was not created.');
    process.exit(1);
  }

  const rawReport = fs.readFileSync(REPORT_FILE, 'utf8');
  const report = JSON.parse(rawReport);

  // 3. Extract metrics
  // Artillery v2 structure: report.aggregate.summaries['http.response_time']
  const stats = report.aggregate.summaries['http.response_time'] || {};
  const median = stats.median || 0;
  const p95 = stats.p95 || 0;
  const p99 = stats.p99 || 0;
  
  const codes = report.aggregate.summaries['http.codes'] || {};
  const totalRequests = Object.values(codes).reduce((a, b) => a + b, 0);
  const okRequests = codes['200'] || 0 + (codes['201'] || 0);
  const errorRate = totalRequests > 0 ? ((totalRequests - okRequests) / totalRequests) * 100 : 0;

  console.log('\n--- Performance Results ---');
  console.log(`Median Latency: ${median}ms (Threshold: ${THRESHOLDS.median}ms)`);
  console.log(`p95 Latency:    ${p95}ms (Threshold: ${THRESHOLDS.p95}ms)`);
  console.log(`p99 Latency:    ${p99}ms (Threshold: ${THRESHOLDS.p99}ms)`);
  console.log(`Error Rate:     ${errorRate.toFixed(2)}% (Threshold: ${THRESHOLDS.errorRate}%)`);

  // 4. Validate against thresholds
  let failed = false;

  if (median > THRESHOLDS.median) {
    console.error('FAIL: Median latency exceeds threshold.');
    failed = true;
  }
  if (p95 > THRESHOLDS.p95) {
    console.error('FAIL: p95 latency exceeds threshold.');
    failed = true;
  }
  if (p99 > THRESHOLDS.p99) {
    console.error('FAIL: p99 latency exceeds threshold.');
    failed = true;
  }
  if (errorRate > THRESHOLDS.errorRate) {
    console.error('FAIL: Error rate exceeds threshold.');
    failed = true;
  }

  if (failed) {
    console.error('\nResult: PERFORMANCE REGRESSION DETECTED');
    process.exit(1);
  } else {
    console.log('\nResult: PERFORMANCE CHECK PASSED');
    process.exit(0);
  }

} catch (error) {
  console.error('Error during performance check:', error.message);
  process.exit(1);
}
