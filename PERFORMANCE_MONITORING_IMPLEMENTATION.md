# Performance Monitoring and Optimization Implementation

## Overview

A comprehensive performance monitoring system with APM capabilities, database query optimization, multi-level caching strategies, automated performance tuning, analytics, load testing, and optimization recommendations.

## Features Implemented

### 1. Application Performance Monitoring (APM)
- **Transaction Tracking**: Track HTTP requests, database queries, cache operations, and background jobs
- **Performance Snapshots**: Capture system metrics (memory, CPU, event loop) every 5 seconds
- **Real-time Metrics**: Monitor active transactions, response times, error rates, and throughput
- **Performance Statistics**: Calculate p50, p95, p99 percentiles and error rates

**Files:**
- `src/monitoring/services/apm.service.ts`
- `src/monitoring/entities/performance-metric.entity.ts`
- `src/monitoring/interfaces/apm.interface.ts`

### 2. Database Query Optimization
- **Query Analysis**: Analyze slow queries using PostgreSQL EXPLAIN
- **Missing Index Detection**: Automatically detect missing indexes
- **Unused Index Detection**: Identify unused indexes for removal
- **Optimization Recommendations**: Generate actionable optimization suggestions
- **Auto-apply Optimizations**: Automatically apply safe optimizations

**Files:**
- `src/monitoring/services/database-optimization.service.ts`
- `src/monitoring/entities/query-optimization.entity.ts`

### 3. Multi-Level Caching
- **L1 Cache (In-Memory)**: Fastest access, Node.js Map-based
- **L2 Cache (Redis)**: Distributed caching with Redis
- **L3 Cache (Database)**: NestJS cache manager with database backend
- **Cache Metrics**: Track hit rates, operations, and evictions
- **Automatic Promotion**: Promote data from L3 → L2 → L1

**Files:**
- `src/monitoring/services/cache-optimization.service.ts`

### 4. Automated Performance Tuning
- **Hourly Analysis**: Automatically analyze performance every hour
- **Action Generation**: Generate tuning actions based on metrics
- **Auto-apply Actions**: Automatically apply low/medium priority actions
- **Manual Review**: Flag high/critical priority actions for review
- **Tuning History**: Track all tuning actions and results

**Files:**
- `src/monitoring/services/performance-tuning.service.ts`

### 5. Performance Analytics & Reporting
- **Performance Dashboard**: Comprehensive dashboard with overview, trends, and metrics
- **Endpoint Performance**: Breakdown of performance by endpoint
- **Time Series Data**: Generate time series for response time, error rate, throughput
- **Performance Reports**: Generate daily, weekly, monthly, or custom reports
- **Recommendations**: Include optimization recommendations in reports

**Files:**
- `src/monitoring/services/performance-analytics.service.ts`
- `src/monitoring/entities/performance-report.entity.ts`

### 6. Load Testing & Benchmarking
- **Load Testing**: Run load tests with configurable concurrent users and duration
- **Ramp-up Support**: Gradually increase load during test
- **Benchmark Comparison**: Compare multiple configurations
- **Test History**: Track all load test results
- **Statistics**: Calculate p50, p95, p99, throughput, error rates

**Files:**
- `src/monitoring/services/load-testing.service.ts`

### 7. Optimization Recommendations
- **Comprehensive Analysis**: Analyze all performance aspects
- **Prioritized Recommendations**: Categorize by priority (critical, high, medium, low)
- **Implementation Plan**: Generate immediate, short-term, and long-term plans
- **Category-based Recommendations**: Filter by category (Response Time, Cache, Database, etc.)

**Files:**
- `src/monitoring/services/optimization-recommendations.service.ts`

### 8. Performance Interceptor
- **Automatic Tracking**: Automatically track all HTTP requests
- **Transaction Management**: Start and end transactions for each request
- **Slow Request Detection**: Log warnings for requests > 1 second
- **Error Tracking**: Track errors and their durations

**Files:**
- `src/monitoring/interceptors/performance.interceptor.ts`

### 9. Enhanced Health Checks
- **Performance Metrics**: Include performance metrics in health checks
- **Cache Metrics**: Show cache hit rates and operations
- **Database Metrics**: Display optimization statistics
- **APM Integration**: Show active transactions and response times

**Files:**
- `src/health/health.service.ts` (enhanced)

## API Endpoints

### APM Endpoints
- `GET /api/monitoring/apm/transactions` - Get active transactions
- `GET /api/monitoring/apm/metrics` - Get current metrics
- `GET /api/monitoring/apm/snapshots` - Get performance snapshots
- `GET /api/monitoring/apm/stats` - Get performance statistics

### Database Optimization
- `GET /api/monitoring/database/optimizations` - Get pending optimizations
- `GET /api/monitoring/database/optimizations/stats` - Get optimization statistics
- `POST /api/monitoring/database/optimizations/:id/apply` - Apply optimization

