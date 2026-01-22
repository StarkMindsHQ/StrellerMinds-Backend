# Payment and Subscription Management System - API Documentation

## Overview

This comprehensive payment system supports multiple payment methods (Stripe, PayPal), subscription management, invoicing, tax calculation, financial reporting, and dispute handling.

## Base URL
```
/payments
/subscriptions
/invoices
/tax
/financial-reports
/disputes
```

## Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header, except webhook endpoints.

---

## Payments API

### Initialize Payment
```
POST /payments/initialize
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 99.99,
  "currency": "USD",
  "paymentMethod": "stripe" | "paypal"
}

Response (200):
{
  "clientSecret": "pi_1234567890abcdef"
}
```

### Confirm Stripe Payment
```
POST /payments/stripe/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentIntentId": "pi_1234567890abcdef",
  "paymentDto": {
    "amount": 99.99,
    "currency": "USD",
    "paymentMethod": "stripe",
    "description": "Course purchase"
  }
}

Response (200):
{
  "id": "uuid",
  "userId": "uuid",
  "amount": 99.99,
  "currency": "USD",
  "status": "completed",
  "paymentMethod": "stripe",
  "transactionId": "pi_1234567890abcdef",
  "createdAt": "2024-01-22T12:00:00Z",
  "updatedAt": "2024-01-22T12:00:00Z"
}
```

### Capture PayPal Payment
```
POST /payments/paypal/capture
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "3JU83294AS695322P",
  "amount": 99.99
}

Response (200):
{
  "id": "uuid",
  "userId": "uuid",
  "amount": 99.99,
  "currency": "USD",
  "status": "completed",
  "paymentMethod": "paypal",
  "transactionId": "3JU83294AS695322P",
  "createdAt": "2024-01-22T12:00:00Z"
}
```

### Get Payment History
```
GET /payments/history
Authorization: Bearer <token>

Response (200):
[
  {
    "id": "uuid",
    "userId": "uuid",
    "amount": 99.99,
    "currency": "USD",
    "status": "completed",
    "paymentMethod": "stripe",
    "createdAt": "2024-01-22T12:00:00Z"
  }
]
```

### Get Payment Details
```
GET /payments/{paymentId}
Authorization: Bearer <token>

Response (200):
{
  "id": "uuid",
  "userId": "uuid",
  "amount": 99.99,
  "currency": "USD",
  "status": "completed",
  "paymentMethod": "stripe",
  "transactionId": "pi_1234567890abcdef",
  "createdAt": "2024-01-22T12:00:00Z"
}
```

### Request Refund
```
POST /payments/{paymentId}/refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 50.00,  // Optional - partial refund
  "reason": "Quality issues"
}

Response (200):
{
  "id": "uuid",
  "paymentId": "uuid",
  "amount": 50.00,
  "currency": "USD",
  "status": "requested",
  "reason": "Quality issues",
  "createdAt": "2024-01-22T12:00:00Z"
}
```

---

## Subscriptions API

### Create Subscription
```
POST /subscriptions
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentPlanId": "uuid",
  "billingCycle": "monthly" | "quarterly" | "semi_annual" | "annual",
  "paymentMethodId": "uuid"
}

Response (201):
{
  "id": "uuid",
  "userId": "uuid",
  "paymentPlanId": "uuid",
  "status": "active",
  "billingCycle": "monthly",
  "startDate": "2024-01-22T12:00:00Z",
  "nextBillingDate": "2024-02-22T12:00:00Z",
  "createdAt": "2024-01-22T12:00:00Z"
}
```

### Get User Subscriptions
```
GET /subscriptions
Authorization: Bearer <token>

Response (200):
[
  {
    "id": "uuid",
    "userId": "uuid",
    "paymentPlanId": "uuid",
    "status": "active",
    "billingCycle": "monthly",
    "startDate": "2024-01-22T12:00:00Z",
    "nextBillingDate": "2024-02-22T12:00:00Z",
    "createdAt": "2024-01-22T12:00:00Z"
  }
]
```

