/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { StripeService } from './stripe.service';
import { PayPalService } from './paypal.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Payment,
  Subscription,
  Invoice,
  Refund,
} from '../entities';
import { PaymentStatus, PaymentMethod } from '../enums';

describe('PaymentService', () => {
  let service: PaymentService;
  let mockPaymentRepository: any;
  let mockSubscriptionRepository: any;
  let mockInvoiceRepository: any;
  let mockStripeService: any;
  let mockPaypalService: any;

  beforeEach(async () => {
    mockPaymentRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockSubscriptionRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
    };

    mockInvoiceRepository = {
      findOneBy: jest.fn(),
    };

    mockStripeService = {
      createPaymentIntent: jest.fn(),
      refundPayment: jest.fn(),
    };

    mockPaypalService = {
      createOrder: jest.fn(),
      refund: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: mockInvoiceRepository,
        },
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
        {
          provide: PayPalService,
          useValue: mockPaypalService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  describe('initializePayment', () => {
    it('should initialize Stripe payment', async () => {
      const userId = 'test-user-id';
      const amount = 99.99;

      mockStripeService.createPaymentIntent.mockResolvedValue('client_secret');

      const result = await service.initializePayment(userId, amount, 'stripe');

      expect(result).toBe('client_secret');
      expect(mockStripeService.createPaymentIntent).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          amount,
          currency: 'USD',
          paymentMethod: 'stripe',
        }),
      );
    });

    it('should initialize PayPal payment', async () => {
      const userId = 'test-user-id';
      const amount = 99.99;

      mockPaypalService.createOrder.mockResolvedValue({ id: 'order-id' });

      const result = await service.initializePayment(userId, amount, 'paypal');

      expect(result).toBe('order-id');
      expect(mockPaypalService.createOrder).toHaveBeenCalled();
    });
  });

  describe('getPaymentHistory', () => {
    it('should return payment history for user', async () => {
      const userId = 'test-user-id';
      const mockPayments = [
        { id: '1', userId, amount: 99.99, status: PaymentStatus.COMPLETED },
        { id: '2', userId, amount: 49.99, status: PaymentStatus.PENDING },
      ];

      mockPaymentRepository.find.mockResolvedValue(mockPayments);

      const result = await service.getPaymentHistory(userId);

      expect(result).toEqual(mockPayments);
      expect(mockPaymentRepository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getPayment', () => {
    it('should return payment details', async () => {
      const paymentId = 'test-payment-id';
      const mockPayment = {
        id: paymentId,
        amount: 99.99,
        status: PaymentStatus.COMPLETED,
      };

      mockPaymentRepository.findOneBy.mockResolvedValue(mockPayment);

      const result = await service.getPayment(paymentId);

      expect(result).toEqual(mockPayment);
    });

    it('should throw error when payment not found', async () => {
      mockPaymentRepository.findOneBy.mockResolvedValue(null);

      expect(service.getPayment('invalid-id')).rejects.toThrow(
        'Payment not found',
      );
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status', async () => {
      const paymentId = 'test-payment-id';
      const mockPayment = {
        id: paymentId,
        status: PaymentStatus.PENDING,
        save: jest.fn(),
      };

      mockPaymentRepository.findOneBy.mockResolvedValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
        completedAt: expect.any(Date),
      });

      const result = await service.updatePaymentStatus(
        paymentId,
        PaymentStatus.COMPLETED,
      );

      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(mockPaymentRepository.save).toHaveBeenCalled();
    });
  });

  describe('createRefundRequest', () => {
    it('should create refund request for completed payment', async () => {
      const paymentId = 'test-payment-id';
      const mockPayment = {
        id: paymentId,
        userId: 'test-user-id',
        amount: 99.99,
        currency: 'USD',
        status: PaymentStatus.COMPLETED,
      };

      mockPaymentRepository.findOneBy.mockResolvedValue(mockPayment);
      mockPaymentRepository.create.mockReturnValue({
        paymentId,
        userId: mockPayment.userId,
        amount: 99.99,
        currency: 'USD',
        reason: 'Not satisfied',
      });

      const result = await service.createRefundRequest(paymentId);

      expect(result).toBeDefined();
      expect(result.paymentId).toBe(paymentId);
    });

    it('should throw error for non-completed payment', async () => {
      const paymentId = 'test-payment-id';
      const mockPayment = {
        id: paymentId,
        status: PaymentStatus.PENDING,
      };

      mockPaymentRepository.findOneBy.mockResolvedValue(mockPayment);

      expect(
        service.createRefundRequest(paymentId),
      ).rejects.toThrow('Only completed payments can be refunded');
    });
  });
});
