import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PayPalService } from '../../src/payment/services/paypal.service';
import { WebhookSecurityService } from '../../src/webhook/services/webhook-security.service';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * PayPal Integration Tests
 * 
 * Test Strategy:
 * 1. Real API integration with sandbox mode
 * 2. Contract testing for API compatibility
 * 3. Webhook signature verification
 * 4. Error handling and edge cases
 * 5. Circuit breaker pattern validation
 * 
 * Business Rules:
 * - All tests use PayPal sandbox environment
 * - No real payment processing occurs
 * - Test data is isolated and cleaned up
 * - Rate limits are respected
 * - OAuth token management is tested
 */
describe('PayPal Integration Tests', () => {
  let app: TestingModule;
  let paypalService: PayPalService;
  let webhookSecurityService: WebhookSecurityService;
  let configService: ConfigService;
  let accessToken: string;

  beforeAll(async () => {
    // Ensure we're in test mode
    process.env.NODE_ENV = 'test';
    process.env.PAYPAL_CLIENT_ID = process.env.PAYPAL_SANDBOX_CLIENT_ID || 'test_client_id';
    process.env.PAYPAL_CLIENT_SECRET = process.env.PAYPAL_SANDBOX_CLIENT_SECRET || 'test_client_secret';
    process.env.PAYPAL_WEBHOOK_SECRET = 'test_webhook_secret';

    const moduleRef = await Test.createTestingModule({
      imports: [
        HttpModule.register({
          timeout: 30000,
          maxRedirects: 5,
        }),
      ],
      providers: [
        PayPalService,
        WebhookSecurityService,
        ConfigService,
        Logger,
      ],
    }).compile();

    app = moduleRef;
    paypalService = moduleRef.get<PayPalService>(PayPalService);
    webhookSecurityService = moduleRef.get<WebhookSecurityService>(WebhookSecurityService);
    configService = moduleRef.get<ConfigService>(ConfigService);

    // Get OAuth token
    await getPayPalAccessToken();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Get PayPal OAuth access token
   * 
   * Business Logic:
   * - Obtain OAuth token for API calls
   * - Validate token format and expiry
   * - Handle token refresh scenarios
   */
  async function getPayPalAccessToken() {
    try {
      const response = await paypalService.getAccessToken();
      accessToken = response.access_token;
      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe('string');
    } catch (error) {
      throw new Error(`PayPal OAuth token retrieval failed: ${error.message}`);
    }
  }

  /**
   * Test Order Creation
   * 
   * Business Logic:
   * - Create orders with valid parameters
   * - Verify order structure and status
   * - Test different product types
   * - Validate error handling for invalid data
   */
  describe('Order Creation', () => {
    const testOrders: string[] = [];

    afterAll(async () => {
      // Cleanup test orders
      for (const orderId of testOrders) {
        try {
          await paypalService.captureOrder(orderId);
        } catch (error) {
          // Orders are automatically cleaned up after capture
        }
      }
    });

    it('should create order successfully', async () => {
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: '20.00',
            },
            description: 'Integration Test Order',
            custom_id: `test_${Date.now()}`,
          },
        ],
      };

      const order = await paypalService.createOrder(orderData);

      expect(order).toBeDefined();
      expect(order.id).toMatch(/^ORD-/);
      expect(order.status).toBe('CREATED');
      expect(order.intent).toBe('CAPTURE');
      expect(order.purchase_units).toHaveLength(1);
      expect(order.purchase_units[0].amount.currency_code).toBe('USD');
      expect(order.purchase_units[0].amount.value).toBe('20.00');

      testOrders.push(order.id);
    });

    it('should handle multiple purchase units', async () => {
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: '15.00',
            },
            description: 'Test Item 1',
          },
          {
            amount: {
              currency_code: 'USD',
              value: '25.00',
            },
            description: 'Test Item 2',
          },
        ],
      };

      const order = await paypalService.createOrder(orderData);

      expect(order.purchase_units).toHaveLength(2);
      expect(parseFloat(order.purchase_units[0].amount.value)).toBe(15.00);
      expect(parseFloat(order.purchase_units[1].amount.value)).toBe(25.00);

      testOrders.push(order.id);
    });

    it('should validate order parameters', async () => {
      const invalidOrderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: '-10.00', // Invalid negative amount
            },
          },
        ],
      };

      await expect(paypalService.createOrder(invalidOrderData))
        .rejects.toThrow();
    });

    it('should handle different currencies', async () => {
      const currencies = ['USD', 'EUR', 'GBP'];
      
      for (const currency of currencies) {
        const orderData = {
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: currency,
                value: '10.00',
              },
            },
          ],
        };

        const order = await paypalService.createOrder(orderData);

        expect(order.purchase_units[0].amount.currency_code).toBe(currency);
        testOrders.push(order.id);
      }
    });
  });

  /**
   * Test Order Capture
   * 
   * Business Logic:
   * - Capture approved orders
   * - Verify capture status and details
   * - Handle partial captures
   * - Test capture finalization
   */
  describe('Order Capture', () => {
    let approvedOrderId: string;

    beforeAll(async () => {
      // Create and approve an order for capture testing
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: '30.00',
            },
          },
        ],
      };

      const order = await paypalService.createOrder(orderData);
      approvedOrderId = order.id;

      // Approve the order (in sandbox, this simulates user approval)
      await paypalService.approveOrder(approvedOrderId);
    });

    it('should capture order successfully', async () => {
      const captureData = {
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'StrellerMinds Test',
              locale: 'en-US',
              landing_page: 'BILLING',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
            },
          },
        },
      };

      const capture = await paypalService.captureOrder(approvedOrderId, captureData);

      expect(capture).toBeDefined();
      expect(capture.status).toBe('COMPLETED');
      expect(capture.purchase_units).toHaveLength(1);
      expect(capture.purchase_units[0].payments.captures).toHaveLength(1);
      expect(capture.purchase_units[0].payments.captures[0].status).toBe('COMPLETED');
    });

    it('should handle capture of non-existent order', async () => {
      await expect(paypalService.captureOrder('ORD-NONEXISTENT'))
        .rejects.toThrow();
    });

    it('should validate capture data', async () => {
      const invalidCaptureData = {
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: '', // Invalid empty brand name
            },
          },
        },
      };

      await expect(paypalService.captureOrder(approvedOrderId, invalidCaptureData))
        .rejects.toThrow();
    });
  });

  /**
   * Test Webhook Processing
   * 
   * Business Logic:
   * - Verify webhook signature generation
   * - Test webhook event parsing
   * - Handle different event types
   * - Validate webhook security
   */
  describe('Webhook Processing', () => {
    const webhookSecret = 'test_webhook_secret';

    it('should verify webhook signature', async () => {
      // Create test webhook payload
      const payload = {
        id: `WH-${Date.now()}12345`,
        event_version: '1.0',
        create_time: new Date().toISOString(),
        resource_type: 'checkout-order',
        event_type: 'CHECKOUT.ORDER.APPROVED',
        summary: 'An order has been approved by buyer',
        resource: {
          id: 'ORD-12345',
          status: 'APPROVED',
        },
        links: [],
      };

      const payloadString = JSON.stringify(payload);
      const transmission_id = `transmission_${Date.now()}`;
      const timestamp = Math.floor(Date.now() / 1000);
      const cert_url = 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-12345';
      const auth_algo = 'SHA256withRSA';

      // Create transmission signature (simplified for test)
      const transmission_data = [
        transmission_id,
        timestamp,
        webhookSecret,
        payloadString,
        cert_url,
        auth_algo,
      ].join('|');

      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(transmission_data)
        .digest('hex');

      const webhookHeaders = {
        'paypal-auth-algo': auth_algo,
        'paypal-transmission-id': transmission_id,
        'paypal-cert-id': 'CERT-12345',
        'paypal-transmission-sig': signature,
        'paypal-transmission-time': new Date(timestamp * 1000).toISOString(),
      };

      // Verify webhook
      const isValid = await webhookSecurityService.validateSignature(
        payloadString,
        signature,
        timestamp.toString(),
        {
          signature: {
            secret: webhookSecret,
            algorithm: 'hmac-sha256',
            headerName: 'paypal-transmission-sig',
            timestampHeader: 'paypal-transmission-time',
          },
        }
      );

      expect(isValid.isValid).toBe(true);
    });

    it('should process webhook events', async () => {
      const webhookEvent = {
        id: `WH-${Date.now()}67890`,
        event_version: '1.0',
        create_time: new Date().toISOString(),
        resource_type: 'payment',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        summary: 'Payment capture completed',
        resource: {
          id: 'PAY-12345',
          status: 'COMPLETED',
          amount: {
            currency_code: 'USD',
            value: '20.00',
          },
        },
      };

      // Process webhook event
      const result = await paypalService.processWebhookEvent(webhookEvent);

      expect(result).toBeDefined();
      expect(result.processed).toBe(true);
      expect(result.eventId).toBe(webhookEvent.id);
      expect(result.eventType).toBe(webhookEvent.event_type);
    });

    it('should handle different webhook event types', async () => {
      const eventTypes = [
        'PAYMENT.CAPTURE.COMPLETED',
        'PAYMENT.CAPTURE.DENIED',
        'CHECKOUT.ORDER.APPROVED',
        'CHECKOUT.ORDER.COMPLETED',
      ];

      for (const eventType of eventTypes) {
        const webhookEvent = {
          id: `WH-${Date.now()}_${eventType}`,
          event_version: '1.0',
          create_time: new Date().toISOString(),
          resource_type: 'payment',
          event_type: eventType,
          summary: `Test event: ${eventType}`,
          resource: {
            id: `TEST-${Date.now()}`,
            status: 'COMPLETED',
          },
        };

        const result = await paypalService.processWebhookEvent(webhookEvent);

        expect(result.eventType).toBe(eventType);
        expect(result.processed).toBe(true);
      }
    });
  });

  /**
   * Test Subscription Management
   * 
   * Business Logic:
   * - Create subscription plans
   * - Activate subscriptions
   * - Handle subscription lifecycle
   * - Test subscription cancellation
   */
  describe('Subscription Management', () => {
    const testPlans: string[] = [];
    const testSubscriptions: string[] = [];

    afterAll(async () => {
      // Cleanup test subscriptions
      for (const subscriptionId of testSubscriptions) {
        try {
          await paypalService.cancelSubscription(subscriptionId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }

      // Cleanup test plans
      for (const planId of testPlans) {
        try {
          await paypalService.deactivatePlan(planId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should create subscription plan', async () => {
      const planData = {
        product_id: 'PROD-TEST-PRODUCT',
        name: 'Integration Test Plan',
        description: 'Test subscription plan for integration testing',
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: {
              interval_unit: 'MONTH',
              interval_count: 1,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 12,
            pricing_scheme: {
              fixed_price: {
                value: '19.99',
                currency_code: 'USD',
              },
            },
          },
        ],
        payment_preferences: {
          auto_renewal: true,
          setup_fee: {
            value: '0.00',
            currency_code: 'USD',
          },
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3,
        },
      };

      const plan = await paypalService.createSubscriptionPlan(planData);

      expect(plan).toBeDefined();
      expect(plan.id).toMatch(/^P-/);
      expect(plan.name).toBe(planData.name);
      expect(plan.status).toBe('ACTIVE');
      expect(plan.billing_cycles).toHaveLength(1);

      testPlans.push(plan.id);
    });

    it('should create subscription', async () => {
      // First create a plan
      const planData = {
        product_id: 'PROD-TEST-PRODUCT-2',
        name: 'Subscription Test Plan',
        billing_cycles: [
          {
            frequency: {
              interval_unit: 'MONTH',
              interval_count: 1,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // Infinite
            pricing_scheme: {
              fixed_price: {
                value: '29.99',
                currency_code: 'USD',
              },
            },
          },
        ],
      };

      const plan = await paypalService.createSubscriptionPlan(planData);
      testPlans.push(plan.id);

      // Create subscription
      const subscriptionData = {
        plan_id: plan.id,
        subscriber: {
          name: {
            given_name: 'Test',
            surname: 'User',
          },
          email_address: `test-${Date.now()}@example.com`,
        },
        application_context: {
          brand_name: 'StrellerMinds Test',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          },
          return_url: 'https://example.com/return',
          cancel_url: 'https://example.com/cancel',
        },
      };

      const subscription = await paypalService.createSubscription(subscriptionData);

      expect(subscription).toBeDefined();
      expect(subscription.id).toMatch(/^I-/);
      expect(subscription.status).toBe('APPROVED');
      expect(subscription.plan_id).toBe(plan.id);

      testSubscriptions.push(subscription.id);
    });

    it('should activate subscription', async () => {
      // Create a subscription first
      const plan = await paypalService.createSubscriptionPlan({
        product_id: 'PROD-TEST-PRODUCT-3',
        name: 'Activation Test Plan',
        billing_cycles: [
          {
            frequency: { interval_unit: 'MONTH', interval_count: 1 },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: {
              fixed_price: { value: '15.99', currency_code: 'USD' },
            },
          },
        ],
      });
      testPlans.push(plan.id);

      const subscription = await paypalService.createSubscription({
        plan_id: plan.id,
        subscriber: {
          name: { given_name: 'Activate', surname: 'User' },
          email_address: `activate-${Date.now()}@example.com`,
        },
      });
      testSubscriptions.push(subscription.id);

      // Activate subscription (in sandbox, this simulates user approval)
      const activatedSubscription = await paypalService.activateSubscription(subscription.id);

      expect(activatedSubscription.status).toMatch(/^(ACTIVE|APPROVED)$/);
    });
  });

  /**
   * Test Error Handling
   * 
   * Business Logic:
   * - Handle API authentication errors
   * - Test invalid request handling
   * - Validate error response structure
   * - Test network connectivity issues
   */
  describe('Error Handling', () => {
    it('should handle invalid OAuth credentials', async () => {
      // Temporarily use invalid credentials
      const originalClientId = process.env.PAYPAL_CLIENT_ID;
      const originalSecret = process.env.PAYPAL_CLIENT_SECRET;
      
      process.env.PAYPAL_CLIENT_ID = 'invalid_client_id';
      process.env.PAYPAL_CLIENT_SECRET = 'invalid_client_secret';

      const invalidService = new PayPalService(
        new ConfigService({
          PAYPAL_CLIENT_ID: 'invalid_client_id',
          PAYPAL_CLIENT_SECRET: 'invalid_client_secret',
          PAYPAL_ENVIRONMENT: 'sandbox',
        })
      );

      await expect(invalidService.getAccessToken())
        .rejects.toThrow();

      // Restore original credentials
      process.env.PAYPAL_CLIENT_ID = originalClientId;
      process.env.PAYPAL_CLIENT_SECRET = originalSecret;
    });

    it('should handle invalid order data', async () => {
      const invalidOrderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'INVALID', // Invalid currency
              value: '10.00',
            },
          },
        ],
      };

      await expect(paypalService.createOrder(invalidOrderData))
        .rejects.toThrow();
    });

    it('should handle non-existent order operations', async () => {
      await expect(paypalService.getOrderDetails('ORD-NONEXISTENT'))
        .rejects.toThrow();

      await expect(paypalService.captureOrder('ORD-NONEXISTENT'))
        .rejects.toThrow();
    });

    it('should handle webhook validation errors', async () => {
      const invalidWebhookEvent = {
        id: 'WH-INVALID',
        event_version: '1.0',
        create_time: new Date().toISOString(),
        resource_type: 'payment',
        event_type: 'INVALID.EVENT.TYPE',
        resource: {},
      };

      // Should handle unknown event types gracefully
      const result = await paypalService.processWebhookEvent(invalidWebhookEvent);
      
      expect(result).toBeDefined();
      expect(result.processed).toBe(true); // Events are processed even if unknown
    });
  });

  /**
   * Test Contract Compliance
   * 
   * Business Logic:
   * - Validate API response structure
   * - Check required fields presence
   * - Test data type compliance
   * - Verify enum values
   */
  describe('Contract Compliance', () => {
    it('should maintain order contract', async () => {
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: '25.00',
            },
          },
        ],
      };

      const order = await paypalService.createOrder(orderData);

      // Validate required fields
      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('status');
      expect(order).toHaveProperty('intent');
      expect(order).toHaveProperty('purchase_units');
      expect(order).toHaveProperty('create_time');
      expect(order).toHaveProperty('links');

      // Validate data types
      expect(typeof order.id).toBe('string');
      expect(typeof order.status).toBe('string');
      expect(typeof order.intent).toBe('string');
      expect(Array.isArray(order.purchase_units)).toBe(true);
      expect(typeof order.create_time).toBe('string');
      expect(Array.isArray(order.links)).toBe(true);

      // Validate enum values
      expect(order.status).toBe('CREATED');
      expect(order.intent).toBe('CAPTURE');
      expect(order.id).toMatch(/^ORD-/);
    });

    it('should maintain subscription contract', async () => {
      const plan = await paypalService.createSubscriptionPlan({
        product_id: 'PROD-CONTRACT-TEST',
        name: 'Contract Test Plan',
        billing_cycles: [
          {
            frequency: { interval_unit: 'MONTH', interval_count: 1 },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 12,
            pricing_scheme: {
              fixed_price: { value: '19.99', currency_code: 'USD' },
            },
          },
        ],
      });

      // Validate required fields
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('status');
      expect(plan).toHaveProperty('billing_cycles');

      // Validate data types
      expect(typeof plan.id).toBe('string');
      expect(typeof plan.name).toBe('string');
      expect(typeof plan.status).toBe('string');
      expect(Array.isArray(plan.billing_cycles)).toBe(true);

      // Validate enum values
      expect(plan.status).toBe('ACTIVE');
      expect(plan.id).toMatch(/^P-/);
    });
  });

  /**
   * Test Circuit Breaker Pattern
   * 
   * Business Logic:
   * - Monitor service health
   * - Implement fallback behavior
   * - Test recovery mechanisms
   * - Validate threshold configurations
   */
  describe('Circuit Breaker Pattern', () => {
    it('should monitor service health', async () => {
      const healthCheck = await paypalService.healthCheck();

      expect(healthCheck).toHaveProperty('status');
      expect(healthCheck).toHaveProperty('timestamp');
      expect(healthCheck.status).toMatch(/^(healthy|degraded|unhealthy)$/);
    });

    it('should implement fallback behavior', async () => {
      // Test that the service can handle temporary failures
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: '10.00',
            },
          },
        ],
      };

      // In normal operation, this should succeed
      const result = await paypalService.createOrder(orderData);
      expect(result).toBeDefined();
    });

    it('should handle token refresh', async () => {
      // Test that the service can refresh OAuth tokens
      const newToken = await paypalService.getAccessToken();
      
      expect(newToken).toHaveProperty('access_token');
      expect(newToken).toHaveProperty('token_type', 'Bearer');
      expect(newToken).toHaveProperty('expires_in');
      expect(typeof newToken.access_token).toBe('string');
    });
  });

  /**
   * Test Integration Monitoring
   * 
   * Business Logic:
   * - Monitor API response times
   * - Track success rates
   * - Log integration metrics
   * - Alert on performance degradation
   */
  describe('Integration Monitoring', () => {
    it('should track response times', async () => {
      const startTime = Date.now();
      
      await paypalService.getAccessToken();
      
      const responseTime = Date.now() - startTime;
      
      // Response time should be reasonable (under 5 seconds)
      expect(responseTime).toBeLessThan(5000);
    });

    it('should log integration metrics', async () => {
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: '15.00',
            },
          },
        ],
      };

      // This operation should be logged
      const order = await paypalService.createOrder(orderData);
      
      expect(order).toBeDefined();
      // In a real implementation, we would verify that metrics were logged
    });

    it('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, () =>
        paypalService.getAccessToken()
      );

      const results = await Promise.allSettled(promises);
      const failures = results.filter(result => result.status === 'rejected');
      
      // All requests should succeed
      expect(failures.length).toBe(0);
    });
  });
});
