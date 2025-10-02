# Error Handling Standardization

## Overview

This document describes the standardized error handling implementation across the StrellerMinds application. The implementation provides consistent error responses, correlation ID tracking, structured logging, monitoring dashboards, and automatic alerting for critical failures.

## 1. Standardized Error Response Format

All API errors follow a consistent response format:

```json
{
  "errorCode": "INTERNAL_ERROR",
  "statusCode": 500,
  "message": "An internal server error occurred",
  "timestamp": "2023-01-01T12:00:00.000Z",
  "path": "/api/users",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "stack": "Error stack trace (development only)"
}
```

### Error Response Fields

- `errorCode`: Application-specific error code (enum)
- `statusCode`: HTTP status code
- `message`: Human-readable error message
- `timestamp`: ISO 8607 timestamp of when the error occurred
- `path`: Request path that caused the error
- `correlationId`: Unique identifier for request tracking
- `stack`: Error stack trace (development environment only)

## 2. Error Correlation ID Tracking

Every request is assigned a unique correlation ID for end-to-end tracking:

- Generated automatically if not provided in request headers
- Passed through all services and logged consistently
- Included in response headers (`X-Correlation-ID`)
- Used for debugging and tracing request flows

## 3. Structured Logging

All errors are logged with rich context using Winston logger:

### Log Context Information

- Correlation ID
- User ID and email (if authenticated)
- HTTP method and URL
- IP address and user agent
- Request ID
- Referer and content type
- Error code and category
- Stack trace (for unhandled exceptions)

### Log Levels

- `debug`: Debug information
- `info`: General information
- `warn`: Warning conditions
- `error`: Error conditions
- `fatal`: Critical system errors

## 4. Error Categorization

Errors are categorized for better tracking and reporting:

| Category       | Error Codes                                                                 | Description                               |
| -------------- | --------------------------------------------------------------------------- | ----------------------------------------- |
| AUTHENTICATION | UNAUTHORIZED, INVALID_CREDENTIALS, TOKEN_EXPIRED, FORBIDDEN                 | Authentication and authorization failures |
| RESOURCE       | NOT_FOUND, ALREADY_EXISTS, CONFLICT                                         | Resource-related errors                   |
| VALIDATION     | INVALID_INPUT, MISSING_REQUIRED_FIELD, INVALID_FORMAT                       | Input validation failures                 |
| BUSINESS_LOGIC | INSUFFICIENT_FUNDS, PAYMENT_FAILED, COURSE_NOT_AVAILABLE, ENROLLMENT_CLOSED | Business rule violations                  |
| SYSTEM         | INTERNAL_ERROR, SERVICE_UNAVAILABLE, DATABASE_ERROR, EXTERNAL_SERVICE_ERROR | System-level failures                     |

## 5. Error Monitoring Dashboard

The error dashboard provides real-time visibility into application errors:

### API Endpoints

- `GET /error-dashboard/summary` - Error summary statistics
- `GET /error-dashboard/trends` - Error trends over time
- `GET /error-dashboard/top-errors` - Most frequent errors
- `GET /error-dashboard/error-details?correlationId={id}` - Detailed error information
- `GET /error-dashboard/alert-history` - Alert history

### Dashboard Features

- Real-time error statistics
- Error rate tracking
- Trend analysis
- Top error identification
- Detailed error investigation
- Alert history

## 6. Automatic Error Alerting

The system provides automatic alerting for critical failures:

### Alert Types

1. **Critical Error Alerts**: Immediate notification for system-level errors
2. **High Error Rate Alerts**: Notification when error rates exceed thresholds
3. **Categorized Error Alerts**: Category-specific alerting with configurable thresholds
4. **Slow Response Alerts**: Notification for performance degradation

### Alert Channels

- Slack notifications
- Webhook delivery
- Email notifications (configurable)

### Alert Configuration

Environment variables for alert configuration:

```bash
# Alerting Configuration
ALERTING_ENABLED=true
SLACK_ALERTS_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_ALERT_CHANNEL=#alerts
WEBHOOK_ALERTS_ENABLED=true
WEBHOOK_ALERT_URL=https://your-webhook-url.com/alerts
EMAIL_ALERTS_ENABLED=false
EMAIL_ALERT_RECIPIENTS=admin@example.com

# Alert Thresholds
ERROR_RATE_THRESHOLD=0.05
RESPONSE_TIME_THRESHOLD=5000
CATEGORY_ERROR_THRESHOLDS={"AUTHENTICATION":{"rate":0.1,"severity":"high"},"VALIDATION":{"rate":0.05,"severity":"medium"}}

# Alert Rate Limiting
ALERT_RATE_LIMITING_ENABLED=true
MAX_ALERTS_PER_HOUR=10
ALERT_COOLDOWN_MINUTES=5
```

## 7. Implementation Details

### Global Exception Filter

The `GlobalExceptionsFilter` handles all application exceptions:

- Standardizes error responses
- Provides correlation ID tracking
- Logs errors with rich context
- Sends alerts for critical failures
- Integrates with error dashboard

### Error Dashboard Service

The `ErrorDashboardService` provides error monitoring capabilities:

- In-memory storage for demonstration (should use persistent storage in production)
- Error statistics and trends
- Detailed error investigation
- Alert history tracking

### Alerting Service

The `AlertingService` handles automatic error alerting:

- Configurable alert thresholds
- Multiple notification channels
- Alert rate limiting
- Category-based alerting

## 8. Integration Points

### Middleware

- `CorrelationIdMiddleware`: Generates and tracks correlation IDs
- `EnhancedLoggingMiddleware`: Provides request/response logging

### Services

- `LoggerService`: Structured logging implementation
- `SentryService`: Error tracking integration
- `ErrorDashboardService`: Error monitoring and dashboard

## 9. Testing

Error handling is tested through:

- Unit tests for exception filter
- Integration tests for error scenarios
- End-to-end tests for API error responses

## 10. Best Practices

### Error Handling Guidelines

1. Use appropriate HTTP status codes
2. Provide meaningful error messages
3. Include correlation IDs in all error responses
4. Log errors with sufficient context
5. Avoid exposing sensitive information in error messages
6. Implement proper error categorization
7. Set appropriate alert thresholds
8. Monitor error trends regularly

### Logging Best Practices

1. Use structured logging with consistent fields
2. Include correlation IDs for request tracking
3. Log at appropriate levels
4. Include relevant context information
5. Sanitize sensitive data in logs
6. Use consistent timestamp formats

## 11. Configuration

### Environment Variables

```bash
# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_ENABLED=true
LOG_FILE_PATH=logs/app-%DATE%.log
LOG_CONSOLE_ENABLED=true
LOG_CONSOLE_COLORIZE=true
LOG_ERROR_FILE_ENABLED=true
LOG_ERROR_FILE_PATH=logs/error-%DATE%.log

# Error Dashboard Configuration
ERROR_DASHBOARD_ENABLED=true

# Sentry Configuration (if used)
SENTRY_DSN=your-sentry-dsn
SENTRY_ENVIRONMENT=production
```

## 12. Monitoring and Observability

### Metrics

- Error rates by category
- Response time percentiles
- System health indicators
- Resource utilization

### Tracing

- Request correlation across services
- Performance bottleneck identification
- Error propagation tracking

### Alerting

- Real-time failure detection
- Performance degradation alerts
- System health notifications

## 13. Security Considerations

- Error messages do not expose sensitive information
- Stack traces only shown in development environment
- Proper sanitization of logged data
- Secure transmission of alert notifications