### Get Subscription Details
```
GET /subscriptions/{subscriptionId}
Authorization: Bearer <token>

Response (200):
{
  "id": "uuid",
  "userId": "uuid",
  "paymentPlanId": "uuid",
  "status": "active",
  "billingCycle": "monthly",
  "startDate": "2024-01-22T12:00:00Z",
  "nextBillingDate": "2024-02-22T12:00:00Z",
  "createdAt": "2024-01-22T12:00:00Z"
}
```

### Update Subscription
```
PATCH /subscriptions/{subscriptionId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "billingCycle": "annual",
  "status": "active" | "paused" | "cancelled"
}

Response (200):
{
  "id": "uuid",
  "userId": "uuid",
  "paymentPlanId": "uuid",
  "status": "active",
  "billingCycle": "annual",
  "startDate": "2024-01-22T12:00:00Z",
  "nextBillingDate": "2025-01-22T12:00:00Z",
  "updatedAt": "2024-01-22T12:00:00Z"
}
```

### Cancel Subscription
```
POST /subscriptions/{subscriptionId}/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "No longer needed"
}

Response (200):
{
  "id": "uuid",
  "userId": "uuid",
  "paymentPlanId": "uuid",
  "status": "cancelled",
  "billingCycle": "monthly",
  "startDate": "2024-01-22T12:00:00Z",
  "endDate": "2024-01-22T12:00:00Z",
  "updatedAt": "2024-01-22T12:00:00Z"
}
```

### Pause Subscription
```
POST /subscriptions/{subscriptionId}/pause
Authorization: Bearer <token>

Response (200):
{
  "id": "uuid",
  "userId": "uuid",
  "paymentPlanId": "uuid",
  "status": "paused",
  "billingCycle": "monthly",
  "startDate": "2024-01-22T12:00:00Z",
  "updatedAt": "2024-01-22T12:00:00Z"
}
```

### Resume Subscription
```
POST /subscriptions/{subscriptionId}/resume
Authorization: Bearer <token>

Response (200):
{
  "id": "uuid",
  "userId": "uuid",
  "paymentPlanId": "uuid",
  "status": "active",
  "billingCycle": "monthly",
  "nextBillingDate": "2024-02-22T12:00:00Z",
  "updatedAt": "2024-01-22T12:00:00Z"
}
```

### Create Payment Plan
```
POST /subscriptions/plans
Content-Type: application/json

{
  "name": "Professional",
  "description": "Professional tier with advanced features",
  "price": 99.99,
  "currency": "USD",
  "trialDays": 14,
  "maxSubscribers": 1000,
  "features": ["Feature 1", "Feature 2", "Feature 3"]
}

Response (201):
{
  "id": "uuid",
  "name": "Professional",
  "price": 99.99,
  "currency": "USD",
  "trialDays": 14,
  "features": ["Feature 1", "Feature 2", "Feature 3"],
  "createdAt": "2024-01-22T12:00:00Z"
}
```

### List Payment Plans
```
GET /subscriptions/plans?onlyActive=true

Response (200):
[
  {
    "id": "uuid",
    "name": "Professional",
    "price": 99.99,
    "currency": "USD",
    "trialDays": 14,
    "features": ["Feature 1", "Feature 2", "Feature 3"],
    "createdAt": "2024-01-22T12:00:00Z"
  }
]
```

---

## Invoices API

### Create Invoice
```
POST /invoices
Authorization: Bearer <token>
Content-Type: application/json

{
  "subscriptionId": "uuid",
  "subtotal": 99.99,
  "tax": 10.00,
  "discount": 5.00,
  "dueDate": "2024-02-22T12:00:00Z",
  "lineItems": [
    {
      "description": "Professional Subscription",
      "quantity": 1,
      "unitPrice": 99.99
    }
  ]
}

Response (201):
{
  "id": "uuid",
  "invoiceNumber": "INV-1704890000000-abc123",
  "userId": "uuid",
  "subtotal": 99.99,
  "tax": 10.00,
  "discount": 5.00,
  "total": 104.99,
  "status": "draft",
  "dueDate": "2024-02-22T12:00:00Z",
  "createdAt": "2024-01-22T12:00:00Z"
}
```

