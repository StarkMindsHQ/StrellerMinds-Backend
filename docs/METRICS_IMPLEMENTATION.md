# Application Metrics Implementation

## Overview

This document describes the comprehensive metrics and monitoring system implemented for the StrellerMinds Backend application. The system provides Prometheus-compatible metrics for monitoring application health, performance, business metrics, and error rates.

## Architecture

### Components

1. **MetricsService** - Core service for collecting and exposing Prometheus metrics
2. **BusinessMetricsService** - Service for tracking business-specific events
3. **MetricsController** - HTTP endpoints for accessing metrics
4. **MetricsInterceptor** - Automatic HTTP request tracking
5. **Grafana Dashboard** - Pre-configured visualization dashboard

### Dependencies

- `prom-client` - Prometheus client for Node.js
- `@willsoto/nestjs-prometheus` - NestJS Prometheus integration

## Metrics Categories

### 1. HTTP Metrics

Track all HTTP requests and responses:

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `http_requests_total` | Counter | Total HTTP requests | method, route, status, status_code |
| `http_request_duration_seconds` | Histogram | Request duration | method, route, status |
| `http_request_size_bytes` | Summary | Request body size | method, route |
| `http_response_size_bytes` | Summary | Response body size | method, route |
| `active_connections` | Gauge | Active connections | - |

### 2. Error Metrics

Monitor application errors:

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `errors_total` | Counter | Total errors | type, severity, endpoint |
| `error_rate` | Gauge | Errors per minute | - |
| `errors_by_type_total` | Counter | Errors by type | type, code |
| `errors_by_endpoint_total` | Counter | Errors by endpoint | endpoint, method, status_code |

### 3. Security Metrics

Track security-related events:

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `security_auth_failures_total` | Counter | Auth failures | reason, endpoint |
| `security_rate_limit_hits_total` | Counter | Rate limit hits | endpoint, ip |
| `security_unauthorized_access_total` | Counter | Unauthorized access | endpoint, required_role |
| `login_attempts_total` | Counter | Login attempts | method, status |
| `login_success_total` | Counter | Successful logins | method |
| `login_failures_total` | Counter | Failed logins | method, reason |

### 4. Business Metrics

Track business-specific events:

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `user_registrations_total` | Counter | User registrations | source, method |
| `user_logins_total` | Counter | User logins | method |
| `active_users` | Gauge | Active users | - |
| `course_enrollments_total` | Counter | Course enrollments | course_id, course_type |
| `course_completions_total` | Counter | Course completions | course_id, course_type |
| `course_views_total` | Counter | Course views | course_id |
| `payments_total` | Counter | Payments | status, method, currency |
| `payment_amount_total` | Counter | Payment amounts | currency, method |
| `payment_failures_total` | Counter | Payment failures | reason, method |
| `subscriptions_total` | Counter | Subscriptions | plan, status |
| `subscription_cancellations_total` | Counter | Cancellations | plan, reason |
| `content_uploads_total` | Counter | Content uploads | type, status |
| `forum_posts_total` | Counter | Forum posts | category |
| `forum_replies_total` | Counter | Forum replies | category |
| `search_queries_total` | Counter | Search queries | type, has_results |
| `notifications_sent_total` | Counter | Notifications | type, channel, status |

### 5. Performance Metrics

Monitor application performance:

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `database_query_duration_seconds` | Histogram | DB query duration | operation, table, status |
| `database_queries_total` | Counter | DB queries | operation, table, status |
| `database_connections` | Gauge | DB connections | state |
| `cache_hits_total` | Counter | Cache hits | cache_type, key_pattern |
| `cache_misses_total` | Counter | Cache misses | cache_type, key_pattern |
| `cache_hit_rate` | Gauge | Cache hit rate | cache_type |
| `cache_size_bytes` | Gauge | Cache size | cache_type |
| `cache_operations_total` | Counter | Cache operations | operation, cache_type, status |
| `event_loop_lag_seconds` | Gauge | Event loop lag | - |
| `gc_duration_seconds` | Histogram | GC duration | gc_type |
| `heap_size_bytes` | Gauge | Heap size | - |
| `heap_used_bytes` | Gauge | Used heap | - |
| `external_memory_bytes` | Gauge | External memory | - |
| `rss_bytes` | Gauge | Resident set size | - |
| `cpu_usage_percent` | Gauge | CPU usage | type |

### 6. API Metrics

