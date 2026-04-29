# Webhook Integration Guide

This step-by-step guide will help you integrate webhooks into your StrellerMinds Backend application.

## Quick Start

### Prerequisites
- Node.js 16+ installed
- StrellerMinds Backend repository cloned
- Access to third-party service dashboards (Stripe, PayPal, Zoom)

### Integration Time
- **Setup**: 15 minutes
- **Configuration**: 10 minutes
- **Testing**: 15 minutes
- **Total**: ~40 minutes

---

## Step 1: Environment Setup

### 1.1 Install Dependencies
```bash
npm install
```

### 1.2 Environment Variables
Copy the example environment file and configure your webhook secrets:

```bash
cp .env.example .env
```

Add the following variables to your `.env` file:

```bash
# Stripe Webhook Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# PayPal Webhook Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id

# Zoom Webhook Configuration
ZOOM_API_KEY=your_zoom_api_key
ZOOM_API_SECRET=your_zoom_api_secret
ZOOM_WEBHOOK_SECRET=your_zoom_webhook_secret

# Webhook Security
WEBHOOK_TIMEOUT=30000
WEBHOOK_RETRY_ATTEMPTS=3
```

### 1.3 Start Development Server
```bash
npm run start:dev
```

---

## Step 2: Webhook URL Configuration

### 2.1 Local Development with ngrok
For local development, expose your server to the internet using ngrok:

```bash
# Install ngrok (if not already installed)
npm install -g ngrok

# Start ngrok
ngrok http 3000

# Copy the HTTPS URL from ngrok output
# Example: https://abc123.ngrok.io
```

### 2.2 Production URLs
For production, use your actual domain:
- Stripe: `https://api.strellerminds.com/webhooks/stripe`
- PayPal: `https://api.strellerminds.com/webhooks/paypal`
- Zoom: `https://api.strellerminds.com/webhooks/zoom`

---

## Step 3: Service Configuration

### 3.1 Stripe Webhook Setup

1. **Login to Stripe Dashboard**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
   - Select your test mode account

2. **Add Webhook Endpoint**
   ```
   Endpoint URL: https://abc123.ngrok.io/webhooks/stripe
   HTTP method: POST
   ```

3. **Select Events**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.deleted`

4. **Copy Webhook Secret**
   - Click on the webhook endpoint
   - Copy the "Signing secret" starting with `whsec_`
   - Add it to your `.env` file

### 3.2 PayPal Webhook Setup

1. **Login to PayPal Developer Dashboard**
   - Go to [PayPal Developer](https://developer.paypal.com/dashboard/)
   - Select your sandbox account

2. **Create Webhook**
   ```
   Webhook URL: https://abc123.ngrok.io/webhooks/paypal
   ```

3. **Select Events**
   - `PAYMENT.SALE.COMPLETED`
   - `PAYMENT.SALE.DENIED`
   - `BILLING.SUBSCRIPTION.CREATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`

4. **Copy Webhook ID**
   - Note the webhook ID from the dashboard
   - Add it to your `.env` file

### 3.3 Zoom Webhook Setup

1. **Login to Zoom Marketplace**
   - Go to [Zoom Marketplace](https://marketplace.zoom.us/)
   - Create or select your app

2. **Configure Event Subscriptions**
   ```
   Event notification endpoint URL: https://abc123.ngrok.io/webhooks/zoom
   ```

3. **Select Events**
   - `Meeting Started`
   - `Meeting Ended`
   - `Recording Completed`

4. **Copy Secret Token**
   - Get the "Secret Token" from the event subscription settings
   - Add it to your `.env` file

---

## Step 4: Custom Event Handlers

### 4.1 Create Event Handler Service

Create a new service to handle webhook events:

```typescript
// src/webhook/webhook-event-handler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Stripe } from 'stripe';

@Injectable()
export class WebhookEventHandlerService {
  private readonly logger = new Logger(WebhookEventHandlerService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly subscriptionService: SubscriptionService,
    private readonly notificationService: NotificationService,
  ) {}