### Cache Management
- `GET /api/monitoring/cache/metrics` - Get cache metrics
- `GET /api/monitoring/cache/layers` - Get cache layer information
- `POST /api/monitoring/cache/clear` - Clear all cache layers

### Performance Tuning
- `GET /api/monitoring/tuning/history` - Get tuning history
- `GET /api/monitoring/tuning/recommendations` - Get recommended actions
- `POST /api/monitoring/tuning/run` - Run automated tuning

### Analytics
- `GET /api/monitoring/analytics/dashboard` - Get performance dashboard
- `GET /api/monitoring/analytics/endpoints` - Get endpoint performance
- `GET /api/monitoring/analytics/reports` - Get performance reports
- `GET /api/monitoring/analytics/reports/:id` - Get report by ID
- `POST /api/monitoring/analytics/reports/generate` - Generate report

### Load Testing
- `POST /api/monitoring/load-test/run` - Run load test
- `GET /api/monitoring/load-test/active` - Get active tests
- `GET /api/monitoring/load-test/history` - Get test history
- `GET /api/monitoring/load-test/:id` - Get test result
- `POST /api/monitoring/load-test/benchmark` - Run benchmark

### Recommendations
- `GET /api/monitoring/recommendations` - Get all recommendations
- `GET /api/monitoring/recommendations/high-priority` - Get high priority
- `GET /api/monitoring/recommendations/category/:category` - Get by category
- `GET /api/monitoring/recommendations/implementation-plan` - Get implementation plan

## Database Schema

### Tables Created
1. **performance_metrics** - Store performance metrics
2. **performance_reports** - Store generated reports
3. **query_optimizations** - Store query optimization records

### Migration
- `src/migrations/1709000000000-CreatePerformanceMonitoringTables.ts`

## Configuration

### Environment Variables
No additional environment variables required. Uses existing:
- `REDIS_HOST` - Redis host for L2 cache
- `REDIS_PORT` - Redis port
- `REDIS_PASSWORD` - Redis password (optional)
- Database configuration (from existing setup)

## Usage Examples

### Track a Custom Transaction
```typescript
const transactionId = this.apmService.startTransaction('custom-operation', 'custom', { metadata });
// ... perform operation ...
this.apmService.endTransaction(transactionId, 'success');
```

### Use Multi-Level Cache
```typescript
// Get from cache (checks L1 → L2 → L3)
const value = await this.cacheOptimization.get('key');

// Set in all cache layers
await this.cacheOptimization.set('key', value, 3600); // TTL in seconds
```

### Analyze a Slow Query
```typescript
const analysis = await this.databaseOptimization.analyzeQuery(query, duration);
console.log(analysis.recommendations);
```

### Run Load Test
```typescript
const result = await this.loadTesting.runLoadTest({
  url: 'http://localhost:3000/api/users',
  method: 'GET',
  concurrentUsers: 10,
  duration: 60,
  rampUp: 10,
});
```

### Get Recommendations
```typescript
const recommendations = await this.recommendationsService.getRecommendations();
const highPriority = await this.recommendationsService.getHighPriorityRecommendations();
```

## Integration

### Global Interceptor
The `PerformanceInterceptor` is registered globally in `app.module.ts` to automatically track all HTTP requests.

### Health Check Integration
Health checks now include performance metrics when the monitoring module is available.

## Monitoring & Alerts

### Events Emitted
- `transaction.completed` - When a transaction completes
- `performance.threshold.exceeded` - When performance thresholds are exceeded
- `query.slow` - When a slow query is detected
- `optimization.applied` - When an optimization is applied
- `performance.tuning.actions` - When tuning actions are generated

### Automated Actions
- **Hourly**: Automated performance tuning analysis
- **Every 5 seconds**: Performance snapshot capture
- **Every minute**: L1 cache cleanup

## Performance Thresholds

Default thresholds (configurable):
- Response Time: p50 < 200ms, p95 < 500ms, p99 < 1000ms
- Error Rate: < 1%
- Memory Usage: < 85%
- CPU Usage: < 80%
- Database Query Time: < 1000ms
- Cache Hit Rate: > 70%

## Next Steps

1. **Run Migration**: `npm run migration:run`
2. **Start Application**: `npm run start:dev`
3. **Access API Docs**: `http://localhost:3000/api/docs`
4. **View Metrics**: `http://localhost:3000/api/monitoring/apm/metrics`
5. **Check Health**: `http://localhost:3000/api/health/detailed`

## Testing

All endpoints are protected with JWT authentication. Use Swagger UI to test with authentication.

## Notes

- The monitoring system is designed to have minimal performance impact
- Cache operations are optimized for speed
- Database optimizations are applied automatically for safe changes only
- High/critical priority actions require manual review
- All metrics are stored in PostgreSQL for historical analysis