Track API-specific metrics:

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `api_latency_seconds` | Histogram | API latency | endpoint, method, status |
| `api_calls_total` | Counter | API calls | endpoint, method, status |
| `api_errors_total` | Counter | API errors | endpoint, method, error_type, status_code |
| `api_rate_limit_total` | Counter | Rate limit hits | endpoint, method |

### 7. Queue Metrics

Monitor background job processing:

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `queue_jobs_total` | Counter | Queue jobs | queue, status |
| `queue_jobs_active` | Gauge | Active jobs | queue |
| `queue_jobs_waiting` | Gauge | Waiting jobs | queue |
| `queue_jobs_completed_total` | Counter | Completed jobs | queue |
| `queue_jobs_failed_total` | Counter | Failed jobs | queue, error_type |
| `queue_processing_duration_seconds` | Histogram | Processing duration | queue, job_type |

### 8. Email Metrics

Track email delivery:

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `emails_sent_total` | Counter | Emails sent | type, status |
| `emails_failed_total` | Counter | Failed emails | type, reason |
| `email_delivery_duration_seconds` | Histogram | Delivery duration | type |

### 9. File Metrics

Monitor file operations:

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `file_uploads_total` | Counter | File uploads | type, status |
| `file_downloads_total` | Counter | File downloads | type, status |
| `file_size_bytes` | Summary | File sizes | type |
| `storage_used_bytes` | Gauge | Storage used | type |

### 10. Blockchain Metrics

Track blockchain operations:

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `blockchain_transactions_total` | Counter | Blockchain transactions | type, status |
| `blockchain_transaction_duration_seconds` | Histogram | Transaction duration | type |
| `blockchain_errors_total` | Counter | Blockchain errors | type, error_type |

## API Endpoints

### GET /metrics

Returns Prometheus-formatted metrics.

**Response:** `text/plain; version=0.0.4; charset=utf-8`

```prometheus
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/users",status="2xx",status_code="200"} 1234
```

### GET /metrics/json

Returns metrics in JSON format.

**Response:** `application/json`

```json
[
  {
    "name": "http_requests_total",
    "type": "counter",
    "help": "Total number of HTTP requests",
    "values": [
      {
        "value": 1234,
        "labels": {
          "method": "GET",
          "route": "/api/users",
          "status": "2xx",
          "status_code": "200"
        }
      }
    ]
  }
]
```

### GET /metrics/health

Health check endpoint for metrics service.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "metrics"
}
```

### GET /metrics/summary

Returns metrics grouped by category.

**Response:**

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "summary": {
    "http": [...],
    "errors": [...],
    "security": [...],
    "business": [...],
    "performance": [...],
    "api": [...],
    "queue": [...],
    "email": [...],
    "file": [...],
    "blockchain": [...],
    "system": [...]
  }
}
```

### GET /metrics/stats

Returns metrics statistics.

**Response:**

```json
{
  "totalMetrics": 150,
  "metricsByType": {
    "counters": 80,
    "gauges": 40,
    "histograms": 20,
    "summaries": 10
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Usage Examples

### Tracking Business Events

```typescript
import { BusinessMetricsService } from './metrics/services/business-metrics.service';

@Injectable()
export class UserService {
  constructor(private readonly businessMetrics: BusinessMetricsService) {}

  async registerUser(data: RegisterDto) {
    // ... registration logic
    
    // Track registration
    this.businessMetrics.trackUserRegistration('web', 'email');
  }

  async loginUser(credentials: LoginDto) {
    // ... login logic
    
    // Track login
    this.businessMetrics.trackUserLogin('password');
    this.businessMetrics.trackLoginSuccess('password');
  }
}
```

### Tracking Payments

```typescript
@Injectable()
export class PaymentService {
  constructor(private readonly businessMetrics: BusinessMetricsService) {}

  async processPayment(order: Order) {
    try {
      // ... payment processing
      
      // Track successful payment
      this.businessMetrics.trackPayment('success', 'stripe', 'usd', order.amount);
    } catch (error) {
      // Track failed payment
      this.businessMetrics.trackPaymentFailure('card_declined', 'stripe');
      throw error;
    }
  }
}
```

### Tracking Database Queries

```typescript
@Injectable()
export class UserRepository {
  constructor(private readonly businessMetrics: BusinessMetricsService) {}

