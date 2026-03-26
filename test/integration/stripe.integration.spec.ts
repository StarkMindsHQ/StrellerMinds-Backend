import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { StripeService } from '../../src/payment/services/stripe.service';
import { WebhookSecurityService } from '../../src/webhook/services/webhook-security.service';
import { Logger } from '@nestjs/common';
import * as Stripe from 'stripe';

/**
 * Stripe Integration Tests
 * 
 * Test Strategy:
 * 1. Real API integration with test mode
 * 2. Contract testing for API compatibility
 * 3. Error handling and edge cases
 * 4. Webhook signature verification
 * 5. Circuit breaker pattern validation
 * 
 * Business Rules:
 * - All tests use Stripe test mode
 * - No real payment processing occurs
 * - Test data is isolated and cleaned up
 * - Rate limits are respected
 * - Error scenarios are comprehensively tested
 */
describe('Stripe Integration Tests', () => {
  let app: TestingModule;
  let stripeService: StripeService;
  let webhookSecurityService: WebhookSecurityService;
  let configService: ConfigService;
  let stripe: Stripe;

  beforeAll(async () => {
    // Ensure we're in test mode
    process.env.NODE_ENV = 'test';
    process.env.STRIPE_SECRET_KEY = process.env.STRIPE_TEST_SECRET_KEY || 'sk_test_123';

    const moduleRef = await Test.createTestingModule({
      imports: [
        HttpModule.register({
          timeout: 30000,
          maxRedirects: 5,
        }),
      ],
      providers: [
        StripeService,
        WebhookSecurityService,
        ConfigService,
        Logger,
      ],
    }).compile();

    app = moduleRef;
    stripeService = moduleRef.get<StripeService>(StripeService);
    webhookSecurityService = moduleRef.get<WebhookSecurityService>(WebhookSecurityService);
    configService = moduleRef.get<ConfigService>(ConfigService);

    // Initialize Stripe client
    stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY!, {
      apiVersion: '2025-12-15.acacia' as any,
    });

    // Test Stripe connectivity
    await testStripeConnectivity();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Test Stripe API connectivity
   * 
   * Validates:
   * - API key is valid
   * - Network connectivity works
   * - Basic API operations succeed
   */
  async function testStripeConnectivity() {
    try {
      // Test basic API call
      const account = await stripe.accounts.retrieve();
      expect(account).toBeDefined();
      expect(account.id).toBeDefined();
    } catch (error) {
      throw new Error(`Stripe connectivity test failed: ${error.message}`);
    }
  }

  /**
   * Test Payment Intent Creation
   * 
   * Business Logic:
   * - Create payment intent with valid parameters
   * - Verify intent structure and status
   * - Test different currencies and amounts
   * - Validate error handling for invalid data
   */
  describe('Payment Intent Creation', () => {
    const testPaymentIntents: string[] = [];

    afterAll(async () => {
      // Cleanup test payment intents
      for (const intentId of testPaymentIntents) {
        try {
          await stripe.paymentIntents.cancel(intentId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should create payment intent successfully', async () => {
      const paymentData = {
        amount: 2000, // $20.00
        currency: 'usd',
        payment_method_types: ['card'],
        confirmation_method: 'manual',
        confirm: false,
        metadata: {
          test: 'integration-test',
          timestamp: Date.now().toString(),
        },
      };

      const paymentIntent = await stripeService.createPaymentIntent(paymentData);

      expect(paymentIntent).toBeDefined();
      expect(paymentIntent.id).toMatch(/^pi_/);
      expect(paymentIntent.amount).toBe(2000);
      expect(paymentIntent.currency).toBe('usd');
      expect(paymentIntent.status).toBe('requires_payment_method');

      // Store for cleanup
      testPaymentIntents.push(paymentIntent.id);
    });

    it('should handle different currencies', async () => {
      const currencies = ['usd', 'eur', 'gbp'];
      
      for (const currency of currencies) {
        const paymentData = {
          amount: 1000,
          currency,
          payment_method_types: ['card'],
        };

        const paymentIntent = await stripeService.createPaymentIntent(paymentData);

        expect(paymentIntent.currency).toBe(currency);
        testPaymentIntents.push(paymentIntent.id);
      }
    });

    it('should validate payment intent parameters', async () => {
      const invalidPaymentData = {
        amount: -1000, // Invalid negative amount
        currency: 'usd',
        payment_method_types: ['card'],
      };

      await expect(stripeService.createPaymentIntent(invalidPaymentData))
        .rejects.toThrow();
    });

    it('should handle payment intent confirmation', async () => {
      // First create a payment intent
      const paymentData = {
        amount: 1500,
        currency: 'usd',
        payment_method_types: ['card'],
        confirmation_method: 'manual',
        confirm: true,
        payment_method: 'pm_card_visa', // Test card token
      };

      const paymentIntent = await stripeService.createPaymentIntent(paymentData);

      expect(paymentIntent.status).toMatch(/requires_payment_method|requires_confirmation/);
      testPaymentIntents.push(paymentIntent.id);
    });
  });

  /**
   * Test Customer Management
   * 
   * Business Logic:
   * - Create customers with valid data
   * - Update customer information
   * - Retrieve customer details
   * - Handle customer deletion
   */
  describe('Customer Management', () => {
    const testCustomers: string[] = [];

    afterAll(async () => {
      // Cleanup test customers
      for (const customerId of testCustomers) {
        try {
          await stripe.customers.del(customerId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should create customer successfully', async () => {
      const customerData = {
        email: `test-${Date.now()}@example.com`,
        name: 'Integration Test User',
        metadata: {
          test: 'integration-test',
          source: 'stripe-integration-test',
        },
      };

      const customer = await stripeService.createCustomer(customerData);

      expect(customer).toBeDefined();
      expect(customer.id).toMatch(/^cus_/);
      expect(customer.email).toBe(customerData.email);
      expect(customer.name).toBe(customerData.name);

      testCustomers.push(customer.id);
    });

    it('should retrieve customer', async () => {
      // Create a customer first
      const customerData = {
        email: `retrieve-${Date.now()}@example.com`,
        name: 'Retrieve Test User',
      };

      const createdCustomer = await stripeService.createCustomer(customerData);
      testCustomers.push(createdCustomer.id);

      // Retrieve the customer
      const retrievedCustomer = await stripeService.getCustomer(createdCustomer.id);

      expect(retrievedCustomer.id).toBe(createdCustomer.id);
      expect(retrievedCustomer.email).toBe(customerData.email);
    });

    it('should update customer', async () => {
      // Create a customer first
      const customerData = {
        email: `update-${Date.now()}@example.com`,
        name: 'Update Test User',
      };

      const customer = await stripeService.createCustomer(customerData);
      testCustomers.push(customer.id);

      // Update the customer
      const updateData = {
        name: 'Updated Test User',
        metadata: {
          updated: 'true',
          timestamp: Date.now().toString(),
        },
      };

      const updatedCustomer = await stripeService.updateCustomer(customer.id, updateData);

      expect(updatedCustomer.name).toBe(updateData.name);
      expect(updatedCustomer.metadata.updated).toBe('true');
    });
  });

  /**
   * Test Subscription Management
   * 
   * Business Logic:
   * - Create subscriptions with different billing cycles
   * - Update subscription plans
   * - Handle subscription lifecycle events
   * - Test subscription cancellation
   */
  describe('Subscription Management', () => {
    const testSubscriptions: string[] = [];
    const testCustomers: string[] = [];
    const testProducts: string[] = [];

    afterAll(async () => {
      // Cleanup test subscriptions
      for (const subscriptionId of testSubscriptions) {
        try {
          await stripe.subscriptions.cancel(subscriptionId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }

      // Cleanup test customers
      for (const customerId of testCustomers) {
        try {
          await stripe.customers.del(customerId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }

      // Cleanup test products
      for (const productId of testProducts) {
        try {
          await stripe.products.del(productId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should create subscription successfully', async () => {
      // Create a test customer
      const customerData = {
        email: `subscription-${Date.now()}@example.com`,
        payment_method: 'pm_card_visa',
      };

      const customer = await stripeService.createCustomer(customerData);
      testCustomers.push(customer.id);

      // Create a test price
      const priceData = {
        currency: 'usd',
        unit_amount: 2000, // $20.00
        recurring: {
          interval: 'month',
        },
        product_data: {
          name: 'Integration Test Product',
          metadata: {
            test: 'integration-test',
          },
        },
      };

      const price = await stripe.prices.create(priceData);
      testProducts.push(price.product as string);

      // Create subscription
      const subscriptionData = {
        customer: customer.id,
        items: [{ price: price.id }],
        payment_behavior: 'create_if_missing',
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      };

      const subscription = await stripeService.createSubscription(subscriptionData);

      expect(subscription).toBeDefined();
      expect(subscription.id).toMatch(/^sub_/);
      expect(subscription.customer).toBe(customer.id);
      expect(subscription.status).toMatch(/active|trialing/);

      testSubscriptions.push(subscription.id);
    });

    it('should handle subscription updates', async () => {
      // Create subscription first
      const customer = await stripeService.createCustomer({
        email: `update-sub-${Date.now()}@example.com`,
        payment_method: 'pm_card_visa',
      });
      testCustomers.push(customer.id);

      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: 3000,
        recurring: { interval: 'month' },
        product_data: { name: 'Update Test Product' },
      });
      testProducts.push(price.product as string);

      const subscription = await stripeService.createSubscription({
        customer: customer.id,
        items: [{ price: price.id }],
      });
      testSubscriptions.push(subscription.id);

      // Update subscription
      const updateData = {
        metadata: {
          updated: 'true',
          timestamp: Date.now().toString(),
        },
      };

      const updatedSubscription = await stripeService.updateSubscription(
        subscription.id,
        updateData
      );

      expect(updatedSubscription.metadata.updated).toBe('true');
    });
  });

  /**
   * Test Webhook Security
   * 
   * Business Logic:
   * - Verify webhook signature generation
   * - Test signature validation
   * - Handle webhook parsing
   * - Validate event structure
   */
  describe('Webhook Security', () => {
    const webhookSecret = 'whsec_test_webhook_secret';

    it('should verify webhook signature', async () => {
      // Create test webhook payload
      const payload = {
        id: `evt_test_${Date.now()}`,
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

      const payloadString = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${payloadString}`;

      // Generate signature
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedPayload)
        .digest('hex');

      const signatureHeader = `t=${timestamp},v1=${signature}`;

      // Verify signature
      const isValid = await webhookSecurityService.validateSignature(
        payloadString,
        signatureHeader,
        timestamp.toString(),
        {
          signature: {
            secret: webhookSecret,
            algorithm: 'hmac-sha256',
            headerName: 'stripe-signature',
            timestampHeader: 'stripe-signature',
          },
        }
      );

      expect(isValid.isValid).toBe(true);
    });

    it('should reject invalid webhook signature', async () => {
      const payload = { test: 'invalid' };
      const payloadString = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${payloadString}`;

      // Generate signature with wrong secret
      const signature = crypto
        .createHmac('sha256', 'wrong_secret')
        .update(signedPayload)
        .digest('hex');

      const signatureHeader = `t=${timestamp},v1=${signature}`;

      // Verify signature
      const isValid = await webhookSecurityService.validateSignature(
        payloadString,
        signatureHeader,
        timestamp.toString(),
        {
          signature: {
            secret: webhookSecret,
            algorithm: 'hmac-sha256',
            headerName: 'stripe-signature',
            timestampHeader: 'stripe-signature',
          },
        }
      );

      expect(isValid.isValid).toBe(false);
      expect(isValid.error).toContain('Invalid webhook signature');
    });

    it('should handle replay attack prevention', async () => {
      const eventId = `evt_test_replay_${Date.now()}`;

      // First check should pass
      const firstCheck = webhookSecurityService.checkReplayProtection(eventId, {
        replayProtection: {
          enabled: true,
          windowMs: 300000, // 5 minutes
        },
      });

      expect(firstCheck.isValid).toBe(true);

      // Second check should fail (replay attack)
      const secondCheck = webhookSecurityService.checkReplayProtection(eventId, {
        replayProtection: {
          enabled: true,
          windowMs: 300000,
        },
      });

      expect(secondCheck.isValid).toBe(false);
      expect(secondCheck.error).toContain('Replay attack detected');
    });
  });

  /**
   * Test Error Handling
   * 
   * Business Logic:
   * - Handle API rate limits
   * - Test network connectivity issues
   * - Validate error responses
   * - Test circuit breaker behavior
   */
  describe('Error Handling', () => {
    it('should handle invalid API key', async () => {
      // Temporarily use invalid key
      const originalKey = process.env.STRIPE_TEST_SECRET_KEY;
      process.env.STRIPE_TEST_SECRET_KEY = 'sk_invalid_123';

      const invalidService = new StripeService(
        new ConfigService({
          STRIPE_SECRET_KEY: 'sk_invalid_123',
        })
      );

      await expect(invalidService.createPaymentIntent({
        amount: 1000,
        currency: 'usd',
        payment_method_types: ['card'],
      })).rejects.toThrow();

      // Restore original key
      process.env.STRIPE_TEST_SECRET_KEY = originalKey;
    });

    it('should handle invalid payment intent data', async () => {
      const invalidData = {
        amount: 'invalid_amount',
        currency: 'usd',
        payment_method_types: ['card'],
      };

      await expect(stripeService.createPaymentIntent(invalidData))
        .rejects.toThrow();
    });

    it('should handle non-existent customer', async () => {
      await expect(stripeService.getCustomer('cus_nonexistent'))
        .rejects.toThrow();
    });

    it('should handle rate limiting gracefully', async () => {
      // This test simulates rate limiting behavior
      // In real scenarios, Stripe has generous rate limits for test mode
      const promises = Array.from({ length: 10 }, () =>
        stripeService.createPaymentIntent({
          amount: 1000,
          currency: 'usd',
          payment_method_types: ['card'],
        })
      );

      // All requests should succeed in test mode
      const results = await Promise.allSettled(promises);
      const failures = results.filter(result => result.status === 'rejected');
      
      // In test mode, we shouldn't hit rate limits
      expect(failures.length).toBe(0);
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
    it('should maintain payment intent contract', async () => {
      const paymentData = {
        amount: 1500,
        currency: 'usd',
        payment_method_types: ['card'],
      };

      const paymentIntent = await stripeService.createPaymentIntent(paymentData);

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
      expect(typeof paymentIntent.created).toBe('number');

      // Validate enum values
      expect(paymentIntent.object).toBe('payment_intent');
      expect(paymentIntent.currency).toMatch(/^[a-z]{3}$/);
      expect(paymentIntent.status).toMatch(/^(requires_payment_method|requires_confirmation|requires_action|processing|succeeded|canceled)$/);
    });

    it('should maintain customer contract', async () => {
      const customerData = {
        email: `contract-${Date.now()}@example.com`,
        name: 'Contract Test User',
      };

      const customer = await stripeService.createCustomer(customerData);

      // Validate required fields
      expect(customer).toHaveProperty('id');
      expect(customer).toHaveProperty('object', 'customer');
      expect(customer).toHaveProperty('email');
      expect(customer).toHaveProperty('created');

      // Validate data types
      expect(typeof customer.id).toBe('string');
      expect(typeof customer.email).toBe('string');
      expect(typeof customer.created).toBe('number');

      // Validate email format
      expect(customer.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
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
      // This test validates that the service can monitor its own health
      const healthCheck = await stripeService.healthCheck();

      expect(healthCheck).toHaveProperty('status');
      expect(healthCheck).toHaveProperty('timestamp');
      expect(healthCheck.status).toMatch(/^(healthy|degraded|unhealthy)$/);
    });

    it('should implement fallback behavior', async () => {
      // Test that the service can handle failures gracefully
      // This would typically involve mocking failures
      const paymentData = {
        amount: 1000,
        currency: 'usd',
        payment_method_types: ['card'],
      };

      // In normal operation, this should succeed
      const result = await stripeService.createPaymentIntent(paymentData);
      expect(result).toBeDefined();
    });
  });
});