  // Stripe Event Handlers
  async handleStripeEvent(event: Stripe.Event) {
    this.logger.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoiceSucceeded(event);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoiceFailed(event);
        break;
      default:
        this.logger.log(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async handlePaymentSucceeded(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    // Activate user subscription
    await this.subscriptionService.activateSubscription(
      paymentIntent.metadata.userId,
      paymentIntent.amount
    );

    // Send confirmation email
    await this.emailService.sendPaymentConfirmation(
      paymentIntent.metadata.userEmail,
      paymentIntent.amount
    );

    this.logger.log(`Payment succeeded for user: ${paymentIntent.metadata.userId}`);
  }

  private async handlePaymentFailed(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    // Notify user of failed payment
    await this.notificationService.sendPaymentFailedNotification(
      paymentIntent.metadata.userId
    );

    this.logger.log(`Payment failed for user: ${paymentIntent.metadata.userId}`);
  }

  // PayPal Event Handlers
  async handlePayPalEvent(event: any) {
    this.logger.log(`Processing PayPal event: ${event.event_type}`);

    switch (event.event_type) {
      case 'PAYMENT.SALE.COMPLETED':
        await this.handlePayPalPaymentCompleted(event);
        break;
      case 'BILLING.SUBSCRIPTION.CREATED':
        await this.handlePayPalSubscriptionCreated(event);
        break;
      default:
        this.logger.log(`Unhandled PayPal event: ${event.event_type}`);
    }
  }

  private async handlePayPalPaymentCompleted(event: any) {
    const sale = event.resource;
    
    // Process PayPal payment completion
    await this.subscriptionService.activatePayPalSubscription(
      sale.custom_id,
      sale.amount.total
    );

    this.logger.log(`PayPal payment completed: ${sale.id}`);
  }

  // Zoom Event Handlers
  async handleZoomEvent(event: any) {
    this.logger.log(`Processing Zoom event: ${event.event}`);

    switch (event.event) {
      case 'meeting.started':
        await this.handleMeetingStarted(event);
        break;
      case 'meeting.ended':
        await this.handleMeetingEnded(event);
        break;
      default:
        this.logger.log(`Unhandled Zoom event: ${event.event}`);
    }
  }

  private async handleMeetingStarted(event: any) {
    const meeting = event.payload.object;
    
    // Update meeting status in database
    await this.meetingService.updateMeetingStatus(meeting.id, 'started');

    this.logger.log(`Meeting started: ${meeting.id}`);
  }
}
```

### 4.2 Update Webhook Controller

Update your webhook controller to use the new event handler:

```typescript
// src/webhook/webhook.controller.ts
import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhookEventHandlerService } from './webhook-event-handler.service';
import { WebhookVerificationService } from './webhook-verification.service';

@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly eventHandler: WebhookEventHandlerService,
    private readonly verification: WebhookVerificationService,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Body() payload: any,
    @Headers('stripe-signature') signature: string,
  ) {
    // Verify webhook signature
    if (!this.verification.verifyStripe(payload, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Process event
    await this.eventHandler.handleStripeEvent(payload);

    return { received: true };
  }

  @Post('paypal')
  @HttpCode(HttpStatus.OK)
  async handlePayPalWebhook(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    // Verify webhook signature
    if (!this.verification.verifyPayPal(payload, headers)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Process event
    await this.eventHandler.handlePayPalEvent(payload);

    return { received: true };
  }

  @Post('zoom')
  @HttpCode(HttpStatus.OK)
  async handleZoomWebhook(
    @Body() payload: any,
    @Headers('x-zm-signature') signature: string,
    @Headers('x-zm-request-timestamp') timestamp: string,
  ) {
    // Verify webhook signature
    if (!this.verification.verifyZoom(payload, signature, timestamp)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Process event
    await this.eventHandler.handleZoomEvent(payload);

    return { received: true };
  }
}
```

---

## Step 5: Testing

### 5.1 Test with Service CLI Tools

#### Stripe CLI Testing
```bash
# Install Stripe CLI
npm install -g stripe

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger invoice.payment_failed
```

#### PayPal Sandbox Testing
1. Use PayPal's sandbox environment to create test transactions
2. Monitor webhook events in your application logs

#### Zoom Webhook Testing
1. Use Zoom's webhook sample payloads
2. Test with curl:

```bash
curl -X POST http://localhost:3000/webhooks/zoom \
  -H "Content-Type: application/json" \
  -H "x-zm-signature: test_signature" \
  -H "x-zm-request-timestamp: $(date +%s)" \
  -d '{
    "event": "meeting.started",
    "payload": {
      "object": {
        "id": "123456789",
        "topic": "Test Meeting"
      }
    }
  }'
```

### 5.2 Automated Testing

Create unit tests for your webhook handlers:

```typescript
// test/webhook/webhook-event-handler.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { WebhookEventHandlerService } from '../src/webhook/webhook-event-handler.service';

describe('WebhookEventHandlerService', () => {
  let service: WebhookEventHandlerService;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockSubscriptionService: jest.Mocked<SubscriptionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookEventHandlerService,
        {
          provide: EmailService,
          useValue: {
            sendPaymentConfirmation: jest.fn(),
          },
        },
        {
          provide: SubscriptionService,
          useValue: {
            activateSubscription: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookEventHandlerService>(WebhookEventHandlerService);
    mockEmailService = module.get(EmailService);
    mockSubscriptionService = module.get(SubscriptionService);
  });

  describe('handleStripeEvent', () => {
    it('should process payment_intent.succeeded event', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            amount: 2000,
            metadata: {
              userId: 'user123',
              userEmail: 'test@example.com',
            },
          },
        },
      };

      await service.handleStripeEvent(mockEvent);

      expect(mockSubscriptionService.activateSubscription).toHaveBeenCalledWith(
        'user123',
        2000
      );
      expect(mockEmailService.sendPaymentConfirmation).toHaveBeenCalledWith(
        'test@example.com',
        2000
      );
    });
  });
});
```

---

## Step 6: Deployment

### 6.1 Production Environment Setup

1. **Update Environment Variables**
   ```bash
   # Production webhook URLs
   STRIPE_WEBHOOK_SECRET=whsec_live_your_production_secret
   PAYPAL_WEBHOOK_ID=your_production_webhook_id
   ZOOM_WEBHOOK_SECRET=your_production_secret
   ```

2. **Update Service Dashboards**
   - Change webhook URLs to production endpoints
   - Test with production credentials
   - Enable all required events

3. **Deploy Application**
   ```bash
   # Deploy to your production environment
   npm run build
   npm run start:prod
   ```

### 6.2 Monitoring Setup

Set up monitoring for webhook health:

```typescript
// src/webhook/webhook-monitoring.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class WebhookMonitoringService {
  private readonly logger = new Logger(WebhookMonitoringService.name);

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkWebhookHealth() {
    // Check webhook processing health
    const stats = await this.getWebhookStats();
    
    if (stats.errorRate > 0.1) { // 10% error rate threshold
      this.logger.warn(`High webhook error rate: ${stats.errorRate}`);
      await this.sendAlert('High webhook error rate detected');
    }
  }

  private async getWebhookStats() {
    // Implementation to get webhook statistics
    return {
      totalProcessed: 1000,
      successful: 950,
      failed: 50,
      errorRate: 0.05,
    };
  }

  private async sendAlert(message: string) {
    // Send alert to monitoring system
    this.logger.error(`Webhook Alert: ${message}`);
  }
}
```

---

## Step 7: Security Best Practices

### 7.1 Signature Verification
Always verify webhook signatures before processing:

```typescript
// src/webhook/webhook-verification.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import crypto from 'crypto';