  async findById(id: string): Promise<User> {
    const start = Date.now();
    
    try {
      const user = await this.repository.findOne({ where: { id } });
      
      // Track successful query
      const duration = (Date.now() - start) / 1000;
      this.businessMetrics.trackDatabaseQuery('select', 'users', duration, 'success');
      
      return user;
    } catch (error) {
      // Track failed query
      const duration = (Date.now() - start) / 1000;
      this.businessMetrics.trackDatabaseQuery('select', 'users', duration, 'error');
      throw error;
    }
  }
}
```

### Tracking Cache Operations

```typescript
@Injectable()
export class CacheService {
  constructor(private readonly businessMetrics: BusinessMetricsService) {}

  async get(key: string): Promise<any> {
    const value = await this.redis.get(key);
    
    if (value) {
      // Track cache hit
      this.businessMetrics.trackCacheHit('redis', key);
    } else {
      // Track cache miss
      this.businessMetrics.trackCacheMiss('redis', key);
    }
    
    return value;
  }
}
```

### Tracking Errors

```typescript
@Injectable()
export class SomeService {
  constructor(private readonly businessMetrics: BusinessMetricsService) {}

  async someOperation() {
    try {
      // ... operation logic
    } catch (error) {
      // Track error
      this.businessMetrics.trackError(
        'ValidationError',
        'high',
        '/api/endpoint',
        'VALIDATION_FAILED'
      );
      throw error;
    }
  }
}
```

## Grafana Dashboard

A pre-configured Grafana dashboard is available at `monitoring/grafana-dashboard.json`.

### Dashboard Sections

1. **Overview** - High-level metrics (request rate, response time, error rate, active connections)
2. **HTTP Metrics** - Request rates, response times, status codes
3. **Business Metrics** - User registrations, course enrollments, payments, active users
4. **Performance Metrics** - Database queries, cache hit rate, event loop lag, memory usage
5. **Security Metrics** - Authentication failures, rate limit hits
6. **Error Metrics** - Errors by type and endpoint
7. **Queue Metrics** - Queue jobs, processing duration
8. **Email & File Metrics** - Email delivery, file operations

### Importing the Dashboard

1. Open Grafana
2. Go to Dashboards → Import
3. Upload `monitoring/grafana-dashboard.json`
4. Select your Prometheus data source
5. Click Import

## Prometheus Configuration

Update your `prometheus.yml` to scrape the metrics endpoint:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'nestjs-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

## Alerting Rules

Example Prometheus alerting rules:

```yaml
groups:
  - name: strellerminds-alerts
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Slow response time
      - alert: SlowResponseTime
        expr: rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m]) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time detected"
          description: "Average response time is {{ $value }}s"

      # High memory usage
      - alert: HighMemoryUsage
        expr: heap_used_bytes / heap_size_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      # Database query timeout
      - alert: SlowDatabaseQueries
        expr: rate(database_query_duration_seconds_sum[5m]) / rate(database_query_duration_seconds_count[5m]) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries"
          description: "Average query duration is {{ $value }}s"

      # Low cache hit rate
      - alert: LowCacheHitRate
        expr: cache_hit_rate < 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value | humanizePercentage }}"
```

## Best Practices

### 1. Use Labels Wisely

- Keep label cardinality low
- Avoid using high-cardinality labels (e.g., user IDs, request IDs)
- Use consistent label names across metrics

### 2. Metric Naming

- Follow Prometheus naming conventions
- Use snake_case for metric names
- Include unit suffixes (e.g., `_seconds`, `_bytes`, `_total`)

### 3. Performance

- Metrics collection has minimal overhead
- Use histograms for latency measurements
- Use summaries for pre-calculated quantiles

### 4. Monitoring Strategy

- Set up alerts for critical metrics
- Monitor both technical and business metrics
- Use dashboards for real-time visibility
- Review metrics regularly for trends

## Troubleshooting

### Metrics Not Appearing

1. Check if the metrics endpoint is accessible: `curl http://localhost:3000/metrics`
2. Verify Prometheus is scraping the endpoint
3. Check application logs for errors

### High Cardinality Issues

1. Review label values in metrics
2. Reduce label cardinality
3. Use recording rules for complex queries

### Performance Impact

1. Monitor metrics collection overhead
2. Adjust scrape intervals if needed
3. Use sampling for high-volume metrics

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [prom-client Documentation](https://github.com/siimon/prom-client)
- [Grafana Documentation](https://grafana.com/docs/)
- [NestJS Monitoring](https://docs.nestjs.com/techniques/metrics)