### Get User Invoices
```
GET /invoices
Authorization: Bearer <token>

Response (200):
[
  {
    "id": "uuid",
    "invoiceNumber": "INV-1704890000000-abc123",
    "userId": "uuid",
    "subtotal": 99.99,
    "tax": 10.00,
    "discount": 5.00,
    "total": 104.99,
    "status": "issued",
    "dueDate": "2024-02-22T12:00:00Z",
    "createdAt": "2024-01-22T12:00:00Z"
  }
]
```

### Get Invoice Details
```
GET /invoices/{invoiceId}
Authorization: Bearer <token>

Response (200):
{
  "id": "uuid",
  "invoiceNumber": "INV-1704890000000-abc123",
  "userId": "uuid",
  "subtotal": 99.99,
  "tax": 10.00,
  "discount": 5.00,
  "total": 104.99,
  "status": "issued",
  "dueDate": "2024-02-22T12:00:00Z",
  "createdAt": "2024-01-22T12:00:00Z"
}
```

### Send Invoice
```
POST /invoices/{invoiceId}/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "customer@example.com",
  "subject": "Invoice for your subscription",
  "message": "Please find your invoice attached"
}

Response (200):
{
  "id": "uuid",
  "invoiceNumber": "INV-1704890000000-abc123",
  "status": "sent",
  "updatedAt": "2024-01-22T12:00:00Z"
}
```

### Mark Invoice as Paid
```
POST /invoices/{invoiceId}/mark-paid
Authorization: Bearer <token>
Content-Type: application/json

{
  "amountPaid": 104.99
}

Response (200):
{
  "id": "uuid",
  "invoiceNumber": "INV-1704890000000-abc123",
  "status": "paid",
  "amountPaid": 104.99,
  "paidAt": "2024-01-22T12:00:00Z",
  "updatedAt": "2024-01-22T12:00:00Z"
}
```

---

## Tax Calculation API

### Create Tax Rate
```
POST /tax/rates
Content-Type: application/json

{
  "country": "US",
  "state": "CA",
  "rate": 8.625,
  "type": "Sales Tax"
}

Response (201):
{
  "id": "uuid",
  "country": "US",
  "state": "CA",
  "rate": 8.625,
  "type": "Sales Tax",
  "isActive": true,
  "createdAt": "2024-01-22T12:00:00Z"
}
```

### List Tax Rates
```
GET /tax/rates?country=US

Response (200):
[
  {
    "id": "uuid",
    "country": "US",
    "state": "CA",
    "rate": 8.625,
    "type": "Sales Tax",
    "isActive": true,
    "createdAt": "2024-01-22T12:00:00Z"
  }
]
```

### Calculate Tax
```
POST /tax/calculate
Content-Type: application/json

{
  "amount": 100.00,
  "country": "US",
  "state": "CA",
  "currency": "USD"
}

Response (200):
{
  "amount": 100.00,
  "rate": 8.625,
  "tax": 8.625,
  "total": 108.625,
  "country": "US",
  "state": "CA",
  "currency": "USD",
  "taxType": "Sales Tax"
}
```

### Validate Tax Compliance
```
POST /tax/validate-compliance
Authorization: Bearer <token>
Content-Type: application/json

{
  "country": "US",
  "state": "CA"
}

Response (200):
{
  "compliant": true,
  "country": "US",
  "state": "CA",
  "taxRate": 8.625,
  "requiresReporting": true,
  "lastUpdated": "2024-01-22T12:00:00Z"
}
```

---

## Financial Reports API

