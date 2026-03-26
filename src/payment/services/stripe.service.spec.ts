import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Payment, PaymentStatus, PaymentMethod } from '../entities/payment.entity';
import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';
import { CreatePaymentDto, CreateSubscriptionDto } from '../dto/payment.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';

jest.mock('stripe');

describe('StripeService', () => {
  let service: StripeService;
  let stripeMock: jest.Mocked<Stripe>;
  let configService: jest.Mocked<ConfigService>;
  let paymentRepository: jest.Mocked<Repository<Payment>>;
  let subscriptionRepository: jest.Mocked<Repository<Subscription>>;

  const mockPayment: Partial<Payment> = {
    id: 'payment-123',
    amount: 1000,
    currency: 'usd',
    status: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.CREDIT_CARD,
    stripePaymentIntentId: 'pi_123',
    userId: 'user-123',
    createdAt: new Date(),
  };

  const mockSubscription: Partial<Subscription> = {
    id: 'sub-123',
    userId: 'user-123',
    stripeSubscriptionId: 'sub_123',
    status: SubscriptionStatus.ACTIVE,
    priceId: 'price_123',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    stripeMock = new Stripe('sk_test_123', { apiVersion: '2023-10-16' }) as jest.Mocked<Stripe>;
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'STRIPE_SECRET_KEY':
                  return 'sk_test_123';
                case 'STRIPE_WEBHOOK_SECRET':
                  return 'whsec_123';
                default:
                  return null;
              }
            }),
          },
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    configService = module.get<ConfigService>(ConfigService);
    paymentRepository = module.get(getRepositoryToken(Payment));
    subscriptionRepository = module.get(getRepositoryToken(Subscription));

    // Override the stripe instance
    (service as any).stripe = stripeMock;
  });

  describe('createPaymentIntent', () => {
    const createPaymentDto: CreatePaymentDto = {
      amount: 1000,
      currency: 'usd',
      paymentMethod: PaymentMethod.CREDIT_CARD,
      description: 'Test payment',
    };

    it('should create a payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_123_secret_123',
      };

      stripeMock.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any);
      paymentRepository.create.mockReturnValue(mockPayment as Payment);
      paymentRepository.save.mockResolvedValue(mockPayment as Payment);

      const result = await service.createPaymentIntent(createPaymentDto, 'user-123');

      expect(result).toHaveProperty('clientSecret');
      expect(result.clientSecret).toBe('pi_123_secret_123');
      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'usd',
        payment_method_types: ['card'],
        metadata: {
          userId: 'user-123',
          paymentMethod: PaymentMethod.CREDIT_CARD,
        },
        description: 'Test payment',
      });
      expect(paymentRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid amount', async () => {
      const invalidDto = { ...createPaymentDto, amount: 0 };

      await expect(service.createPaymentIntent(invalidDto, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle Stripe API errors', async () => {
      stripeMock.paymentIntents.create.mockRejectedValue(new Error('Stripe API Error'));

      await expect(service.createPaymentIntent(createPaymentDto, 'user-123')).rejects.toThrow(
        Error,
      );
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        status: 'succeeded',
        amount: 1000,
        currency: 'usd',
      };

      stripeMock.paymentIntents.confirm.mockResolvedValue(mockPaymentIntent as any);
      paymentRepository.findOne.mockResolvedValue(mockPayment as Payment);
      paymentRepository.update.mockResolvedValue(undefined);

      const result = await service.confirmPayment('pi_123');

      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(stripeMock.paymentIntents.confirm).toHaveBeenCalledWith('pi_123', {
        payment_method: 'pm_card_visa',
      });
      expect(paymentRepository.update).toHaveBeenCalledWith('payment-123', {
        status: PaymentStatus.COMPLETED,
      });
    });

    it('should throw NotFoundException if payment not found', async () => {
      paymentRepository.findOne.mockResolvedValue(null);

      await expect(service.confirmPayment('pi_123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createSubscription', () => {
    const createSubscriptionDto: CreateSubscriptionDto = {
      priceId: 'price_123',
      paymentMethod: PaymentMethod.CREDIT_CARD,
    };

    it('should create a subscription successfully', async () => {
      const mockStripeSubscription = {
        id: 'sub_123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        items: {
          data: [
            {
              price: {
                id: 'price_123',
                unit_amount: 1000,
                currency: 'usd',
              },
            },
          ],
        },
      };

      stripeMock.subscriptions.create.mockResolvedValue(mockStripeSubscription as any);
      subscriptionRepository.create.mockReturnValue(mockSubscription as Subscription);
      subscriptionRepository.save.mockResolvedValue(mockSubscription as Subscription);

      const result = await service.createSubscription(createSubscriptionDto, 'user-123');

      expect(result.stripeSubscriptionId).toBe('sub_123');
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(stripeMock.subscriptions.create).toHaveBeenCalledWith({
        customer: 'user-123',
        items: [{ price: 'price_123' }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: 'user-123',
          paymentMethod: PaymentMethod.CREDIT_CARD,
        },
      });
    });

    it('should handle subscription creation errors', async () => {
      stripeMock.subscriptions.create.mockRejectedValue(new Error('Stripe API Error'));

      await expect(
        service.createSubscription(createSubscriptionDto, 'user-123'),
      ).rejects.toThrow(Error);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      const mockStripeSubscription = {
        id: 'sub_123',
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000),
      };

      stripeMock.subscriptions.cancel.mockResolvedValue(mockStripeSubscription as any);
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as Subscription);
      subscriptionRepository.update.mockResolvedValue(undefined);

      const result = await service.cancelSubscription('sub_123');

      expect(result.status).toBe(SubscriptionStatus.CANCELED);
      expect(stripeMock.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
      expect(subscriptionRepository.update).toHaveBeenCalledWith('sub-123', {
        status: SubscriptionStatus.CANCELED,
        canceledAt: expect.any(Date),
      });
    });

    it('should throw NotFoundException if subscription not found', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelSubscription('sub_123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('handleWebhook', () => {
    const mockSignature = 'mock-signature';
    const mockPayload = JSON.stringify({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_123',
          metadata: {
            paymentId: 'payment-123',
          },
        },
      },
    });

    it('should handle payment_intent.succeeded webhook', async () => {
      stripeMock.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            metadata: {
              paymentId: 'payment-123',
            },
          },
        },
      } as any);

      paymentRepository.findOne.mockResolvedValue(mockPayment as Payment);
      paymentRepository.update.mockResolvedValue(undefined);

      await service.handleWebhook(mockPayload, mockSignature);

      expect(stripeMock.webhooks.constructEvent).toHaveBeenCalledWith(
        mockPayload,
        mockSignature,
        'whsec_123',
      );
      expect(paymentRepository.update).toHaveBeenCalledWith('payment-123', {
        status: PaymentStatus.COMPLETED,
      });
    });

    it('should handle invoice.payment_succeeded webhook', async () => {
      stripeMock.webhooks.constructEvent.mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            subscription: 'sub_123',
          },
        },
      } as any);

      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as Subscription);
      subscriptionRepository.update.mockResolvedValue(undefined);

      await service.handleWebhook(mockPayload, mockSignature);

      expect(subscriptionRepository.update).toHaveBeenCalledWith('sub-123', {
        status: SubscriptionStatus.ACTIVE,
      });
    });

    it('should handle customer.subscription.deleted webhook', async () => {
      stripeMock.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
          },
        },
      } as any);

      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as Subscription);
      subscriptionRepository.update.mockResolvedValue(undefined);

      await service.handleWebhook(mockPayload, mockSignature);

      expect(subscriptionRepository.update).toHaveBeenCalledWith('sub-123', {
        status: SubscriptionStatus.CANCELED,
      });
    });

    it('should throw error for invalid webhook signature', async () => {
      stripeMock.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(service.handleWebhook(mockPayload, 'invalid-signature')).rejects.toThrow(
        Error,
      );
    });

    it('should ignore unhandled webhook events', async () => {
      stripeMock.webhooks.constructEvent.mockReturnValue({
        type: 'account.updated',
        data: {},
      } as any);

      await service.handleWebhook(mockPayload, mockSignature);

      // Should not throw error and should complete silently
      expect(true).toBe(true);
    });
  });

  describe('getPaymentMethods', () => {
    it('should retrieve payment methods for a customer', async () => {
      const mockPaymentMethods = {
        data: [
          {
            id: 'pm_123',
            type: 'card',
            card: {
              brand: 'visa',
              last4: '4242',
              exp_month: 12,
              exp_year: 2024,
            },
          },
        ],
      };

      stripeMock.paymentMethods.list.mockResolvedValue(mockPaymentMethods as any);

      const result = await service.getPaymentMethods('cus_123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pm_123');
      expect(stripeMock.paymentMethods.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        type: 'card',
      });
    });
  });

  describe('createRefund', () => {
    it('should create refund successfully', async () => {
      const mockRefund = {
        id: 're_123',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        payment_intent: 'pi_123',
      };

      stripeMock.refunds.create.mockResolvedValue(mockRefund as any);
      paymentRepository.findOne.mockResolvedValue(mockPayment as Payment);
      paymentRepository.update.mockResolvedValue(undefined);

      const result = await service.createRefund('pi_123', 500);

      expect(result.id).toBe('re_123');
      expect(result.amount).toBe(500);
      expect(stripeMock.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
        amount: 500,
        reason: 'requested_by_customer',
      });
      expect(paymentRepository.update).toHaveBeenCalledWith('payment-123', {
        status: PaymentStatus.REFUNDED,
        refundAmount: 500,
      });
    });

    it('should throw error for refund amount exceeding payment amount', async () => {
      await expect(service.createRefund('pi_123', 2000)).rejects.toThrow(BadRequestException);
    });
  });
});