@Injectable()
export class WebhookVerificationService {
  constructor(private readonly configService: ConfigService) {}

  verifyStripe(payload: string, signature: string): boolean {
    try {
      const stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'));
      stripe.webhooks.constructEvent(
        payload,
        signature,
        this.configService.get('STRIPE_WEBHOOK_SECRET')
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  verifyZoom(payload: string, signature: string, timestamp: string): boolean {
    const secret = this.configService.get('ZOOM_WEBHOOK_SECRET');
    const message = `${timestamp}${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}
```

### 7.2 Rate Limiting
Implement rate limiting for webhook endpoints:

```typescript
// src/webhook/webhook-rate-limit.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class WebhookRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientIp = request.ip;
    
    // Implement rate limiting logic
    // Allow 100 requests per minute per IP
    return this.checkRateLimit(clientIp);
  }

  private checkRateLimit(ip: string): boolean {
    // Implementation of rate limiting
    return true;
  }
}
```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Webhook Not Received
**Symptoms**: No webhook events in logs
**Solutions**:
- Check ngrok is running and URL is correct
- Verify firewall settings
- Check service dashboard webhook configuration
- Test with webhook testing tools

#### 2. Signature Verification Failed
**Symptoms**: 401 Unauthorized responses
**Solutions**:
- Verify webhook secret is correct
- Check payload is not modified
- Ensure timestamp is recent (within 5 minutes)
- Verify correct verification algorithm

#### 3. Event Processing Failed
**Symptoms**: 500 Internal Server Error
**Solutions**:
- Check application logs for error details
- Verify database connectivity
- Check business logic implementation
- Test with sample event payloads

#### 4. Performance Issues
**Symptoms**: Slow webhook processing
**Solutions**:
- Implement async processing
- Add database connection pooling
- Monitor webhook processing times
- Consider queue-based processing

### Debugging Tools

#### Webhook Debug Endpoint
```typescript
@Post('debug')
async debugWebhook(@Body() payload: any, @Headers() headers: any) {
  return {
    timestamp: new Date().toISOString(),
    headers,
    payload,
    processed: false,
  };
}
```

#### Logging Enhancement
```typescript
// Enhanced logging for debugging
this.logger.log(`Webhook received: ${provider} - ${eventType}`);
this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
this.logger.debug(`Payload: ${JSON.stringify(payload)}`);
```

---

## Checklist

### Pre-Deployment Checklist
- [ ] All webhook secrets are configured
- [ ] Signature verification is implemented
- [ ] Rate limiting is configured
- [ ] Error handling is implemented
- [ ] Logging is configured
- [ ] Tests are passing
- [ ] Monitoring is set up

### Post-Deployment Checklist
- [ ] Webhook endpoints are accessible
- [ ] Events are being received
- [ ] Processing is working correctly
- [ ] Error rates are within acceptable limits
- [ ] Monitoring alerts are configured
- [ ] Documentation is updated

---

## Support Resources

### Documentation
- [Main Webhook Documentation](./WEBHOOK_DOCUMENTATION.md)
- [API Specification](../api-specification.yaml)
- [SDK Documentation](./SDK_DOCUMENTATION.md)

### External Resources
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [PayPal Webhooks Documentation](https://developer.paypal.com/docs/api-basics/webhooks/)
- [Zoom Webhooks Guide](https://developers.zoom.us/docs/webhooks/)

### Community Support
- [GitHub Issues](https://github.com/StarkMindsHQ/StrellerMinds-Backend/issues)
- [Discord Community](https://discord.gg/strellerminds)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/strellerminds)

---

*Last updated: January 2024*