### Generate Report
```
POST /financial-reports
Content-Type: application/json

{
  "reportType": "revenue" | "refunds" | "tax" | "reconciliation",
  "period": "monthly" | "quarterly" | "annual",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z"
}

Response (201):
{
  "id": "uuid",
  "reportType": "revenue",
  "period": "monthly",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "totalRevenue": 10000.00,
  "totalRefunds": 500.00,
  "netRevenue": 9500.00,
  "transactionCount": 150,
  "generatedAt": "2024-01-22T12:00:00Z"
}
```

### Get Report
```
GET /financial-reports/{reportId}

Response (200):
{
  "id": "uuid",
  "reportType": "revenue",
  "period": "monthly",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "totalRevenue": 10000.00,
  "totalRefunds": 500.00,
  "netRevenue": 9500.00,
  "transactionCount": 150,
  "generatedAt": "2024-01-22T12:00:00Z"
}
```

### List Reports
```
GET /financial-reports?period=monthly

Response (200):
[
  {
    "id": "uuid",
    "reportType": "revenue",
    "period": "monthly",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "totalRevenue": 10000.00,
    "totalRefunds": 500.00,
    "netRevenue": 9500.00,
    "transactionCount": 150,
    "generatedAt": "2024-01-22T12:00:00Z"
  }
]
```

---

## Disputes API

### Initiate Dispute
```
POST /disputes
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentId": "uuid",
  "reason": "Unauthorized transaction",
  "description": "I did not authorize this charge"
}

Response (201):
{
  "id": "uuid",
  "paymentId": "uuid",
  "userId": "uuid",
  "amount": 99.99,
  "currency": "USD",
  "status": "initiated",
  "reason": "Unauthorized transaction",
  "dueDate": "2024-04-22T12:00:00Z",
  "createdAt": "2024-01-22T12:00:00Z"
}
```

### Get User Disputes
```
GET /disputes
Authorization: Bearer <token>

Response (200):
[
  {
    "id": "uuid",
    "paymentId": "uuid",
    "userId": "uuid",
    "amount": 99.99,
    "currency": "USD",
    "status": "initiated",
    "reason": "Unauthorized transaction",
    "createdAt": "2024-01-22T12:00:00Z"
  }
]
```

### Submit Evidence
```
POST /disputes/{disputeId}/evidence
Authorization: Bearer <token>
Content-Type: application/json

{
  "evidence": [
    "data:image/png;base64,...",
    "data:application/pdf;base64,..."
  ]
}

Response (200):
{
  "id": "uuid",
  "paymentId": "uuid",
  "userId": "uuid",
  "status": "under_review",
  "evidence": [...],
  "updatedAt": "2024-01-22T12:00:00Z"
}
```

---

## Webhooks

### Stripe Webhooks
Endpoint: `POST /webhooks/stripe`

Supported events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `charge.refunded`
- `charge.dispute.created`

Example:
```
POST /webhooks/stripe
Stripe-Signature: t=1234567890,v1=abc123...
Content-Type: application/json

{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890abcdef",
      "status": "succeeded",
      "amount": 9999,
      "metadata": {
        "userId": "uuid"
      }
    }
  }
}
```

### PayPal Webhooks
Endpoint: `POST /webhooks/paypal`

Supported events:
- `CHECKOUT.ORDER.COMPLETED`
- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `PAYMENT.CAPTURE.REFUNDED`

---

## Environment Variables

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
PAYPAL_MODE=sandbox|live

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=...
DATABASE_NAME=strellerminds
```

---

## Error Responses

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "BadRequestException"
}
```

Common HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

---

## Rate Limiting

API endpoints are rate-limited:
- 10 requests per minute per user
- 1000 requests per hour per user

---

## Notes

- All amounts are in decimal format with 2 decimal places
- All timestamps are in ISO 8601 format (UTC)
- Payment processing is asynchronous; use webhooks for real-time updates
- Tax calculations are based on configured tax rates by country/state
- Financial reports are generated based on transaction data
