# Payment and Subscription Management System

## Quick Start Guide

### Installation

The payment system is already integrated into the StrellerMinds Backend. To get started:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```

3. **Set payment gateway credentials:**
   ```env
   # Stripe
   STRIPE_SECRET_KEY=sk_test_your_key
   STRIPE_PUBLIC_KEY=pk_test_your_key
   STRIPE_WEBHOOK_SECRET=whsec_your_secret

   # PayPal
   PAYPAL_CLIENT_ID=your_client_id
   PAYPAL_SECRET=your_secret
   PAYPAL_MODE=sandbox
   ```

4. **Run database migrations:**
   ```bash
   npm run typeorm migration:run
   ```

5. **Start the server:**
   ```bash
   npm run start:dev
   ```

---

## System Architecture

### Core Components

1. **Payment Gateway Integration** - Stripe and PayPal support
2. **Subscription Engine** - Recurring billing management
3. **Invoicing System** - Automatic invoice generation
4. **Tax Calculation** - Multi-jurisdiction tax support
5. **Financial Reporting** - Comprehensive analytics
6. **Dispute Management** - Chargeback and dispute handling

### Data Flow

```
User Payment Request
    ↓
Payment Service
    ├─→ Stripe Service / PayPal Service
    │       ↓
    │   Payment Gateway
    ├─→ Payment Repository
    ├─→ Invoice Service
    ├─→ Subscription Service
    └─→ Tax Calculation Service
        ↓
    Webhook Events (async)
        ↓
    Database Update
```

---

## Usage Examples

### Creating a Payment

```bash
curl -X POST http://localhost:3000/payments/initialize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 99.99,
    "currency": "USD",
    "paymentMethod": "stripe"
  }'
```

### Creating a Subscription

```bash
curl -X POST http://localhost:3000/subscriptions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentPlanId": "plan-uuid",
    "billingCycle": "monthly"
  }'
```

### Calculating Tax

```bash
curl -X POST http://localhost:3000/tax/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "country": "US",
    "state": "CA"
  }'
```

### Generating Financial Report

```bash
curl -X POST http://localhost:3000/financial-reports \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "revenue",
    "period": "monthly",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z"
  }'
```

---

## Payment Statuses

```
PENDING    → Processing state waiting for confirmation
PROCESSING → Payment is being processed
COMPLETED  → Successfully completed
FAILED     → Payment failed
CANCELLED  → User cancelled the payment
REFUNDED   → Refund has been processed
DISPUTED   → Payment is under dispute
```

---

## Subscription Statuses

```
PENDING    → Waiting for first payment
ACTIVE     → Active subscription
PAUSED     → Temporarily paused
CANCELLED  → Cancelled by user
EXPIRED    → Subscription expired
FAILED     → Payment failed
```

---

## Invoice Statuses

```
DRAFT          → Draft mode, not sent to customer
ISSUED         → Invoice created
SENT           → Invoice sent to customer
VIEWED         → Customer viewed invoice
PARTIALLY_PAID → Partial payment received
PAID           → Fully paid
OVERDUE        → Past due date
CANCELLED      → Invoice cancelled
REFUNDED       → Refund issued
```

---

## Tax Calculation

### Supported Jurisdictions

- **United States**: Sales tax by state
- **European Union**: VAT
- **Canada**: GST/PST by province
- **Australia**: GST

### Adding Tax Rates

```bash
curl -X POST http://localhost:3000/tax/rates \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US",
    "state": "CA",
    "rate": 8.625,
    "type": "Sales Tax"
  }'
```

---

## Webhook Configuration

### Stripe

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/webhooks/stripe`
3. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.*`
   - `charge.refunded`
   - `charge.dispute.created`

### PayPal

1. Go to PayPal Developer Dashboard → Webhooks
2. Create webhook for: `https://yourdomain.com/webhooks/paypal`
3. Subscribe to events:
   - `CHECKOUT.ORDER.COMPLETED`
   - `BILLING.SUBSCRIPTION.*`
   - `PAYMENT.CAPTURE.REFUNDED`

---

## Financial Reports

### Report Types

1. **Revenue Report** - Total sales, transaction count, average value
2. **Refund Report** - Refund amounts, counts, refund rates
3. **Tax Report** - Tax collected, effective rates, compliance status
4. **Reconciliation Report** - Complete financial reconciliation

### Accessing Reports

```typescript
// Generate revenue report
const report = await paymentService.generateReport({
  reportType: 'revenue',
  period: 'monthly',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
});

// Get specific report
const retrieved = await paymentService.getReport(report.id);

// List all reports
const all = await paymentService.listReports('monthly');
```

---

## Payment Methods

### Supported Methods

- **Stripe Card** - Credit and debit cards
- **PayPal** - PayPal wallet
- **Bank Transfer** - Direct bank transfers
- **Cryptocurrency** - Bitcoin, Ethereum (future)

