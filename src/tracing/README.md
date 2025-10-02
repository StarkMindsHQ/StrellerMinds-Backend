# StrellerMinds Distributed Tracing Implementation

This directory contains the complete distributed tracing implementation for the StrellerMinds backend using OpenTelemetry.

## Overview

The distributed tracing system provides comprehensive observability across all microservices and external service interactions, enabling better debugging, performance monitoring, and system understanding.

## Features

### ✅ Implemented

- **OpenTelemetry Integration**: Complete OpenTelemetry SDK setup with automatic instrumentation
- **Multi-Backend Support**: Jaeger, Zipkin, and OTLP exporters
- **Service Correlation**: Automatic trace correlation across all modules
- **External Service Tracing**: HTTP client instrumentation for external APIs
- **Database Tracing**: PostgreSQL query tracing and performance monitoring
- **Blockchain Tracing**: Stellar blockchain operation tracing
- **Payment Tracing**: Stripe payment processing tracing
- **Visualization**: Grafana dashboards and Jaeger UI
- **Performance Alerting**: Prometheus-based alerting system
- **Docker Integration**: Complete Docker Compose setup for observability stack

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   StrellerMinds │───▶│  OpenTelemetry  │───▶│   Jaeger UI     │
│    Backend      │    │   Collector     │    │   (Port 16686)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Grafana       │
                       │  (Port 3001)    │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Prometheus    │
                       │  (Port 9090)    │
                       └─────────────────┘
```

## Quick Start

### 1. Environment Setup

Copy the tracing environment variables to your `.env.development` file:

```bash
cp development.env.example .env.development
```

Key environment variables:

```env
TRACING_ENABLED=true
TRACING_SERVICE_NAME=strellerminds-backend
TRACING_SERVICE_VERSION=1.0.0
TRACING_SAMPLING_ENABLED=true
TRACING_SAMPLING_RATIO=0.1
TRACING_OTLP_ENABLED=true
TRACING_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

### 2. Start Observability Stack

```bash
# Start the tracing infrastructure
docker-compose -f docker-compose.tracing.yml up -d

# Start the main application
npm run start:dev
```

### 3. Access Dashboards

- **Jaeger UI**: http://localhost:16686
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Zipkin**: http://localhost:9411

## Usage Examples

### 1. Basic Tracing

```typescript
import { TracingService } from './tracing/tracing.service';

@Injectable()
export class MyService {
  constructor(private readonly tracingService: TracingService) {}

  async myMethod() {
    return this.tracingService.withSpan('my-operation', async (span) => {
      span.setAttributes({
        'operation.type': 'business_logic',
        'user.id': '123',
      });

      // Your business logic here
      const result = await this.doSomething();

      span.setAttributes({
        'operation.success': true,
        'operation.result_count': result.length,
      });

      return result;
    });
  }
}
```

### 2. External Service Calls

```typescript
import { TracedHttpService } from './tracing/traced-http.service';

@Injectable()
export class ExternalApiService {
  constructor(private readonly tracedHttpService: TracedHttpService) {}

  async callExternalApi() {
    return this.tracedHttpService.get('https://api.example.com/data', {
      serviceName: 'example-api',
      operation: 'getData',
      includeRequestBody: false,
      includeResponseBody: true,
    });
  }
}
```

### 3. Database Operations

```typescript
import { TracedDatabaseService } from './tracing/traced-database.service';

@Injectable()
export class UserService {
  constructor(private readonly tracedDbService: TracedDatabaseService) {}

  async findUser(id: string) {
    return this.tracedDbService.query('SELECT * FROM users WHERE id = $1', [id], {
      table: 'users',
      operation: 'select',
      includeParams: true,
      includeResult: true,
    });
  }
}
```

### 4. Using Decorators

```typescript
import { Trace, TraceDatabase, TraceExternalService } from './tracing/tracing.decorators';

@Injectable()
export class MyService {
  @Trace({ name: 'custom-operation', includeArgs: true })
  async customMethod(arg1: string, arg2: number) {
    // Implementation
  }

  @TraceDatabase('select', 'users')
  async findUser(id: string) {
    // Database operation
  }

  @TraceExternalService('stripe', 'createPayment')
  async createPayment(amount: number) {
    // External service call
  }
}
```

## Configuration

### Tracing Configuration

The tracing system is configured through environment variables and the `TracingConfigService`:

```typescript
// src/tracing/tracing.config.ts
export interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  exporters: {
    jaeger?: { enabled: boolean; endpoint: string };
    zipkin?: { enabled: boolean; endpoint: string };
    otlp?: { enabled: boolean; endpoint: string };
  };
  sampling: {
    enabled: boolean;
    ratio: number;
  };
  attributes: Record<string, string>;
}
```

### Supported Instrumentations

- **HTTP Requests**: Automatic instrumentation of Express/Fastify
- **Database**: PostgreSQL query tracing
- **External APIs**: Axios HTTP client instrumentation
- **Blockchain**: Stellar network operations
- **Payment Processing**: Stripe API calls
- **Message Queues**: Redis operations
- **Logging**: Winston logger integration

## Monitoring and Alerting

### Grafana Dashboards

Pre-configured dashboards include:

- Request rate and response time
- Error rate monitoring
- Database query performance
- External service health
- Blockchain transaction monitoring
- Payment processing metrics

### Prometheus Alerts

Configured alerts for:

- High error rates (>5%)
- Slow response times (>2s)
- Database query issues (>1s)
- External service failures
- Memory usage spikes
- Blockchain transaction failures
- Payment processing issues

## Performance Considerations

### Sampling

Configure sampling to balance observability with performance:

```env
TRACING_SAMPLING_ENABLED=true
TRACING_SAMPLING_RATIO=0.1  # 10% sampling rate
```

### Resource Limits

The OpenTelemetry Collector includes memory limits and batch processing:

```yaml
processors:
  memory_limiter:
    limit_mib: 512
    spike_limit_mib: 128
  batch:
    timeout: 1s
    send_batch_size: 1024
```

## Security

### Data Privacy

Sensitive data is automatically filtered:

- Authorization headers are redacted
- Database parameters are masked
- Payment card numbers are hidden

### Network Security

- All internal communication uses Docker networks
- No external ports exposed except for UIs
- TLS configuration available for production

## Troubleshooting

### Common Issues

1. **Tracing not appearing in Jaeger**
   - Check if `TRACING_ENABLED=true`
   - Verify OTLP endpoint is accessible
   - Check sampling ratio settings

2. **High memory usage**
   - Reduce sampling ratio
   - Increase batch processing intervals
   - Check for memory leaks in instrumentations

3. **Missing traces for specific operations**
   - Verify instrumentation is enabled
   - Check if spans are properly created
   - Ensure trace context propagation

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
TRACING_DEBUG=true
```

## Production Deployment

### Environment Variables

```env
TRACING_ENABLED=true
TRACING_SERVICE_NAME=strellerminds-backend
TRACING_SERVICE_VERSION=1.0.0
TRACING_SAMPLING_RATIO=0.05  # 5% in production
TRACING_OTLP_ENDPOINT=https://your-otel-collector:4318/v1/traces
```

### Kubernetes Deployment

The tracing infrastructure can be deployed to Kubernetes using the provided manifests in `src/k8s/`.

## Contributing

When adding new services or external integrations:

1. Add tracing instrumentation using the provided decorators
2. Update Grafana dashboards if new metrics are added
3. Add appropriate alert rules for new services
4. Update this documentation

## References

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
