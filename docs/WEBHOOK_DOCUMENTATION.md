# Webhook Documentation

This document provides comprehensive documentation for webhook events and integration guides for the StrellerMinds Backend platform.

## Table of Contents

1. [Overview](#overview)
2. [Supported Webhook Providers](#supported-webhook-providers)
3. [Webhook Endpoints](#webhook-endpoints)
4. [Event Types](#event-types)
5. [Security](#security)
6. [Integration Guide](#integration-guide)
7. [Error Handling](#error-handling)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The StrellerMinds Backend platform supports webhooks from various third-party services to enable real-time event processing and automation. Webhooks allow external services to send notifications to our platform when specific events occur.

### Key Features

- **Real-time Event Processing**: Instant handling of webhook events
- **Secure Verification**: Signature validation for all incoming webhooks
- **Flexible Routing**: Support for multiple webhook providers
- **Error Handling**: Comprehensive error handling and retry mechanisms
- **Monitoring**: Built-in logging and monitoring capabilities

---

## Supported Webhook Providers

### 1. Stripe
- **Purpose**: Payment processing and subscription management
- **Endpoint**: `/webhooks/stripe`
- **Events**: Payment events, subscription events, customer events

### 2. PayPal
- **Purpose**: Alternative payment processing
- **Endpoint**: `/webhooks/paypal`
- **Events**: Payment events, billing events, dispute events

### 3. Zoom
- **Purpose**: Video conferencing integration
- **Endpoint**: `/webhooks/zoom`
- **Events**: Meeting events, participant events, recording events

---

## Webhook Endpoints

### Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://api.strellerminds.com`

### Stripe Webhook Endpoint
```
POST /webhooks/stripe
```

**Headers:**
- `stripe-signature`: Required for signature verification
- `Content-Type`: `application/json`

**Response:**
- `200 OK`: Webhook processed successfully
- `400 Bad Request`: Invalid webhook signature
- `401 Unauthorized`: Unauthorized webhook

### PayPal Webhook Endpoint
```
POST /webhooks/paypal
```

**Headers:**
- `PayPal-Auth-Algo`: PayPal authentication algorithm
- `PayPal-Transmission-ID`: Unique transmission ID
- `PayPal-Cert-ID`: PayPal certificate ID
- `PayPal-Timestamp`: Request timestamp
- `PayPal-Transmission-Sig`: Transmission signature
- `Content-Type`: `application/json`

**Response:**
- `200 OK`: Webhook processed successfully
- `400 Bad Request`: Invalid webhook signature
- `401 Unauthorized`: Unauthorized webhook

### Zoom Webhook Endpoint
```
POST /webhooks/zoom
```

**Headers:**
- `x-zm-signature`: Required for signature verification
- `x-zm-request-timestamp`: Request timestamp
- `x-zm-token`: Authorization token
- `Content-Type`: `application/json`

**Response:**
- `200 OK`: Webhook processed successfully
- `400 Bad Request`: Invalid webhook signature
- `401 Unauthorized`: Unauthorized webhook

---

## Event Types

### Stripe Events

#### Payment Events
- `payment_intent.succeeded`: Payment completed successfully
- `payment_intent.payment_failed`: Payment failed
- `payment_intent.canceled`: Payment was canceled
- `charge.succeeded`: Charge completed successfully
- `charge.failed`: Charge failed

#### Subscription Events
- `customer.subscription.created`: New subscription created
- `customer.subscription.updated`: Subscription updated
- `customer.subscription.deleted`: Subscription canceled
- `invoice.payment_succeeded`: Invoice paid successfully
- `invoice.payment_failed`: Invoice payment failed

#### Customer Events
- `customer.created`: New customer created
- `customer.updated`: Customer information updated
- `customer.deleted`: Customer account deleted

### PayPal Events

#### Payment Events
- `PAYMENT.SALE.COMPLETED`: Payment completed
- `PAYMENT.SALE.DENIED`: Payment denied
- `PAYMENT.SALE.REFUNDED`: Payment refunded
- `PAYMENT.SALE.REVERSED`: Payment reversed

#### Billing Events
- `BILLING.SUBSCRIPTION.CREATED`: Subscription created
- `BILLING.SUBSCRIPTION.ACTIVATED`: Subscription activated
- `BILLING.SUBSCRIPTION.CANCELLED`: Subscription cancelled
- `BILLING.SUBSCRIPTION.SUSPENDED`: Subscription suspended

#### Dispute Events
- `CUSTOMER.DISPUTE.CREATED`: Dispute created
- `CUSTOMER.DISPUTE.RESOLVED`: Dispute resolved

### Zoom Events

#### Meeting Events
- `meeting.started`: Meeting started
- `meeting.ended`: Meeting ended
- `meeting.deleted`: Meeting deleted
- `meeting.updated`: Meeting updated

#### Participant Events
- `participant.joined`: Participant joined meeting
- `participant.left`: Participant left meeting

#### Recording Events
- `recording.completed`: Recording completed
- `recording.transcript.completed`: Transcript completed

---

## Security

### Signature Verification

All webhook endpoints implement signature verification to ensure the authenticity of incoming requests:

#### Stripe Verification
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function verifyStripeWebhook(payload: string, signature: string): boolean {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return true;
  } catch (error) {
    console.error('Stripe webhook verification failed:', error);
    return false;
  }
}
```

#### PayPal Verification
```typescript
import crypto from 'crypto';

function verifyPayPalWebhook(
  payload: string,
  headers: Record<string, string>
): boolean {
  const authAlgo = headers['paypal-auth-algo'];
  const transmissionId = headers['paypal-transmission-id'];
  const certId = headers['paypal-cert-id'];
  const timestamp = headers['paypal-timestamp'];
  const transmissionSig = headers['paypal-transmission-sig'];

  // Implementation of PayPal webhook verification
  // This would involve validating against PayPal's public certificates
  return true; // Simplified for documentation
}
```

#### Zoom Verification
```typescript
import crypto from 'crypto';

function verifyZoomWebhook(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
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
```

### Rate Limiting

Webhook endpoints are protected by rate limiting to prevent abuse:
- **Stripe**: 100 requests per minute
- **PayPal**: 100 requests per minute
- **Zoom**: 100 requests per minute

### IP Whitelisting

For enhanced security, consider implementing IP whitelisting:
- **Stripe**: Check [Stripe IP ranges](https://stripe.com/docs/ips)
- **PayPal**: Check [PayPal IP ranges](https://developer.paypal.com/docs/api-basics/)
- **Zoom**: Check [Zoom IP ranges](https://support.zoom.us/hc/en-us/articles/201362683-Network-firewall-or-proxy-server-settings-for-Zoom)

---

## Integration Guide

### Step 1: Environment Configuration

Set up the required environment variables:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_WEBHOOK_ID=your_webhook_id

# Zoom Configuration
ZOOM_API_KEY=your_zoom_api_key
ZOOM_API_SECRET=your_zoom_api_secret
ZOOM_WEBHOOK_SECRET=your_webhook_secret
```

### Step 2: Webhook URL Configuration

Configure webhook URLs in your respective service dashboards:

#### Stripe
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://api.strellerminds.com/webhooks/stripe`
3. Select events to listen for
4. Copy the webhook signing secret

#### PayPal
1. Go to PayPal Developer Dashboard → Webhooks
2. Add endpoint: `https://api.strellerminds.com/webhooks/paypal`
3. Select events to listen for
4. Copy the webhook ID

#### Zoom
1. Go to Zoom Marketplace → App configuration
2. Add endpoint: `https://api.strellerminds.com/webhooks/zoom`
3. Select events to listen for
4. Copy the webhook secret token

### Step 3: Event Handler Implementation

Create custom event handlers for your specific use cases:

```typescript
// Example Stripe event handler
export class StripeEventHandler {
  async handlePaymentIntentSucceeded(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    // Update user subscription
    await this.subscriptionService.activateSubscription(
      paymentIntent.metadata.userId,
      paymentIntent.amount
    );
    
    // Send confirmation email
    await this.emailService.sendPaymentConfirmation(
      paymentIntent.metadata.userEmail
    );
  }

  async handleInvoicePaymentFailed(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    
    // Notify user of failed payment
    await this.notificationService.notifyPaymentFailed(
      invoice.customer as string
    );
    
    // Schedule retry attempt
    await this.paymentService.scheduleRetry(invoice.id);
  }
}
```

### Step 4: Testing Webhooks

Use the following methods to test your webhook integration:

#### Local Testing with ngrok
```bash
# Install ngrok
npm install -g ngrok

# Start your local server
npm run start:dev

# Expose local server to internet
ngrok http 3000

# Use the ngrok URL for webhook testing
# Example: https://abc123.ngrok.io/webhooks/stripe
```

#### Webhook Testing Tools
- **Stripe CLI**: `stripe listen --forward-to localhost:3000/webhooks/stripe`
- **PayPal Sandbox**: Use PayPal's sandbox environment for testing
- **Zoom Webhook Samples**: Use Zoom's webhook sample payloads

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "error": "Invalid webhook signature",
  "message": "The webhook signature could not be verified",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 401 Unauthorized
```json
{
  "error": "Unauthorized webhook",
  "message": "The webhook is not authorized for this service",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An error occurred while processing the webhook",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Retry Logic

The system implements automatic retry logic for failed webhook processing:

- **Retry Attempts**: Up to 3 retries for transient failures
- **Backoff Strategy**: Exponential backoff (1s, 2s, 4s)
- **Dead Letter Queue**: Failed events are stored for manual review

### Logging

All webhook events are logged with the following information:
- Timestamp
- Provider (Stripe, PayPal, Zoom)
- Event type
- Processing status
- Error details (if applicable)

---

## Testing

### Unit Testing

```typescript
describe('Stripe Webhook Handler', () => {
  it('should handle payment_intent.succeeded event', async () => {
    const mockEvent = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test123',
          amount: 2000,
          metadata: {
            userId: 'user123',
            userEmail: 'test@example.com'
          }
        }
      }
    };

    await webhookHandler.handleStripeWebhook(mockEvent);
    
    expect(subscriptionService.activateSubscription).toHaveBeenCalledWith(
      'user123',
      2000
    );
  });
});
```

### Integration Testing

```typescript
describe('Webhook Integration', () => {
  it('should process Stripe webhook successfully', async () => {
    const payload = createMockStripePayload();
    const signature = generateStripeSignature(payload);

    const response = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
  });
});
```

### End-to-End Testing

Use the following checklist for E2E testing:
- [ ] Webhook endpoint is accessible
- [ ] Signature verification works correctly
- [ ] Events are processed successfully
- [ ] Database updates are applied
- [ ] Notifications are sent
- [ ] Error handling works as expected

---

## Troubleshooting

### Common Issues

#### Webhook Not Received
1. **Check URL**: Verify the webhook URL is correct and accessible
2. **Check Firewall**: Ensure your firewall allows incoming requests
3. **Check SSL**: Verify SSL certificates are valid (for production)
4. **Check Logs**: Review application logs for errors

#### Signature Verification Failed
1. **Check Secret**: Verify webhook secret is correct
2. **Check Payload**: Ensure payload is not modified
3. **Check Timestamp**: Verify request timestamp is recent
4. **Check Algorithm**: Ensure correct verification algorithm is used

#### Event Processing Failed
1. **Check Event Type**: Verify event type is supported
2. **Check Data Format**: Ensure event data matches expected schema
3. **Check Business Logic**: Verify business logic handles the event correctly
4. **Check Database**: Ensure database is accessible and not locked

### Debugging Tools

#### Webhook Debugging Endpoint
```typescript
@Post('/webhooks/debug')
async debugWebhook(@Body() payload: any, @Headers() headers: any) {
  return {
    headers,
    payload,
    timestamp: new Date().toISOString(),
    processed: false
  };
}
```

#### Logging Configuration
```typescript
// Enable detailed webhook logging
const logger = new Logger('WebhookService');
logger.setContext('Webhook Processing');
logger.log(`Processing ${provider} webhook: ${eventType}`);
```

### Monitoring

Set up monitoring for webhook health:
- **Success Rate**: Monitor webhook processing success rate
- **Response Time**: Track webhook processing time
- **Error Rate**: Monitor webhook error rates
- **Queue Depth**: Monitor webhook processing queue depth

---

## Best Practices

### Security
1. **Always verify webhook signatures**
2. **Use HTTPS for webhook endpoints**
3. **Implement rate limiting**
4. **Validate all incoming data**
5. **Log security events**

### Performance
1. **Process webhooks asynchronously**
2. **Use connection pooling for database operations**
3. **Implement caching where appropriate**
4. **Monitor webhook processing times**

### Reliability
1. **Implement retry logic for transient failures**
2. **Use dead letter queues for failed events**
3. **Set up alerting for webhook failures**
4. **Regularly test webhook endpoints**

### Maintenance
1. **Keep webhook secrets secure**
2. **Regularly rotate webhook secrets**
3. **Monitor deprecated event types**
4. **Update documentation regularly**

---

## Support

For webhook-related issues:

1. **Check the logs** in your application dashboard
2. **Verify webhook configuration** in the respective service dashboard
3. **Test with webhook testing tools** before deploying to production
4. **Contact support** with detailed error logs and webhook payloads

### Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [PayPal Webhooks Documentation](https://developer.paypal.com/docs/api-basics/webhooks/)
- [Zoom Webhooks Documentation](https://developers.zoom.us/docs/webhooks/)
- [Webhook Security Best Practices](https://tools.ietf.org/html/draft-ietf-httpbis-webhooks)

---

*Last updated: January 2024*
