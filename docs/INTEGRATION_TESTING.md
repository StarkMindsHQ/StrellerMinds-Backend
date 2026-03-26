# Integration Testing Documentation

## Overview

This document provides comprehensive guidance for integration testing of external service integrations in the StrellerMinds Backend application.

## Table of Contents
- [Introduction](#introduction)
- [Testing Strategy](#testing-strategy)
- [Test Environment Setup](#test-environment-setup)
- [Service-Specific Tests](#service-specific-tests)
- [Circuit Breaker Testing](#circuit-breaker-testing)
- [Service Mocking](#service-mocking)
- [Monitoring and Metrics](#monitoring-and-metrics)
- [Contract Testing](#contract-testing)
- [Performance Testing](#performance-testing)
- [Error Handling Tests](#error-handling-tests)
- [Test Execution](#test-execution)
- [Troubleshooting](#troubleshooting)

---

## Introduction

Integration testing validates the interaction between our application and external services. This ensures that our integrations work correctly, handle errors gracefully, and meet performance requirements.

### Key Objectives

1. **Validate API Compatibility**: Ensure our code works with actual external APIs
2. **Test Error Scenarios**: Verify proper handling of failures and edge cases
3. **Performance Validation**: Confirm response times meet requirements
4. **Contract Compliance**: Verify API responses match expected contracts
5. **Circuit Breaker Testing**: Validate failure isolation and recovery

### Supported Services

- **Stripe**: Payment processing and webhooks
- **PayPal**: Alternative payment processing
- **Zoom**: Video conferencing integration
- **Email Services**: Notification delivery
- **Storage Services**: File storage and CDN

---

## Testing Strategy

### Test Pyramid

```
    E2E Tests (5%)
       |
    Integration Tests (25%)
       |
    Unit Tests (70%)
```

### Integration Test Categories

1. **Happy Path Tests**: Normal operation scenarios
2. **Error Handling Tests**: Failure scenarios and recovery
3. **Performance Tests**: Response time and throughput
4. **Security Tests**: Authentication and authorization
5. **Contract Tests**: API compatibility validation

### Test Environments

| Environment | Purpose | Data | External Services |
|-------------|---------|------|-------------------|
| Development | Feature development | Mock/Sandbox | Mock APIs |
| Staging | Pre-production validation | Realistic data | Sandbox APIs |
| Production | Live monitoring | Real data | Live APIs |

---

## Test Environment Setup

### Prerequisites

```bash
# Required environment variables
export NODE_ENV=test
export INTEGRATION_TESTS_ENABLED=true
export STRIPE_TEST_SECRET_KEY=sk_test_...
export PAYPAL_SANDBOX_CLIENT_ID=...
export PAYPAL_SANDBOX_CLIENT_SECRET=...
export ZOOM_WEBHOOK_SECRET=...
```

### Test Configuration

```typescript
// test/integration/config.ts
export const integrationTestConfig = {
  enabled: true,
  timeout: 30000,
  retries: 3,
  parallel: false,
  services: ['stripe', 'paypal', 'zoom'],
  thresholds: {
    responseTime: 5000,    // 5 seconds
    successRate: 95,       // 95%
    errorRate: 5,          // 5%
  },
  mockServices: process.env.USE_MOCK_SERVICES === 'true',
};
```

### Database Setup

```bash
# Create test database
createdb strellerminds_test

# Run migrations
npm run migration:run

# Seed test data
npm run seed:test
```

---

## Service-Specific Tests

### Stripe Integration Tests

#### Payment Intent Tests

```typescript
describe('Stripe Payment Intents', () => {
  it('should create payment intent successfully', async () => {
    const paymentData = {
      amount: 2000,
      currency: 'usd',
      payment_method_types: ['card'],
    };

    const paymentIntent = await stripeService.createPaymentIntent(paymentData);

    expect(paymentIntent.id).toMatch(/^pi_/);
    expect(paymentIntent.amount).toBe(2000);
    expect(paymentIntent.currency).toBe('usd');
    expect(paymentIntent.status).toBe('requires_payment_method');
  });

  it('should handle payment intent confirmation', async () => {
    // Test payment confirmation flow
  });

  it('should validate payment intent parameters', async () => {
    // Test parameter validation
  });
});
```

#### Customer Management Tests

```typescript
describe('Stripe Customer Management', () => {
  it('should create customer with valid data', async () => {
    const customerData = {
      email: 'test@example.com',
      name: 'Test User',
    };

    const customer = await stripeService.createCustomer(customerData);

    expect(customer.id).toMatch(/^cus_/);
    expect(customer.email).toBe(customerData.email);
  });

  it('should retrieve customer by ID', async () => {
    // Test customer retrieval
  });

  it('should update customer information', async () => {
    // Test customer updates
  });
});
```

#### Webhook Security Tests

```typescript
describe('Stripe Webhook Security', () => {
  it('should verify webhook signature', async () => {
    const payload = { test: 'webhook' };
    const signature = generateTestSignature(payload);

    const isValid = await webhookSecurityService.validateSignature(
      JSON.stringify(payload),
      signature,
      Date.now().toString(),
      stripeConfig
    );

    expect(isValid.isValid).toBe(true);
  });

  it('should reject invalid signatures', async () => {
    // Test signature validation failures
  });

  it('should prevent replay attacks', async () => {
    // Test replay attack prevention
  });
});
```

### PayPal Integration Tests

#### Order Management Tests

```typescript
describe('PayPal Order Management', () => {
  it('should create order successfully', async () => {
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: '20.00',
        },
      }],
    };

    const order = await paypalService.createOrder(orderData);

    expect(order.id).toMatch(/^ORD-/);
    expect(order.status).toBe('CREATED');
  });

  it('should capture approved order', async () => {
    // Test order capture
  });

  it('should handle order validation', async () => {
    // Test order validation
  });
});
```

### Zoom Integration Tests

```typescript
describe('Zoom Integration', () => {
  it('should create meeting successfully', async () => {
    const meetingData = {
      topic: 'Test Meeting',
      type: 2,
      duration: 60,
    };

    const meeting = await zoomService.createMeeting(meetingData);

    expect(meeting.id).toBeDefined();
    expect(meeting.topic).toBe(meetingData.topic);
  });

  it('should retrieve user information', async () => {
    // Test user retrieval
  });

  it('should handle webhook events', async () => {
    // Test webhook processing
  });
});
```

---

## Circuit Breaker Testing

### Circuit Breaker Behavior Tests

```typescript
describe('Circuit Breaker Integration', () => {
  it('should remain closed during normal operation', async () => {
    // Test normal operation
    const result = await circuitBreaker.execute('stripe', async () => {
      return stripeService.createPaymentIntent(testData);
    });

    const state = circuitBreaker.getCircuitState('stripe');
    expect(state.state).toBe('CLOSED');
  });

  it('should open circuit on consecutive failures', async () => {
    // Simulate failures to trigger circuit opening
    for (let i = 0; i < 6; i++) {
      try {
        await circuitBreaker.execute('stripe', async () => {
          throw new Error('Simulated failure');
        });
      } catch (error) {
        // Expected failures
      }
    }

    const state = circuitBreaker.getCircuitState('stripe');
    expect(state.state).toBe('OPEN');
  });

  it('should provide fallback during circuit open state', async () => {
    // Test fallback behavior
    const result = await circuitBreaker.execute('stripe', async () => {
      throw new Error('Service unavailable');
    }, {
      fallback: () => ({ fallback: true, status: 'degraded' })
    });

    expect(result.fallback).toBe(true);
  });

  it('should recover after timeout', async () => {
    // Test circuit recovery
  }, 65000); // Wait for recovery timeout
});
```

### Circuit Breaker Metrics Tests

```typescript
describe('Circuit Breaker Metrics', () => {
  it('should track success and failure rates', async () => {
    // Execute mixed success/failure operations
    const metrics = circuitBreaker.getMetrics('stripe');
    
    expect(metrics.successfulCalls).toBeGreaterThan(0);
    expect(metrics.failedCalls).toBeGreaterThan(0);
    expect(metrics.failureRate).toBeGreaterThan(0);
  });

  it('should provide health status', async () => {
    const health = circuitBreaker.getHealthStatus();
    
    expect(health).toHaveProperty('healthy');
    expect(health).toHaveProperty('totalCircuits');
    expect(health).toHaveProperty('openCircuits');
  });
});
```

---

## Service Mocking

### Mock Configuration

```typescript
describe('Service Mocking', () => {
  beforeEach(() => {
    // Setup mocks for testing
    serviceMocker.registerMock('stripe', {
      enabled: true,
      latency: { min: 50, max: 200 },
      errorRate: 0.1, // 10% error rate
      responses: [
        {
          condition: (request) => request.type === 'payment_intent',
          response: (request) => ({
            id: `pi_mock_${Date.now()}`,
            amount: request.amount,
            currency: request.currency,
            status: 'requires_payment_method',
          }),
        },
      ],
    });
  });

  it('should return mock responses', async () => {
    const result = await serviceMocker.executeMock('stripe', {
      type: 'payment_intent',
      amount: 2000,
      currency: 'usd',
    });

    expect(result.id).toMatch(/^pi_mock_/);
    expect(result.amount).toBe(2000);
  });

  it('should simulate latency', async () => {
    const start = Date.now();
    await serviceMocker.executeMock('stripe', { type: 'test' });
    const duration = Date.now() - start;

    expect(duration).toBeGreaterThanOrEqual(50);
    expect(duration).toBeLessThanOrEqual(200);
  });

  it('should inject errors based on rate', async () => {
    // Test error injection
    let errors = 0;
    const attempts = 100;

    for (let i = 0; i < attempts; i++) {
      try {
        await serviceMocker.executeMock('stripe', { type: 'test' });
      } catch (error) {
        errors++;
      }
    }

    const errorRate = (errors / attempts) * 100;
    expect(errorRate).toBeGreaterThan(5); // Allow some variance
    expect(errorRate).toBeLessThan(15);
  });
});
```

### Contract Validation

```typescript
describe('Contract Validation', () => {
  it('should validate Stripe response contracts', async () => {
    const mock = serviceMocker.createPredefinedMock('stripe');
    const validation = serviceMocker.validateMockContract('stripe', stripeContract);

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should validate PayPal response contracts', async () => {
    const mock = serviceMocker.createPredefinedMock('paypal');
    const validation = serviceMocker.validateMockContract('paypal', paypalContract);

    expect(validation.isValid).toBe(true);
  });
});
```

---

## Monitoring and Metrics

### Metrics Recording Tests

```typescript
describe('Integration Monitoring', () => {
  it('should record service metrics', async () => {
    // Execute service call
    const start = Date.now();
    await stripeService.createPaymentIntent(testData);
    const duration = Date.now() - start;

    // Record metrics
    monitoring.recordMetrics('stripe', duration, true);

    const metrics = monitoring.getMetrics('stripe', 1);
    expect(metrics).toHaveLength(1);
    expect(metrics[0].responseTime).toBe(duration);
    expect(metrics[0].success).toBe(true);
  });

  it('should calculate health status', async () => {
    // Record mixed metrics
    monitoring.recordMetrics('stripe', 100, true);
    monitoring.recordMetrics('stripe', 200, false, 'Test error');
    monitoring.recordMetrics('stripe', 150, true);

    const health = monitoring.getHealthStatus('stripe');
    expect(health).toBeDefined();
    expect(health.successRate).toBe(66.67); // 2/3 * 100
    expect(health.errorRate).toBe(33.33); // 1/3 * 100
  });

  it('should generate performance summary', async () => {
    // Record performance data
    for (let i = 0; i < 10; i++) {
      monitoring.recordMetrics('stripe', 100 + i * 10, i < 8);
    }

    const summary = monitoring.getPerformanceSummary('stripe', 1);
    expect(summary.totalRequests).toBe(10);
    expect(summary.successRate).toBe(80);
    expect(summary.averageResponseTime).toBe(145);
  });
});
```

### Alert System Tests

```typescript
describe('Alert System', () => {
  it('should trigger alerts on threshold violations', async () => {
    // Add custom alert rule
    monitoring.addAlertRule('stripe', {
      serviceName: 'stripe',
      condition: (health) => health.averageResponseTime > 1000,
      severity: 'high',
      message: 'Response time too high',
      cooldown: 300,
    });

    // Record slow metrics
    monitoring.recordMetrics('stripe', 1500, false, 'Timeout');
    monitoring.recordMetrics('stripe', 1200, false, 'Slow response');

    // Check if alert was triggered
    const health = monitoring.getHealthStatus('stripe');
    expect(health.averageResponseTime).toBeGreaterThan(1000);
  });

  it('should respect alert cooldowns', async () => {
    // Test alert cooldown behavior
  });
});
```

---

## Contract Testing

### API Contract Tests

```typescript
describe('API Contracts', () => {
  describe('Stripe API Contract', () => {
    it('should maintain payment intent contract', async () => {
      const paymentIntent = await stripeService.createPaymentIntent({
        amount: 2000,
        currency: 'usd',
        payment_method_types: ['card'],
      });

      // Validate required fields
      expect(paymentIntent).toHaveProperty('id');
      expect(paymentIntent).toHaveProperty('object', 'payment_intent');
      expect(paymentIntent).toHaveProperty('amount');
      expect(paymentIntent).toHaveProperty('currency');
      expect(paymentIntent).toHaveProperty('status');
      expect(paymentIntent).toHaveProperty('created');

      // Validate data types
      expect(typeof paymentIntent.id).toBe('string');
      expect(typeof paymentIntent.amount).toBe('number');
      expect(typeof paymentIntent.currency).toBe('string');
      expect(typeof paymentIntent.status).toBe('string');

      // Validate enum values
      expect(paymentIntent.object).toBe('payment_intent');
      expect(paymentIntent.currency).toMatch(/^[a-z]{3}$/);
      expect(paymentIntent.status).toMatch(/^(requires_payment_method|requires_confirmation|requires_action|processing|succeeded|canceled)$/);
    });

    it('should maintain customer contract', async () => {
      const customer = await stripeService.createCustomer({
        email: 'test@example.com',
        name: 'Test User',
      });

      // Validate customer contract
      expect(customer).toHaveProperty('id');
      expect(customer).toHaveProperty('object', 'customer');
      expect(customer).toHaveProperty('email');
      expect(customer).toHaveProperty('created');

      expect(typeof customer.id).toBe('string');
      expect(typeof customer.email).toBe('string');
      expect(customer.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });
  });

  describe('PayPal API Contract', () => {
    it('should maintain order contract', async () => {
      const order = await paypalService.createOrder({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: '20.00',
          },
        }],
      });

      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('status');
      expect(order).toHaveProperty('intent');
      expect(order).toHaveProperty('purchase_units');
      expect(order).toHaveProperty('create_time');
      expect(order).toHaveProperty('links');

      expect(order.id).toMatch(/^ORD-/);
      expect(order.status).toBe('CREATED');
      expect(order.intent).toBe('CAPTURE');
    });
  });
});
```

### Schema Validation Tests

```typescript
describe('Schema Validation', () => {
  it('should validate webhook payload schemas', async () => {
    // Test Stripe webhook schema
    const stripeWebhook = {
      id: 'evt_test_123',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_123',
          object: 'payment_intent',
          amount: 2000,
          currency: 'usd',
          status: 'succeeded',
        },
      },
    };

    const isValid = validateWebhookSchema('stripe', stripeWebhook);
    expect(isValid).toBe(true);
  });

  it('should reject invalid webhook schemas', async () => {
    const invalidWebhook = {
      id: 'invalid',
      type: 'unknown_event',
    };

    const isValid = validateWebhookSchema('stripe', invalidWebhook);
    expect(isValid).toBe(false);
  });
});
```

---

## Performance Testing

### Response Time Tests

```typescript
describe('Performance Tests', () => {
  it('should meet response time requirements', async () => {
    const start = Date.now();
    await stripeService.createPaymentIntent(testData);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000); // 5 second threshold
  });

  it('should handle concurrent requests', async () => {
    const concurrentRequests = 10;
    const promises = Array.from({ length: concurrentRequests }, () =>
      stripeService.createPaymentIntent(testData)
    );

    const results = await Promise.allSettled(promises);
    const failures = results.filter(result => result.status === 'rejected');

    expect(failures.length).toBe(0);
  });

  it('should maintain performance under load', async () => {
    const loadTestDuration = 30000; // 30 seconds
    const requestsPerSecond = 5;
    const startTime = Date.now();

    while (Date.now() - startTime < loadTestDuration) {
      const promises = Array.from({ length: requestsPerSecond }, () =>
        stripeService.createPaymentIntent(testData)
      );

      await Promise.allSettled(promises);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Verify performance metrics
    const summary = monitoring.getPerformanceSummary('stripe', 1);
    expect(summary.averageResponseTime).toBeLessThan(5000);
    expect(summary.successRate).toBeGreaterThan(95);
  }, 35000);
});
```

### Throughput Tests

```typescript
describe('Throughput Tests', () => {
  it('should handle sustained throughput', async () => {
    const targetThroughput = 100; // requests per minute
    const testDuration = 60000; // 1 minute
    const interval = 60000 / targetThroughput; // 600ms

    const results = [];
    const startTime = Date.now();

    while (Date.now() - startTime < testDuration) {
      const requestStart = Date.now();
      try {
        await stripeService.createPaymentIntent(testData);
        results.push({ success: true, duration: Date.now() - requestStart });
      } catch (error) {
        results.push({ success: false, duration: Date.now() - requestStart });
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    const successRate = (results.filter(r => r.success).length / results.length) * 100;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    expect(successRate).toBeGreaterThan(95);
    expect(avgDuration).toBeLessThan(5000);
  }, 65000);
});
```

---

## Error Handling Tests

### Network Error Tests

```typescript
describe('Error Handling', () => {
  it('should handle network timeouts', async () => {
    // Mock network timeout
    const timeoutService = new StripeService({
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_TIMEOUT: 1000, // 1 second timeout
    });

    await expect(timeoutService.createPaymentIntent(testData))
      .rejects.toThrow(/timeout/i);
  });

  it('should handle rate limiting', async () => {
    // Simulate rate limiting
    const promises = Array.from({ length: 100 }, () =>
      stripeService.createPaymentIntent(testData)
    );

    const results = await Promise.allSettled(promises);
    const rateLimitErrors = results.filter(result => 
      result.status === 'rejected' && 
      result.reason.message.includes('rate limit')
    );

    // Should handle rate limiting gracefully
    expect(rateLimitErrors.length).toBeGreaterThan(0);
  });

  it('should handle authentication errors', async () => {
    // Test with invalid API key
    const invalidService = new StripeService({
      STRIPE_SECRET_KEY: 'sk_invalid_123',
    });

    await expect(invalidService.createPaymentIntent(testData))
      .rejects.toThrow(/authentication|unauthorized/i);
  });
});
```

### Data Validation Tests

```typescript
describe('Data Validation', () => {
  it('should validate input parameters', async () => {
    const invalidData = {
      amount: -1000, // Invalid negative amount
      currency: 'usd',
      payment_method_types: ['card'],
    };

    await expect(stripeService.createPaymentIntent(invalidData))
      .rejects.toThrow();
  });

  it('should handle malformed responses', async () => {
    // Mock malformed response
    const mockResponse = { invalid: 'structure' };
    
    // Service should handle malformed responses gracefully
    expect(() => parseStripeResponse(mockResponse))
      .not.toThrow();
  });
});
```

---

## Test Execution

### Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific service tests
npm run test:integration -- --grep "Stripe"

# Run with coverage
npm run test:integration -- --coverage

# Run in watch mode
npm run test:integration -- --watch

# Run with specific timeout
npm run test:integration -- --timeout 60000
```

### Test Configuration

```json
{
  "jest": {
    "testEnvironment": "node",
    "testTimeout": 30000,
    "setupFilesAfterEnv": ["<rootDir>/test/integration/setup.ts"],
    "testMatch": [
      "<rootDir>/test/integration/**/*.spec.ts"
    ],
    "collectCoverageFrom": [
      "src/**/*.ts",
      "!src/**/*.spec.ts",
      "!src/**/*.test.ts"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

### CI/CD Integration

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Setup test environment
        run: |
          cp .env.example .env.test
          npm run migration:run
          
      - name: Run integration tests
        run: npm run test:integration
        env:
          STRIPE_TEST_SECRET_KEY: ${{ secrets.STRIPE_TEST_SECRET_KEY }}
          PAYPAL_SANDBOX_CLIENT_ID: ${{ secrets.PAYPAL_SANDBOX_CLIENT_ID }}
          PAYPAL_SANDBOX_CLIENT_SECRET: ${{ secrets.PAYPAL_SANDBOX_CLIENT_SECRET }}
```

---

## Troubleshooting

### Common Issues

#### Test Timeouts

**Problem**: Tests failing with timeout errors

**Solutions**:
```bash
# Increase test timeout
npm run test:integration -- --timeout 60000

# Check service connectivity
curl -I https://api.stripe.com/v1

# Verify environment variables
echo $STRIPE_TEST_SECRET_KEY
```

#### Authentication Failures

**Problem**: Tests failing with authentication errors

**Solutions**:
```bash
# Verify API keys
stripe accounts list

# Check API key permissions
stripe keys list

# Test API connectivity
curl -u "$STRIPE_TEST_SECRET_KEY:" https://api.stripe.com/v1/accounts
```

#### Mock Service Issues

**Problem**: Mock services not working correctly

**Solutions**:
```typescript
// Check mock configuration
const mock = serviceMocker.getMockState('stripe');
console.log('Mock state:', mock);

// Validate mock responses
const validation = serviceMocker.validateMockContract('stripe', contract);
console.log('Validation:', validation);
```

#### Circuit Breaker Issues

**Problem**: Circuit breaker not behaving as expected

**Solutions**:
```typescript
// Check circuit state
const state = circuitBreaker.getCircuitState('stripe');
console.log('Circuit state:', state);

// Check circuit metrics
const metrics = circuitBreaker.getMetrics('stripe');
console.log('Circuit metrics:', metrics);

// Reset circuit if needed
circuitBreaker.resetCircuit('stripe');
```

### Debugging Tips

1. **Enable Debug Logging**:
```typescript
process.env.LOG_LEVEL = 'debug';
```

2. **Use Test Breakpoints**:
```typescript
it('should debug issue', async () => {
  debugger; // Add breakpoint here
  await serviceCall();
});
```

3. **Monitor Real-time Metrics**:
```typescript
// Add monitoring during tests
monitoring.recordMetrics('test-service', duration, success);
```

4. **Check External Service Status**:
```bash
# Stripe status
curl https://status.stripe.com/

# PayPal status
curl https://www.paypal-status.com/

# Zoom status
curl https://status.zoom.us/
```

### Performance Issues

#### Slow Test Execution

**Problem**: Integration tests running slowly

**Optimizations**:
```typescript
// Use parallel execution
describe('Parallel Tests', () => {
  it('should run in parallel', async () => {
    // Test implementation
  }, { parallel: true });
});

// Reduce mock latency
serviceMocker.registerMock('stripe', {
  latency: { min: 10, max: 50 }, // Reduce latency
});

// Use test database transactions
beforeEach(async () => {
  await transaction.start();
});

afterEach(async () => {
  await transaction.rollback();
});
```

#### Memory Issues

**Problem**: Tests consuming too much memory

**Solutions**:
```typescript
// Cleanup after tests
afterAll(async () => {
  await cleanupTestData();
  serviceMocker.resetAllMocks();
  circuitBreaker.resetAllCircuits();
});

// Use smaller test datasets
const testData = generateMinimalTestData();
```

---

## Best Practices

### Test Design

1. **Isolation**: Each test should be independent
2. **Repeatability**: Tests should produce consistent results
3. **Speed**: Tests should run quickly
4. **Clarity**: Test intent should be obvious
5. **Maintenance**: Tests should be easy to update

### Data Management

1. **Test Data**: Use minimal, realistic test data
2. **Cleanup**: Always clean up after tests
3. **Isolation**: Use separate test databases
4. **Transactions**: Roll back changes after tests

### Error Handling

1. **Assertions**: Use specific assertions
2. **Messages**: Provide clear error messages
3. **Logging**: Log relevant debugging information
4. **Recovery**: Test error recovery scenarios

### Performance

1. **Thresholds**: Set realistic performance thresholds
2. **Monitoring**: Monitor test performance
3. **Optimization**: Optimize slow tests
4. **Parallelization**: Run tests in parallel when possible

---

This integration testing framework provides comprehensive coverage for external service integrations, ensuring reliability, performance, and maintainability of the StrellerMinds Backend application.
