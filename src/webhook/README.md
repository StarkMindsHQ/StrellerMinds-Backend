# Webhook Security System

This module provides comprehensive security for webhook endpoints in the StrellerMinds Backend application.

## Features

### 🔐 Signature Validation
- **Stripe**: Uses Stripe's webhook signature verification with timestamp validation
- **PayPal**: Implements PayPal webhook signature verification
- **Zoom**: Validates Zoom webhook signatures with HMAC-SHA256
- **Custom**: Generic HMAC-SHA256 signature validation for custom webhooks

### 🛡️ Replay Protection
- Prevents duplicate webhook processing
- Configurable time window (default: 5 minutes)
- Memory-based event tracking with automatic cleanup

### ⚡ Rate Limiting
- Per-provider rate limiting
- Configurable limits per time window
- IP-based identification

### 📊 Logging & Monitoring
- Comprehensive webhook event logging
- Performance metrics tracking
- Error pattern analysis
- Health monitoring dashboard

## Architecture

```
src/webhook/
├── controllers/
│   └── webhook-monitoring.controller.ts    # Admin monitoring endpoints
├── decorators/
│   └── webhook-provider.decorator.ts        # Provider specification decorator
├── entities/
│   └── webhook-log.entity.ts               # Database entity for logs
├── guards/
│   └── webhook-auth.guard.ts               # Authentication guard
├── interfaces/
│   └── webhook.interfaces.ts               # Type definitions
├── middleware/
│   └── webhook-raw-body.middleware.ts      # Raw body capture
├── services/
│   ├── webhook-security.service.ts          # Core security logic
│   └── webhook-logging.service.ts          # Logging and monitoring
└── webhook.module.ts                       # Module configuration
```

## Usage

### 1. Enable Webhook Security

Add the `WebhookAuthGuard` and `SetWebhookProvider` decorator to your webhook endpoints:

```typescript
import { WebhookAuthGuard } from '../webhook/guards/webhook-auth.guard';
import { SetWebhookProvider } from '../webhook/decorators/webhook-provider.decorator';
import { WebhookProvider } from '../webhook/interfaces/webhook.interfaces';

@Controller('webhooks')
export class MyWebhookController {
  @Post('stripe')
  @UseGuards(WebhookAuthGuard)
  @SetWebhookProvider(WebhookProvider.STRIPE)
  async handleStripeWebhook(@Req() request: any) {
    const event = request.webhookPayload;
    // Process webhook event
  }
}
```

### 2. Configure Environment Variables

Add these to your `.env` file:

```bash
# Stripe Webhook
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# PayPal Webhook
PAYPAL_WEBHOOK_SECRET=your_paypal_webhook_secret

# Zoom Webhook
ZOOM_WEBHOOK_SECRET=your_zoom_webhook_secret

# Custom Webhook
CUSTOM_WEBHOOK_SECRET=your_custom_webhook_secret
```

### 3. Run Database Migration

```bash
npm run migration:run
```

## Monitoring Endpoints

### Get Webhook Logs
```http
GET /admin/webhooks/logs?provider=stripe&status=failed&limit=50
```

### Get Statistics
```http
GET /admin/webhooks/statistics?timeRange=day
```

### Get Error Patterns
```http
GET /admin/webhooks/errors?limit=10
```

### Health Check
```http
GET /admin/webhooks/health
```

### Test Security Configuration
```http
GET /admin/webhooks/test-security?provider=stripe
```

## Security Configuration

### Provider-specific Settings

Each webhook provider can be configured with:

```typescript
{
  signature: {
    secret: string,
    algorithm: string,
    headerName: string,
    timestampHeader?: string
  },
  rateLimit: {
    windowMs: number,
    maxRequests: number
  },
  replayProtection: {
    enabled: boolean,
    windowMs: number,
    maxDuplicates: number
  },
  logging: {
    enabled: boolean,
    includePayload: boolean,
    includeHeaders: boolean,
    retentionDays: number
  }
}
```

### Default Configurations

- **Stripe**: 100 requests/minute, 5-minute replay window
- **PayPal**: 50 requests/minute, 5-minute replay window
- **Zoom**: 200 requests/minute, 5-minute replay window
- **Custom**: 100 requests/minute, 5-minute replay window

## Security Best Practices

### 1. Signature Verification
- Always verify webhook signatures before processing
- Reject webhooks with invalid signatures
- Log signature verification failures

### 2. Replay Protection
- Enable replay protection for all webhook endpoints
- Configure appropriate time windows
- Monitor for replay attack attempts

### 3. Rate Limiting
- Set appropriate rate limits per provider
- Monitor rate limit violations
- Implement exponential backoff for retries

### 4. Logging
- Log all webhook events (success and failures)
- Include relevant metadata (IP, user agent, headers)
- Set appropriate log retention policies

### 5. Error Handling
- Implement proper error handling for webhook processing
- Return appropriate HTTP status codes
- Provide meaningful error messages for debugging

## Troubleshooting

### Common Issues

1. **Invalid Signature Errors**
   - Check webhook secret configuration
   - Verify raw body is being captured
   - Ensure timestamp is within acceptable range

2. **Rate Limit Exceeded**
   - Check rate limit configuration
   - Monitor webhook frequency
   - Implement proper retry logic

3. **Replay Attack Detection**
   - Verify event ID extraction
   - Check replay protection window
   - Monitor duplicate event patterns

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

This will provide detailed information about webhook processing, including:
- Signature verification steps
- Rate limiting decisions
- Replay protection checks
- Performance metrics

## Performance Considerations

### Memory Usage
- Replay protection uses in-memory storage
- Automatic cleanup of old events
- Consider Redis for distributed deployments

### Database Performance
- Indexed queries for log retrieval
- Configurable log retention
- Batch cleanup operations

### Network Latency
- Signature verification is CPU-intensive
- Consider caching for frequently used secrets
- Monitor webhook processing times

## Testing

### Unit Tests
```bash
npm run test -- --testPathPattern=webhook
```

### Integration Tests
```bash
npm run test:integration -- --testPathPattern=webhook
```

### Security Tests
```bash
npm run security:scan
```

## Deployment

### Environment Variables
Ensure all required environment variables are set in production:
- Webhook secrets
- Rate limiting configurations
- Logging settings

### Database Migration
Run migrations before deploying:
```bash
npm run migration:run
```

### Monitoring
Set up monitoring for:
- Webhook processing success rates
- Signature verification failures
- Rate limit violations
- Error patterns

## Support

For issues or questions about the webhook security system:

1. Check the troubleshooting section
2. Review the application logs
3. Monitor the health endpoint
4. Contact the development team

## Security Updates

This module follows security best practices and is regularly updated to address:
- New vulnerability disclosures
- Provider-specific security updates
- Performance optimizations
- Feature enhancements
