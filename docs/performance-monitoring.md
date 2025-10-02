# Performance Monitoring & Load Testing System

## Overview

The StrellerMinds-Backend includes a comprehensive performance monitoring and load testing system designed to ensure optimal application performance, identify bottlenecks, and maintain service quality under various load conditions.

## Features

### 🔍 Real-time Performance Monitoring

- **Automatic Metrics Collection**: Captures response times, throughput, error rates, and resource usage
- **Performance Interceptor**: Automatically monitors all API endpoints
- **System Health Monitoring**: Tracks memory usage, CPU utilization, and database performance
- **Alert System**: Configurable thresholds with automatic alerting

### 🔥 Load Testing Framework

- **Artillery.js Integration**: Comprehensive load testing with realistic user scenarios
- **Multiple Test Types**: Authentication flows, course browsing, search operations
- **Configurable Load Patterns**: Warm-up, ramp-up, sustained load, and peak testing
- **Performance Thresholds**: Automatic pass/fail criteria based on response times and error rates

### 📊 Scalability Testing

- **Progressive Load Testing**: Tests system behavior under increasing concurrent users
- **Bottleneck Identification**: Automatically identifies CPU, memory, database, and connection bottlenecks
- **Breaking Point Analysis**: Determines maximum sustainable load
- **Performance Degradation Tracking**: Monitors how performance changes with load

### 📋 Performance Baselines

- **Baseline Creation**: Establish performance standards for comparison
- **Trend Analysis**: Track performance changes over time
- **Automatic Validation**: Compare current performance against established baselines
- **Regression Detection**: Alert when performance degrades beyond acceptable thresholds

### 📈 Comprehensive Reporting

- **Multi-format Reports**: HTML, JSON, and Markdown reports
- **Performance Dashboards**: Visual representation of metrics and trends
- **Recommendation Engine**: Automated suggestions for performance improvements
- **Historical Analysis**: Track performance trends over time

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Basic Load Test

```bash
# Quick health check load test
npm run load:test:quick

# Full authentication load test
npm run load:test:auth

# Course browsing load test
npm run load:test:courses
```

### 3. Performance Monitoring

```bash
# Start real-time performance monitoring
npm run perf:monitor

# Create performance baseline
npm run perf:baseline

# Generate performance report
npm run perf:report
```

### 4. Scalability Testing

```bash
# Run comprehensive scalability test
node scripts/scalability-test.js

# Run stress test
npm run stress:test
```

## Configuration

### Environment Variables

```bash
# API Configuration
API_BASE_URL=http://localhost:3000
API_TOKEN=your_api_token_here

# Monitoring Configuration
MONITORING_INTERVAL=30000  # 30 seconds
PERFORMANCE_THRESHOLD_RESPONSE_TIME=2000  # 2 seconds
PERFORMANCE_THRESHOLD_ERROR_RATE=5  # 5%
PERFORMANCE_THRESHOLD_MEMORY=85  # 85%

# Load Testing Configuration
LOAD_TEST_DURATION=300  # 5 minutes
LOAD_TEST_CONCURRENT_USERS=100
LOAD_TEST_RAMP_UP_TIME=60  # 1 minute
```

### Performance Thresholds

The system uses configurable thresholds for performance monitoring:

```typescript
const thresholds = {
  responseTime: {
    warning: 1000, // 1 second
    critical: 2000, // 2 seconds
  },
  memoryUsage: {
    warning: 70, // 70%
    critical: 85, // 85%
  },
  errorRate: {
    warning: 1, // 1%
    critical: 5, // 5%
  },
  throughput: {
    minimum: 100, // requests per second
  },
};
```

## API Endpoints

### Performance Monitoring API

```bash
# Get system performance summary
GET /performance/system/summary?timeWindow=3600

# Get endpoint-specific performance stats
GET /performance/endpoint/:endpoint?timeWindow=3600

# Get real-time metrics
GET /performance/metrics/real-time

# Get performance health status
GET /performance/health/performance

# Create performance baseline
POST /performance/baseline/create
```

### Example Response

```json
{
  "timeWindow": 3600,
  "totalRequests": 1500,
  "overallPerformance": {
    "averageResponseTime": 245.5,
    "medianResponseTime": 180.2,
    "p95ResponseTime": 850.1,
    "p99ResponseTime": 1200.5,
    "overallErrorRate": 0.8,
    "averageMemoryUsage": 65.2,
    "throughput": 125.5
  },
  "performanceGrade": "B",
  "recommendations": ["Consider implementing caching to reduce response times"]
}
```

## Load Testing Scenarios

### 1. Authentication Load Test

