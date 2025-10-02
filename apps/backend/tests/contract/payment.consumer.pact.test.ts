import { Pact, Matchers } from '@pact-foundation/pact';
import { StripeService } from '../../../src/payment/stripe.service';
import { PaymentService } from '../../../src/payment/payment.service';
import path from 'path';

describe('Payment Service Consumer Pact', () => {
  const provider = new Pact({
    consumer: 'StrellerMinds-Backend',
    provider: 'Stripe-API',
    port: 1237,
    log: path.resolve(process.cwd(), 'logs', 'payment-pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  let stripeService: StripeService;
  let paymentService: PaymentService;

  beforeAll(() => {
    return provider.setup().then(() => {
      // Create service instances
      stripeService = new StripeService({} as any); // configService
      paymentService = new PaymentService(
        {} as any, // paymentRepository
        stripeService,
        {} as any, // paymentAnalyticsService
      );

      // Override the Stripe client for testing
      (stripeService as any).stripe = {
        customers: {
          create: jest.fn(),
          retrieve: jest.fn(),
        },
        paymentIntents: {
          create: jest.fn(),
          confirm: jest.fn(),
          retrieve: jest.fn(),
        },
        webhooks: {
          constructEvent: jest.fn(),
        },
      };
    });
  });

  afterAll(() => {
    return provider.finalize();
  });

  describe('Stripe Payment Service', () => {
    it('should create a customer successfully', () => {
      const customerData = {
        email: 'user@example.com',
        name: 'John Doe',
        phone: '+1234567890',
      };

      const expectedCustomer = {
        id: 'cus_test123456789',
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        created: 1640995200,
        livemode: false,
        object: 'customer',
      };

      return provider
        .addInteraction({
          state: 'Stripe API is available',
          uponReceiving: 'a request to create a customer',
          withRequest: {
            method: 'POST',
            path: '/v1/customers',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: Matchers.like('Bearer sk_test_...'),
            },
            body: Matchers.like('email=user@example.com&name=John%20Doe&phone=%2B1234567890'),
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: Matchers.like(expectedCustomer.id),
              email: Matchers.like(expectedCustomer.email),
              name: Matchers.like(expectedCustomer.name),
              phone: Matchers.like(expectedCustomer.phone),
              created: Matchers.integer(expectedCustomer.created),
              livemode: Matchers.boolean(expectedCustomer.livemode),
              object: Matchers.like(expectedCustomer.object),
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the Stripe customer creation
            (stripeService as any).stripe.customers.create.mockResolvedValue(expectedCustomer);

            // Call the actual service method
            const result = await stripeService.createCustomer(customerData);

            // Assert the result
            expect(result).toBeDefined();
            expect(result.id).toBe(expectedCustomer.id);
            expect(result.email).toBe(expectedCustomer.email);
            expect(result.name).toBe(expectedCustomer.name);
          });
        });
    });

    it('should create a payment intent successfully', () => {
      const paymentIntentData = {
        amount: 2999, // $29.99 in cents
        currency: 'usd',
        customerId: 'cus_test123456789',
        description: 'Course enrollment - Blockchain Fundamentals',
        metadata: {
          courseId: 'course_123',
          userId: 'user_456',
        },
      };

      const expectedPaymentIntent = {
        id: 'pi_test123456789',
        amount: paymentIntentData.amount,
        currency: paymentIntentData.currency,
        customer: paymentIntentData.customerId,
        description: paymentIntentData.description,
        metadata: paymentIntentData.metadata,
        status: 'requires_payment_method',
        client_secret: 'pi_test123456789_secret_abc123',
        created: 1640995200,
        livemode: false,
        object: 'payment_intent',
      };

      return provider
        .addInteraction({
          state: 'customer exists in Stripe',
          uponReceiving: 'a request to create a payment intent',
          withRequest: {
            method: 'POST',
            path: '/v1/payment_intents',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: Matchers.like('Bearer sk_test_...'),
            },
            body: Matchers.like(
              'amount=2999&currency=usd&customer=cus_test123456789&description=Course%20enrollment%20-%20Blockchain%20Fundamentals&metadata%5BcourseId%5D=course_123&metadata%5BuserId%5D=user_456&automatic_payment_methods%5Benabled%5D=true',
            ),
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: Matchers.like(expectedPaymentIntent.id),
              amount: Matchers.integer(expectedPaymentIntent.amount),
              currency: Matchers.like(expectedPaymentIntent.currency),
              customer: Matchers.like(expectedPaymentIntent.customer),
              description: Matchers.like(expectedPaymentIntent.description),
              metadata: Matchers.like(expectedPaymentIntent.metadata),
              status: Matchers.like(expectedPaymentIntent.status),
              client_secret: Matchers.like(expectedPaymentIntent.client_secret),
              created: Matchers.integer(expectedPaymentIntent.created),
              livemode: Matchers.boolean(expectedPaymentIntent.livemode),
              object: Matchers.like(expectedPaymentIntent.object),
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the Stripe payment intent creation
            (stripeService as any).stripe.paymentIntents.create.mockResolvedValue(
              expectedPaymentIntent,
            );

            // Call the actual service method
            const result = await stripeService.createPaymentIntent(paymentIntentData);

            // Assert the result
            expect(result).toBeDefined();
            expect(result.id).toBe(expectedPaymentIntent.id);
            expect(result.amount).toBe(expectedPaymentIntent.amount);
            expect(result.currency).toBe(expectedPaymentIntent.currency);
            expect(result.status).toBe(expectedPaymentIntent.status);
          });
        });
    });

    it('should confirm a payment intent successfully', () => {
      const paymentIntentId = 'pi_test123456789';
      const paymentMethodId = 'pm_test123456789';

      const expectedPaymentIntent = {
        id: paymentIntentId,
        amount: 2999,
        currency: 'usd',
        customer: 'cus_test123456789',
        status: 'succeeded',
        payment_method: paymentMethodId,
        charges: {
          data: [
            {
              id: 'ch_test123456789',
              amount: 2999,
              status: 'succeeded',
              paid: true,
            },
          ],
        },
        created: 1640995200,
        livemode: false,
        object: 'payment_intent',
      };

      return provider
        .addInteraction({
          state: 'payment intent exists and requires confirmation',
          uponReceiving: 'a request to confirm a payment intent',
          withRequest: {
            method: 'POST',
            path: `/v1/payment_intents/${paymentIntentId}/confirm`,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: Matchers.like('Bearer sk_test_...'),
            },
            body: Matchers.like(`payment_method=${paymentMethodId}`),
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: Matchers.like(expectedPaymentIntent.id),
              amount: Matchers.integer(expectedPaymentIntent.amount),
              currency: Matchers.like(expectedPaymentIntent.currency),
              customer: Matchers.like(expectedPaymentIntent.customer),
              status: Matchers.like(expectedPaymentIntent.status),
              payment_method: Matchers.like(expectedPaymentIntent.payment_method),
              charges: {
                data: Matchers.eachLike({
                  id: Matchers.like('ch_test123456789'),
                  amount: Matchers.integer(2999),
                  status: Matchers.like('succeeded'),
                  paid: Matchers.boolean(true),
                }),
              },
              created: Matchers.integer(expectedPaymentIntent.created),
              livemode: Matchers.boolean(expectedPaymentIntent.livemode),
              object: Matchers.like(expectedPaymentIntent.object),
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the Stripe payment intent confirmation
            (stripeService as any).stripe.paymentIntents.confirm.mockResolvedValue(
              expectedPaymentIntent,
            );

            // Call the actual service method
            const result = await stripeService.confirmPaymentIntent(
              paymentIntentId,
              paymentMethodId,
            );

            // Assert the result
            expect(result).toBeDefined();
            expect(result.id).toBe(expectedPaymentIntent.id);
            expect(result.status).toBe(expectedPaymentIntent.status);
            expect(result.payment_method).toBe(expectedPaymentIntent.payment_method);
          });
        });
    });

    it('should handle payment intent creation failure', () => {
      const invalidPaymentData = {
        amount: -100, // Invalid negative amount
        currency: 'usd',
        customerId: 'cus_test123456789',
      };

      const errorResponse = {
        error: {
          type: 'invalid_request_error',
          code: 'parameter_invalid_integer',
          message: 'Invalid integer: -100',
          param: 'amount',
        },
      };

      return provider
        .addInteraction({
          state: 'Stripe API rejects invalid payment data',
          uponReceiving: 'a request to create payment intent with invalid amount',
          withRequest: {
            method: 'POST',
            path: '/v1/payment_intents',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: Matchers.like('Bearer sk_test_...'),
            },
            body: Matchers.like('amount=-100&currency=usd&customer=cus_test123456789'),
          },
          willRespondWith: {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              error: {
                type: Matchers.like(errorResponse.error.type),
                code: Matchers.like(errorResponse.error.code),
                message: Matchers.like(errorResponse.error.message),
                param: Matchers.like(errorResponse.error.param),
              },
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the Stripe payment intent creation to throw an error
            (stripeService as any).stripe.paymentIntents.create.mockRejectedValue(
              new Error('Invalid amount'),
            );

            // Call the service method and expect it to throw
            await expect(stripeService.createPaymentIntent(invalidPaymentData)).rejects.toThrow();
          });
        });
    });

    it('should handle webhook signature verification', () => {
      const webhookPayload = JSON.stringify({
        id: 'evt_test123456789',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123456789',
            status: 'succeeded',
          },
        },
      });

      const signature = 't=1640995200,v1=abc123def456...';

      const expectedEvent = {
        id: 'evt_test123456789',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123456789',
            status: 'succeeded',
          },
        },
      };

      return provider
        .addInteraction({
          state: 'webhook signature is valid',
          uponReceiving: 'a webhook signature verification request',
          withRequest: {
            method: 'POST',
            path: '/v1/webhooks',
            headers: {
              'Content-Type': 'application/json',
              'Stripe-Signature': Matchers.like(signature),
            },
            body: Matchers.like(webhookPayload),
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: Matchers.like(expectedEvent.id),
              object: Matchers.like(expectedEvent.object),
              type: Matchers.like(expectedEvent.type),
              data: {
                object: {
                  id: Matchers.like(expectedEvent.data.object.id),
                  status: Matchers.like(expectedEvent.data.object.status),
                },
              },
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the Stripe webhook verification
            (stripeService as any).stripe.webhooks.constructEvent.mockReturnValue(expectedEvent);

            // Call the actual service method
            const result = stripeService.verifyWebhookSignature(
              Buffer.from(webhookPayload),
              signature,
              'whsec_test123456789',
            );

            // Assert the result
            expect(result).toBeDefined();
            expect(result.id).toBe(expectedEvent.id);
            expect(result.type).toBe(expectedEvent.type);
          });
        });
    });
  });
});