### Storing Payment Methods

```bash
curl -X POST http://localhost:3000/payments/methods \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "card",
    "provider": "stripe",
    "externalId": "pm_1234567890abcdef",
    "last4": "4242",
    "brand": "visa",
    "isDefault": true
  }'
```

---

## Refund Processing

### Requesting a Refund

```bash
curl -X POST http://localhost:3000/payments/uuid/refund \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "reason": "Quality issues"
  }'
```

### Refund Statuses

- `REQUESTED` - Refund requested
- `APPROVED` - Refund approved
- `PROCESSING` - Being processed by gateway
- `COMPLETED` - Successfully refunded
- `FAILED` - Refund failed
- `REJECTED` - Refund rejected

---

## Dispute Management

### Initiating a Dispute

```bash
curl -X POST http://localhost:3000/disputes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "payment-uuid",
    "reason": "Unauthorized transaction",
    "description": "I did not authorize this charge"
  }'
```

### Submitting Evidence

```bash
curl -X POST http://localhost:3000/disputes/uuid/evidence \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "evidence": [
      "data:image/png;base64,...",
      "data:application/pdf;base64,..."
    ]
  }'
```

### Dispute Statuses

- `INITIATED` - Dispute just created
- `UNDER_REVIEW` - Evidence submitted and under review
- `RESOLVED` - Dispute resolved
- `WON` - Dispute won in favor of customer
- `LOST` - Dispute lost
- `APPEALED` - Appealing a lost dispute

---

## Database Schema

### Payment Tables

- **payments** - Payment transactions
- **subscriptions** - Active subscriptions
- **payment_plans** - Subscription plans
- **invoices** - Invoice documents
- **refunds** - Refund tracking
- **disputes** - Dispute records
- **tax_rates** - Tax rate configuration
- **financial_reports** - Generated reports
- **payment_methods** - Stored payment methods

### Indexes

Indexes created on:
- `payments.userId`
- `payments.status`
- `subscriptions.userId`
- `subscriptions.status`
- `invoices.userId`
- `invoices.status`

---

## Error Handling

### Common Errors

```json
{
  "statusCode": 400,
  "message": "Payment amount must be greater than 0",
  "error": "BadRequestException"
}
```

```json
{
  "statusCode": 401,
  "message": "Unauthorized access",
  "error": "UnauthorizedException"
}
```

```json
{
  "statusCode": 404,
  "message": "Payment not found",
  "error": "NotFoundException"
}
```

---

## Testing

### Running Tests

```bash
# Unit tests
npm run test

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Test Files

- `payment.service.spec.ts`
- `subscription.service.spec.ts`
- `tax-calculation.service.spec.ts`

---

## Logging

All payment operations are logged with:
- Request details
- Response outcomes
- Error messages
- Execution time
- User identification

Enable detailed logging:
```env
NODE_ENV=development
```

---

## Performance Considerations

1. **Payment Processing** - Async webhook processing
2. **Billing Cycles** - Batch processing for recurring billing
3. **Report Generation** - Scheduled off-peak generation
4. **Database Queries** - Optimized with proper indexing
5. **Cache Strategy** - Tax rates cached in memory

---

## Security Best Practices

1. **Never log payment details** - PII protection
2. **Use HTTPS everywhere** - Encrypted communication
3. **Validate all inputs** - Prevent injection attacks
4. **Verify webhooks** - Signature verification
5. **Store secrets securely** - Environment variables only
6. **Rate limiting** - Prevent brute force attacks
7. **User isolation** - Data belongs only to user

---

## Troubleshooting

### Webhook Not Triggering

1. Check webhook secret configuration
2. Verify endpoint is publicly accessible
3. Check firewall/security group settings
4. Review webhook logs in payment gateway dashboard

### Subscription Not Billing

1. Verify payment method is valid
2. Check next billing date calculation
3. Review failed payment logs
4. Ensure database migration ran successfully

### Tax Not Calculating

1. Verify tax rate exists for location
2. Check country/state configuration
3. Ensure tax rate is marked as active
4. Review tax calculation logs

### Invoice Not Sending

1. Implement email service integration
2. Configure email templates
3. Check email provider credentials
4. Review email logs

---

## Support

For issues or questions:
1. Check [PAYMENT_API.md](./PAYMENT_API.md) for API reference
2. Review [PAYMENT_IMPLEMENTATION.md](./PAYMENT_IMPLEMENTATION.md) for technical details
3. Check service logs for error details
4. Contact payment gateway support teams

---

## Version History

- **v1.0.0** (2024-01-22) - Initial release
  - Core payment processing
  - Stripe and PayPal integration
  - Subscription management
  - Invoice generation
  - Tax calculation
  - Financial reporting
  - Dispute handling

---

## License

This project is licensed under UNLICENSED - All rights reserved
