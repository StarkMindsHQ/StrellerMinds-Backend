# Application Performance Monitoring (APM) Implementation Guide

## Overview

This document describes the comprehensive Application Performance Monitoring (APM) system implemented for StrellerMinds Backend. The system provides:

- **APM Integration**: DataDog and New Relic support
- **Distributed Tracing**: W3C Trace Context standard
- **Performance Profiling**: Memory, CPU, and operation profiling
- **Performance Alerting**: Real-time alerts with multiple notification channels
- **Performance Optimization**: Automatic detection and recommendations

## Architecture

### Components

1. **APM Providers**
   - `DatadogProvider`: Integrates with DataDog APM
   - `NewRelicProvider`: Integrates with New Relic APM

2. **Distributed Tracing**
   - `DistributedTracingService`: Manages distributed traces across service boundaries
   - `DistributedTracingMiddleware`: HTTP request tracing middleware

3. **Performance Profiling**
   - `PerformanceProfilerService`: Captures and analyzes performance profiles
   - Tracks memory usage, CPU usage, and operation timings

4. **Alerting System**
   - `AlertingService`: Manages performance alerts
   - Supports Slack and PagerDuty integrations

5. **Decorators & Interceptors**
   - `@Trace()`: Decorates methods for distributed tracing
   - `@Performance()`: Measures method execution time with alerting
   - `@Profile()`: Detailed method profiling with memory tracking
   - `@ProfileQuery()`: Database query performance tracking

## Configuration

### Environment Variables

```bash
# APM Provider Selection
DATADOG_API_KEY=your-datadog-api-key              # Enable DataDog integration
NEW_RELIC_LICENSE_KEY=your-newrelic-license-key   # Enable New Relic integration
SENTRY_DSN=your-sentry-dsn                        # Enable Sentry integration

# Application Info
APP_NAME=strellerminds-backend
APP_VERSION=1.0.0
NODE_ENV=production

# DataDog Configuration
DATADOG_SAMPLING_RATE=0.1                         # Sample 10% of traces
DATADOG_LOG_INJECTION=true                        # Inject trace context into logs
DATADOG_METRICS_ENABLED=true
DATADOG_PROFILING_ENABLED=false
DATADOG_TRACE_BUFFER_SIZE=1000

# New Relic Configuration
NEW_RELIC_SAMPLING_RATE=0.1
NEW_RELIC_METRICS_ENABLED=true
NEW_RELIC_EVENTS_ENABLED=true

# Sentry Configuration
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_PROFILING_ENABLED=false

# Distributed Tracing Configuration
TRACING_ENABLED=true
TRACING_SPAN_BUFFER_SIZE=10000
TRACING_CLEANUP_INTERVAL_MS=3600000
TRACING_EXPORT_INTERVAL_MS=60000

# Performance Profiling Configuration
PROFILING_ENABLED=true
PROFILING_INTERVAL_MS=60000                       # Capture profile every minute
MEMORY_PROFILER_ENABLED=true
HEAP_SNAPSHOT_INTERVAL_MS=3600000                 # Hourly heap snapshot
CPU_PROFILER_ENABLED=true
CPU_SAMPLING_INTERVAL_MS=1000

# Performance Alerting Configuration
ALERTING_ENABLED=true
ALERT_MEMORY_THRESHOLD=85                         # Alert when memory > 85%
ALERT_CPU_THRESHOLD=80                            # Alert when CPU > 80%
ALERT_RESPONSE_TIME_THRESHOLD=5000                # Alert on responses > 5s
ALERT_ERROR_RATE_THRESHOLD=5.0                    # Alert on error rate > 5%
ALERT_DB_LATENCY_THRESHOLD=1000                   # Alert on DB queries > 1s
ALERT_CACHE_MISS_THRESHOLD=30                     # Alert on cache miss rate > 30%
MEMORY_LEAK_DETECTION_ENABLED=true

# Notification Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PAGERDUTY_INTEGRATION_KEY=your-pagerduty-key
```

## Usage

### API Endpoints

#### Distributed Tracing
```
GET /api/monitoring/tracing/active-spans
  - Get all active distributed traces

GET /api/monitoring/tracing/spans/:traceId
  - Get all spans for a specific trace

GET /api/monitoring/tracing/completed?limit=100
  - Get recently completed spans

GET /api/monitoring/tracing/stats/:traceId
  - Get statistics for a trace
```

#### Performance Profiling
```
GET /api/monitoring/profiling/latest
  - Get the latest performance profile

GET /api/monitoring/profiling/profiles?limit=10
  - Get recent performance profiles

GET /api/monitoring/profiling/memory-trend?period=10
  - Get memory usage trend

GET /api/monitoring/profiling/operation-stats
  - Get statistics for all operations

GET /api/monitoring/profiling/operation-stats/:operation
  - Get statistics for a specific operation

GET /api/monitoring/profiling/report
  - Generate a complete profiling report

GET /api/monitoring/profiling/memory-leak-detection
  - Detect potential memory leaks

POST /api/monitoring/profiling/capture-snapshot
  - Capture a memory snapshot immediately

POST /api/monitoring/profiling/reset
  - Reset profiler data
```

#### Performance Alerting
```
GET /api/monitoring/alerts/active
  - Get all active alerts

GET /api/monitoring/alerts/history?limit=100
  - Get alert history

GET /api/monitoring/alerts/stats
  - Get alert statistics

POST /api/monitoring/alerts/:alertId/resolve
  - Resolve a specific alert

POST /api/monitoring/alerts/clear
  - Clear all alerts
```

### Using Decorators

#### Trace Decorator
Adds distributed tracing to a method:

```typescript
import { Trace } from '@monitoring/decorators/performance.decorator';

@Controller('users')
export class UsersController {
  @Get(':id')
  @Trace('get-user-by-id')
  async getUser(@Param('id') id: string) {
    // Method is automatically traced
  }
}
```

#### Performance Decorator
Measures execution time and alerts on slow operations:

```typescript
import { Performance } from '@monitoring/decorators/performance.decorator';

export class PaymentService {
  @Performance(5000) // Alert if takes > 5 seconds
  async processPayment(orderId: string) {
    // Your payment processing code
  }
}
```

#### Profile Decorator
Detailed profiling including memory tracking:

```typescript
import { Profile } from '@monitoring/decorators/performance.decorator';

export class ReportService {
  @Profile()
  async generateReport() {
    // Memory usage before/after is tracked
  }
}
```

#### ProfileQuery Decorator
Track database query performance:

```typescript
import { ProfileQuery } from '@monitoring/decorators/performance.decorator';

@Injectable()
export class UsersRepository {
  @ProfileQuery('find-user-by-email')
  async findByEmail(email: string) {
    return this.db.query('SELECT * FROM users WHERE email = ?', [email]);
  }
}
```

### Injecting Services

```typescript
import { Injectable } from '@nestjs/common';
import { DistributedTracingService } from '@monitoring/services/distributed-tracing.service';
import { PerformanceProfilerService } from '@monitoring/services/performance-profiler.service';
import { AlertingService } from '@monitoring/services/alerting.service';

@Injectable()
export class MyService {
  constructor(
    private tracingService: DistributedTracingService,
    private profilerService: PerformanceProfilerService,
    private alertingService: AlertingService,
  ) {}

  async myMethod() {
    // Create a trace
    const traceId = this.tracingService.createTrace('my-operation', 'my-service');
    
    try {
      // Do work...
      this.tracingService.addTags(traceId, {
        'user.id': userId,
        'operation': 'data-processing',
      });
      
      this.tracingService.endSpan(traceId, 'completed');
    } catch (error) {
      this.tracingService.endSpan(traceId, 'error', error);
      throw error;
    }
  }
}
```

## Performance Optimization Features

### Memory Leak Detection
The profiler automatically detects potential memory leaks by analyzing memory trends:

```typescript
const analysis = this.profilerService.detectMemoryLeaks();
if (analysis.isLeaking) {
  console.warn(`Memory leak detected: ${analysis.warning}`);
}
```

### Operation Hotspot Analysis
Automatically identifies slow operations:

```typescript
const report = this.profilerService.generateReport();
// report.hotspots contains operations consuming most time
```

### Alert Actions
Three levels of alert actions:

1. **Log**: Simple logging of the alert
2. **Notify**: Send to Slack
3. **Page**: Escalate to PagerDuty on-call engineer

```typescript
this.alertingService.updateAlertConfig(AlertType.HIGH_MEMORY, {
  action: 'page', // Pages on-call for critical memory issues
});
```

## Monitoring Dashboard Integration

### DataDog Integration
When configured, automatically sends:
- Distributed traces with span details
- Performance metrics
- Custom events and annotations
- Application profiling data

### New Relic Integration
When configured, automatically sends:
- Transaction data
- Custom metrics
- Custom events
- Error tracking

## Best Practices

1. **Use Distributed Tracing for Cross-Service Calls**
   - Trace IDs are automatically propagated via `X-Trace-ID` header
   - Use for debugging latency issues across services

2. **Profile High-Risk Operations**
   - Use `@Profile()` on data-intensive operations
   - Monitor memory impacts of report generation, data exports

3. **Set Appropriate Alert Thresholds**
   - Don't set thresholds too low (causes alert fatigue)
   - Adjust based on your SLA requirements

4. **Regular Performance Analysis**
   - Review trending reports weekly
   - Act on hotspot recommendations

5. **Production Configuration**
   - Use sampling (10-50%) to reduce overhead
   - Enable alerting for critical operations
   - Integrate with your incident management system

## Troubleshooting

### APM Packages Not Installed

DataDog and New Relic integrations require additional packages:

```bash
# For DataDog
npm install dd-trace

# For New Relic
npm install newrelic
```

### Traces Not Appearing in Dashboard

1. Verify API keys are set correctly
2. Check sampling rate isn't too low
3. Ensure service is running with adequate network connectivity
4. Check firewall rules for access to APM endpoints

### High Memory Overhead from Profiling

1. Increase `PROFILING_INTERVAL_MS` (profile less frequently)
2. Reduce `TRACING_SPAN_BUFFER_SIZE` if monitoring many spans
3. Enable selective profiling with decorators instead of global

## Performance Impact

Expected performance overhead:

- **Distributed Tracing**: < 1% when sampling at 10%
- **Performance Profiling**: 2-5% depending on interval
- **Alerting**: < 0.5% for threshold checks
- **Total Impact**: 3-7% with all features enabled

## Future Enhancements

1. OpenTelemetry standard support
2. Custom metric dashboards
3. ML-based anomaly detection
4. Automatic performance regression testing
5. Cost optimization recommendations

## Support & Documentation

- [DataDog APM Documentation](https://docs.datadoghq.com/tracing/)
- [New Relic APM Documentation](https://docs.newrelic.com/docs/apm/)
- [W3C Trace Context Standard](https://www.w3.org/TR/trace-context/)

## Related Files

- Configuration: [src/monitoring/config/apm.config.ts](../config/apm.config.ts)
- Services: [src/monitoring/services/](../services/)
- Decorators: [src/monitoring/decorators/](../decorators/)
- Middleware: [src/monitoring/middleware/](../middleware/)
- API Endpoints: [src/monitoring/controllers/monitoring.controller.ts](../controllers/monitoring.controller.ts)
