# Database Query Optimization and Monitoring

This document describes the comprehensive database performance monitoring and optimization features implemented in the StrellerMinds backend.

## Features Implemented

### 1. Query Performance Logging for Slow Queries (>100ms)

The system automatically monitors all database queries and logs those that exceed the 100ms threshold. This is implemented in:

- `src/monitoring/database-monitoring.service.ts` - Core monitoring service that intercepts queries
- `src/config/database.config.ts` - Database configuration with 100ms threshold
- `src/database-optimization/interfaces/optimization-config.interface.ts` - Optimization configuration with 100ms threshold

### 2. Database Connection Pool Monitoring

The system monitors database connection pool metrics including:

- Total connections
- Active connections
- Idle connections
- Waiting requests

This is implemented in:

- `src/monitoring/database-monitoring.service.ts` - Connection pool metrics collection
- `src/config/database.config.ts` - Connection pool configuration

### 3. Database Query Caching

A query caching service is implemented to cache frequently accessed data:

- LRU cache with configurable TTL (default 5 minutes)
- Cache statistics tracking (hits, misses, evictions)
- Pattern-based cache invalidation

Implemented in:

- `src/database-optimization/services/query-cache.service.ts` - Core caching service

### 4. Database Performance Dashboard

A comprehensive dashboard API provides real-time database performance metrics:

- Performance summary with query statistics
- Slow query tracking
- Connection pool metrics
- Cache statistics
- Top tables by usage

Implemented in:

- `src/database-optimization/controllers/database-dashboard.controller.ts` - Dashboard API endpoints
- `src/database-optimization/services/database-dashboard.service.ts` - Dashboard data service

### 5. N+1 Query Pattern Optimization

The course service has been optimized to prevent N+1 query issues:

- Query builder with pre-loaded relations
- Optimized methods for common query patterns
- Efficient data fetching for related entities

Implemented in:

- `src/courses/courses.service.ts` - Optimized course service methods

## API Endpoints

The database dashboard provides the following endpoints:

### Performance Summary

```
GET /database-dashboard/performance-summary
```

Returns overall database performance metrics.

### Slow Queries

```
GET /database-dashboard/slow-queries
```

Returns detected slow queries with execution times.

### Connection Pool Metrics

```
GET /database-dashboard/connection-pool
```

Returns current connection pool statistics.

### Cache Statistics

```
GET /database-dashboard/cache-stats
```

Returns query cache statistics.

### Top Tables

```
GET /database-dashboard/top-tables
```

Returns most frequently accessed database tables.

## Configuration

The database optimization features can be configured through environment variables:

- `DATABASE_POOL_MAX` - Maximum connection pool size (default: 20)
- `DATABASE_POOL_MIN` - Minimum connection pool size (default: 5)
- `DATABASE_IDLE_TIMEOUT` - Connection idle timeout in ms (default: 30000)
- `DATABASE_POOL_MONITORING` - Enable connection pool monitoring (default: false)
- `DATABASE_POOL_METRICS_INTERVAL` - Pool metrics collection interval (default: 30000ms)

## Usage Examples

### Using Query Cache Service

```typescript
import { QueryCacheService } from './database-optimization/services/query-cache.service';

// Execute a query with caching
const result = await queryCacheService.executeWithCache(
  'SELECT * FROM courses WHERE category_id = $1',
  [categoryId],
  { ttl: 300000 }, // 5 minutes cache
);

// Get cache statistics
const stats = queryCacheService.getStats();
```

### Accessing Dashboard Data

```typescript
// Get performance summary
const summary = await databaseDashboardService.getPerformanceSummary();

// Get slow queries from last 24 hours
const slowQueries = await databaseDashboardService.getSlowQueries(50, 24);

// Get connection pool metrics
const poolMetrics = await databaseDashboardService.getConnectionPoolMetrics();
```

## Performance Benefits

1. **Reduced Database Load**: Query caching reduces repetitive database queries
2. **Improved Response Times**: Cached queries respond significantly faster
3. **Proactive Monitoring**: Slow query detection helps identify performance bottlenecks
4. **Resource Optimization**: Connection pool monitoring ensures optimal resource usage
5. **N+1 Query Prevention**: Optimized data fetching patterns prevent performance degradation

## Monitoring and Alerting

The system provides built-in monitoring capabilities:

- Real-time performance metrics dashboard
- Slow query logging and tracking
- Connection pool health monitoring
- Cache effectiveness tracking

These features help maintain optimal database performance and quickly identify issues before they impact users.