Tests user authentication flows including login, token refresh, and profile access.

**Configuration**: `test/load/auth-load-test.yml`

**Scenarios**:

- User login (60% weight)
- Token refresh (20% weight)
- User registration (20% weight)

### 2. Course Browsing Load Test

Tests course-related API endpoints under load.

**Configuration**: `test/load/courses-load-test.yml`

**Scenarios**:

- Course browsing (50% weight)
- Course search (30% weight)
- Course details (20% weight)

### 3. Scalability Test

Progressive load testing to identify system limits.

**Configuration**: `test/load/scalability-test.yml`

**Phases**:

1. Baseline (10 users, 120s)
2. Light Load (50 users, 180s)
3. Medium Load (100 users, 240s)
4. Heavy Load (200 users, 300s)
5. Peak Load (400 users, 180s)
6. Stress Test (600 users, 120s)

## Performance Baselines

### Creating Baselines

```bash
# Create a new baseline
npm run perf:baseline

# Or via API
curl -X POST http://localhost:3000/performance/baseline/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Baseline v1.0",
    "description": "Baseline after optimization changes"
  }'
```

### Baseline Validation

The system automatically validates current performance against established baselines:

- **Hourly validation**: Automatic checks every hour
- **Threshold-based alerts**: Alerts when performance deviates significantly
- **Trend analysis**: Tracks performance improvements or degradations

## Monitoring and Alerting

### Alert Types

1. **Response Time Alerts**
   - Warning: > 1 second
   - Critical: > 2 seconds

2. **Memory Usage Alerts**
   - Warning: > 70%
   - Critical: > 85%

3. **Error Rate Alerts**
   - Warning: > 1%
   - Critical: > 5%

4. **Performance Degradation Alerts**
   - Triggered when performance degrades > 50% from baseline

### Alert Channels

- **Console Logging**: Development environment
- **Email Notifications**: Production environment (configure SMTP)
- **Webhook Integration**: Custom alerting systems
- **Slack Integration**: Team notifications (configure webhook URL)

## Performance Optimization Recommendations

### Automatic Recommendations

The system provides automatic recommendations based on performance analysis:

1. **High Response Times**
   - Implement caching strategies
   - Optimize database queries
   - Review algorithm complexity

2. **High Memory Usage**
   - Optimize memory-intensive operations
   - Implement garbage collection tuning
   - Review memory leaks

3. **High Error Rates**
   - Investigate error sources
   - Improve error handling
   - Review input validation

4. **Low Throughput**
   - Scale infrastructure
   - Optimize connection pooling
   - Review bottlenecks

## Reporting

### Report Types

1. **HTML Reports**: Visual dashboards with charts and graphs
2. **JSON Reports**: Machine-readable data for integration
3. **Markdown Reports**: Documentation-friendly format

### Report Contents

- **Executive Summary**: Key performance metrics
- **Performance Trends**: Historical analysis
- **Load Test Results**: Detailed test outcomes
- **Scalability Analysis**: Capacity planning insights
- **Recommendations**: Actionable improvement suggestions

### Generating Reports

```bash
# Generate comprehensive performance report
npm run perf:report

# Or manually
node scripts/performance-report.js
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Performance Testing
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  performance-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Start application
        run: npm run start:prod &
      - name: Wait for application
        run: sleep 30
      - name: Run load tests
        run: npm run load:test:full
      - name: Generate performance report
        run: npm run perf:report
      - name: Upload reports
        uses: actions/upload-artifact@v2
        with:
          name: performance-reports
          path: test/performance/reports/
```

## Troubleshooting

### Common Issues

1. **High Response Times**
   - Check database connection pool settings
   - Review slow query logs
   - Monitor CPU and memory usage

2. **Memory Leaks**
   - Use heap profiling tools
   - Review event listener cleanup
   - Monitor garbage collection

3. **Connection Pool Exhaustion**
   - Increase pool size
   - Optimize query execution time
   - Review connection lifecycle

### Debug Mode

Enable debug logging for detailed performance information:

```bash
DEBUG=performance:* npm run start:dev
```

## Best Practices

1. **Regular Baseline Updates**: Update baselines after significant changes
2. **Continuous Monitoring**: Keep monitoring active in all environments
3. **Load Test Integration**: Include load tests in CI/CD pipeline
4. **Performance Budgets**: Set and enforce performance budgets
5. **Proactive Optimization**: Address performance issues before they impact users

## Support

For questions or issues with the performance monitoring system:

1. Check the troubleshooting section
2. Review application logs
3. Consult the performance reports
4. Contact the development team

---

_This documentation is part of the StrellerMinds-Backend performance monitoring system._
