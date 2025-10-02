import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Payment System (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Payment Processing', () => {
    it('should create a course purchase payment', () => {
      return request(app.getHttpServer())
        .post('/payments/course-purchase')
        .send({
          courseId: 'course-123',
          amount: 9900, // $99.00 in cents
          currency: 'usd',
          customerEmail: 'test@example.com',
          customerName: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.amount).toBe(9900);
          expect(res.body.currency).toBe('usd');
          expect(res.body.type).toBe('course_purchase');
          expect(res.body.status).toBe('pending');
        });
    });

    it('should process a payment successfully', async () => {
      // First create a payment
      const createResponse = await request(app.getHttpServer())
        .post('/payments/course-purchase')
        .send({
          courseId: 'course-123',
          amount: 9900,
          currency: 'usd',
          customerEmail: 'test@example.com',
        })
        .expect(201);

      const paymentId = createResponse.body.id;

      // Then process the payment
      return request(app.getHttpServer())
        .post(`/payments/${paymentId}/process`)
        .send({
          confirm: true,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('completed');
          expect(res.body.completedAt).toBeDefined();
        });
    });

    it('should refund a payment', async () => {
      // First create and process a payment
      const createResponse = await request(app.getHttpServer())
        .post('/payments/course-purchase')
        .send({
          courseId: 'course-123',
          amount: 9900,
          currency: 'usd',
          customerEmail: 'test@example.com',
        })
        .expect(201);

      const paymentId = createResponse.body.id;

      await request(app.getHttpServer())
        .post(`/payments/${paymentId}/process`)
        .send({ confirm: true })
        .expect(200);

      // Then refund the payment
      return request(app.getHttpServer())
        .post(`/payments/${paymentId}/refund`)
        .send({
          reason: 'Customer request',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('refunded');
          expect(res.body.refundedAt).toBeDefined();
        });
    });

    it('should get user payments', () => {
      return request(app.getHttpServer())
        .get('/payments')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should get payment by ID', async () => {
      // First create a payment
      const createResponse = await request(app.getHttpServer())
        .post('/payments/course-purchase')
        .send({
          courseId: 'course-123',
          amount: 9900,
          currency: 'usd',
          customerEmail: 'test@example.com',
        })
        .expect(201);

      const paymentId = createResponse.body.id;

      // Then get the payment
      return request(app.getHttpServer())
        .get(`/payments/${paymentId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(paymentId);
          expect(res.body.amount).toBe(9900);
        });
    });
  });

  describe('Subscription Management', () => {
    it('should create a subscription', () => {
      return request(app.getHttpServer())
        .post('/payments/subscriptions')
        .send({
          plan: 'premium',
          billingCycle: 'monthly',
          amount: 2900, // $29.00 in cents
          currency: 'usd',
          customerEmail: 'test@example.com',
          customerName: 'Test User',
          trialDays: 7,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.plan).toBe('premium');
          expect(res.body.billingCycle).toBe('monthly');
          expect(res.body.amount).toBe(2900);
          expect(res.body.status).toBe('trial');
        });
    });

    it('should get user subscriptions', () => {
      return request(app.getHttpServer())
        .get('/payments/subscriptions')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should get active subscription', () => {
      return request(app.getHttpServer())
        .get('/payments/subscriptions/active')
        .expect(200)
        .expect((res) => {
          // Can be null if no active subscription
          expect(res.body).toBeDefined();
        });
    });

    it('should cancel a subscription', async () => {
      // First create a subscription
      const createResponse = await request(app.getHttpServer())
        .post('/payments/subscriptions')
        .send({
          plan: 'premium',
          billingCycle: 'monthly',
          amount: 2900,
          currency: 'usd',
          customerEmail: 'test@example.com',
        })
        .expect(201);

      const subscriptionId = createResponse.body.id;

      // Then cancel the subscription
      return request(app.getHttpServer())
        .delete(`/payments/subscriptions/${subscriptionId}`)
        .send({
          cancelAtPeriodEnd: true,
          reason: 'Customer request',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('cancelled');
          expect(res.body.cancelledAt).toBeDefined();
        });
    });

    it('should reactivate a subscription', async () => {
      // First create and cancel a subscription
      const createResponse = await request(app.getHttpServer())
        .post('/payments/subscriptions')
        .send({
          plan: 'premium',
          billingCycle: 'monthly',
          amount: 2900,
          currency: 'usd',
          customerEmail: 'test@example.com',
        })
        .expect(201);

      const subscriptionId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/payments/subscriptions/${subscriptionId}`)
        .send({ cancelAtPeriodEnd: true })
        .expect(200);

      // Then reactivate the subscription
      return request(app.getHttpServer())
        .post(`/payments/subscriptions/${subscriptionId}/reactivate`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('active');
        });
    });
  });

  describe('Invoice Management', () => {
    it('should get invoice by ID', async () => {
      // First create a payment that generates an invoice
      const createResponse = await request(app.getHttpServer())
        .post('/payments/course-purchase')
        .send({
          courseId: 'course-123',
          amount: 9900,
          currency: 'usd',
          customerEmail: 'test@example.com',
        })
        .expect(201);

      const paymentId = createResponse.body.id;

      // Process the payment to generate invoice
      await request(app.getHttpServer())
        .post(`/payments/${paymentId}/process`)
        .send({ confirm: true })
        .expect(200);

      // Get invoices for the payment
      const invoicesResponse = await request(app.getHttpServer())
        .get(`/payments/${paymentId}/invoices`)
        .expect(200);

      if (invoicesResponse.body.length > 0) {
        const invoiceId = invoicesResponse.body[0].id;

        return request(app.getHttpServer())
          .get(`/payments/invoices/${invoiceId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBe(invoiceId);
            expect(res.body.amount).toBe(9900);
          });
      }
    });

    it('should pay an invoice', async () => {
      // This test would require a real invoice to be created
      // For now, we'll just test the endpoint structure
      return request(app.getHttpServer())
        .post('/payments/invoices/test-invoice-id/pay')
        .send({
          paymentMethodId: 'pm_test_123',
        })
        .expect(200);
    });
  });

  describe('Analytics', () => {
    it('should get payment analytics', () => {
      return request(app.getHttpServer())
        .get('/payments/analytics/payments')
        .query({ days: 30 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalRevenue');
          expect(res.body).toHaveProperty('totalPayments');
          expect(res.body).toHaveProperty('successfulPayments');
          expect(res.body).toHaveProperty('revenueByPeriod');
        });
    });

    it('should get subscription analytics', () => {
      return request(app.getHttpServer())
        .get('/payments/analytics/subscriptions')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalSubscriptions');
          expect(res.body).toHaveProperty('activeSubscriptions');
          expect(res.body).toHaveProperty('monthlyRecurringRevenue');
          expect(res.body).toHaveProperty('churnRate');
        });
    });

    it('should get invoice analytics', () => {
      return request(app.getHttpServer())
        .get('/payments/analytics/invoices')
        .query({ days: 30 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalInvoices');
          expect(res.body).toHaveProperty('paidInvoices');
          expect(res.body).toHaveProperty('overdueInvoices');
        });
    });

    it('should get business intelligence data', () => {
      return request(app.getHttpServer())
        .get('/payments/analytics/business-intelligence')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('paymentAnalytics');
          expect(res.body).toHaveProperty('subscriptionAnalytics');
          expect(res.body).toHaveProperty('invoiceAnalytics');
          expect(res.body).toHaveProperty('summary');
        });
    });

    it('should get revenue trends', () => {
      return request(app.getHttpServer())
        .get('/payments/analytics/revenue-trends')
        .query({ days: 90 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('period');
          expect(res.body).toHaveProperty('totalRevenue');
          expect(res.body).toHaveProperty('trends');
        });
    });

    it('should get customer analytics', () => {
      return request(app.getHttpServer())
        .get('/payments/analytics/customers')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalCustomers');
          expect(res.body).toHaveProperty('averageCustomerValue');
          expect(res.body).toHaveProperty('topCustomers');
        });
    });
  });

  describe('Webhook Handling', () => {
    it('should handle Stripe webhook events', () => {
      const mockWebhookEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 9900,
            currency: 'usd',
            status: 'succeeded',
          },
        },
      };

      return request(app.getHttpServer())
        .post('/webhooks/stripe')
        .set('stripe-signature', 'test_signature')
        .send(mockWebhookEvent)
        .expect(200)
        .expect((res) => {
          expect(res.body.received).toBe(true);
        });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid payment data', () => {
      return request(app.getHttpServer())
        .post('/payments/course-purchase')
        .send({
          // Missing required fields
          courseId: 'course-123',
        })
        .expect(400);
    });

    it('should handle non-existent payment', () => {
      return request(app.getHttpServer()).get('/payments/non-existent-id').expect(404);
    });

    it('should handle invalid subscription data', () => {
      return request(app.getHttpServer())
        .post('/payments/subscriptions')
        .send({
          // Missing required fields
          plan: 'invalid-plan',
        })
        .expect(400);
    });
  });

  describe('Payment Methods', () => {
    it('should support multiple payment methods', () => {
      return request(app.getHttpServer())
        .post('/payments/course-purchase')
        .send({
          courseId: 'course-123',
          amount: 9900,
          currency: 'usd',
          paymentMethodId: 'pm_test_visa',
          customerEmail: 'test@example.com',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.paymentMethodId).toBe('pm_test_visa');
        });
    });
  });

  describe('Tax and Discounts', () => {
    it('should handle tax calculations', () => {
      return request(app.getHttpServer())
        .post('/payments/course-purchase')
        .send({
          courseId: 'course-123',
          amount: 9900,
          currency: 'usd',
          taxAmount: 990, // 10% tax
          customerEmail: 'test@example.com',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.taxAmount).toBe(990);
        });
    });

    it('should handle discount codes', () => {
      return request(app.getHttpServer())
        .post('/payments/course-purchase')
        .send({
          courseId: 'course-123',
          amount: 9900,
          currency: 'usd',
          discountAmount: 990, // 10% discount
          couponCode: 'SAVE10',
          customerEmail: 'test@example.com',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.discountAmount).toBe(990);
          expect(res.body.couponCode).toBe('SAVE10');
        });
    });
  });
});
