import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentService } from './payment.service';
import {
  PaymentEntity,
  PaymentStatus,
  PaymentType,
} from './entities/payment.entity';
import { StripeService } from './stripe.service';
import { InvoiceService } from './invoice.service';
import { PaymentAnalyticsService } from './payment-analytics.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

type MockRepo = Partial<Record<keyof Repository<any>, jest.Mock>> & {
  createQueryBuilder?: jest.Mock;
};

describe('PaymentService', () => {
  let service: PaymentService;
  let mockRepo: MockRepo;
  let mockStripe: any;
  let mockInvoice: any;
  let mockAnalytics: any;
  let qb: any;

  beforeEach(async () => {
    // minimal query builder stub used in stats/analytics
    qb = {
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    mockRepo = {
      create: jest.fn().mockImplementation((payload) => ({ ...payload })),
      save: jest.fn().mockImplementation(async (p) =>
        Promise.resolve({ id: 'saved-id', ...p }),
      ),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    mockStripe = {
      createCustomer: jest.fn().mockResolvedValue({ id: 'cus_123' }),
      createPaymentIntent: jest
        .fn()
        .mockResolvedValue({ id: 'pi_123', status: 'requires_payment_method' }),
      confirmPaymentIntent: jest.fn().mockResolvedValue({ status: 'succeeded' }),
      createRefund: jest.fn().mockResolvedValue({ id: 're_123' }),
    };

    mockInvoice = {
      generateInvoiceForPayment: jest.fn().mockResolvedValue(true),
    };

    mockAnalytics = {
      trackPayment: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(PaymentEntity), useValue: mockRepo },
        { provide: StripeService, useValue: mockStripe },
        { provide: InvoiceService, useValue: mockInvoice },
        { provide: PaymentAnalyticsService, useValue: mockAnalytics },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('creates payment (happy path)', async () => {
      mockStripe.createCustomer.mockResolvedValueOnce({ id: 'cus_X' });
      mockStripe.createPaymentIntent.mockResolvedValueOnce({ id: 'pi_X' });

      const dto = {
        userId: 'user-1',
        amount: 1000,
        currency: 'usd',
        type: PaymentType.COURSE_PURCHASE,
        customerEmail: 'joe@example.com',
        customerName: 'Joe',
      };

      const result = await service.createPayment(dto);

      expect(mockStripe.createCustomer).toHaveBeenCalledWith({
        email: 'joe@example.com',
        name: 'Joe',
        metadata: { userId: 'user-1' },
      });

      expect(mockStripe.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1000,
          currency: 'usd',
          customerId: 'cus_X',
        }),
      );

      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'saved-id');
      expect(result).toHaveProperty('stripePaymentIntentId', 'pi_X');
    });

    it('re-throws if stripe createPaymentIntent fails', async () => {
      mockStripe.createCustomer.mockResolvedValueOnce({ id: 'cus_X' });
      mockStripe.createPaymentIntent.mockRejectedValueOnce(new Error('stripe fail'));

      const dto = {
        userId: 'user-1',
        amount: 500,
        currency: 'usd',
        type: PaymentType.COURSE_PURCHASE,
      };

      await expect(service.createPayment(dto)).rejects.toThrow('stripe fail');
    });
  });

  describe('processPayment', () => {
    it('processes a pending payment to COMPLETED and triggers analytics & invoice', async () => {
      const paymentRecord = {
        id: 'p-1',
        stripePaymentIntentId: 'pi_1',
        status: PaymentStatus.PENDING,
        userId: 'user-1',
      };

      mockRepo.findOne.mockResolvedValueOnce(paymentRecord);
      mockStripe.confirmPaymentIntent.mockResolvedValueOnce({ status: 'succeeded' });
      mockRepo.save.mockImplementationOnce(async (p) => ({ ...p, id: 'p-1' }));

      const res = await service.processPayment({ paymentId: 'p-1', paymentMethodId: 'pm_1' });

      expect(mockRepo.findOne).toHaveBeenCalled();
      expect(mockStripe.confirmPaymentIntent).toHaveBeenCalledWith('pi_1', 'pm_1');
      expect(res.status).toBe(PaymentStatus.COMPLETED);
      expect(mockAnalytics.trackPayment).toHaveBeenCalledWith(expect.objectContaining({ id: 'p-1' }));
      expect(mockInvoice.generateInvoiceForPayment).toHaveBeenCalledWith('p-1');
    });

    it('marks payment FAILED when stripe returns requires_payment_method', async () => {
      const paymentRecord = {
        id: 'p-2',
        stripePaymentIntentId: 'pi_2',
        status: PaymentStatus.PENDING,
      };

      mockRepo.findOne.mockResolvedValueOnce(paymentRecord);
      mockStripe.confirmPaymentIntent.mockResolvedValueOnce({
        status: 'requires_payment_method',
        last_payment_error: { message: 'card declined' },
      });
      mockRepo.save.mockImplementationOnce(async (p) => ({ ...p, id: 'p-2' }));

      const res = await service.processPayment({ paymentId: 'p-2', paymentMethodId: 'pm_x' });

      expect(res.status).toBe(PaymentStatus.FAILED);
      expect(res.failureReason).toBe('card declined');
      expect(mockInvoice.generateInvoiceForPayment).not.toHaveBeenCalled();
      expect(mockAnalytics.trackPayment).toHaveBeenCalled();
    });

    it('throws BadRequestException when payment is not pending', async () => {
      const paymentRecord = { id: 'p-3', status: PaymentStatus.COMPLETED };
      mockRepo.findOne.mockResolvedValueOnce(paymentRecord);

      await expect(service.processPayment({ paymentId: 'p-3' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPaymentById', () => {
    it('returns payment when found', async () => {
      const payment = { id: 'p-10' };
      mockRepo.findOne.mockResolvedValueOnce(payment);

      const res = await service.getPaymentById('p-10');
      expect(res).toEqual(payment);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'p-10' },
        relations: ['user', 'invoices'],
      });
    });

    it('throws NotFoundException when not found', async () => {
      mockRepo.findOne.mockResolvedValueOnce(undefined);
      await expect(service.getPaymentById('not-exist')).rejects.toThrow(NotFoundException);
    });
  });

  describe('refundPayment', () => {
    it('refunds a completed payment', async () => {
      const payment = {
        id: 'p-refund',
        status: PaymentStatus.COMPLETED,
        stripePaymentIntentId: 'pi_ref',
      };

      mockRepo.findOne.mockResolvedValueOnce(payment);
      mockStripe.createRefund.mockResolvedValueOnce({ id: 're_1' });
      mockRepo.save.mockImplementationOnce(async (p) => ({ ...p, id: 'p-refund' }));

      const res = await service.refundPayment('p-refund', 'customer request', 500);

      expect(mockStripe.createRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentIntentId: 'pi_ref',
          amount: 500,
        }),
      );
      expect(res.status).toBe(PaymentStatus.REFUNDED);
      expect(res).toHaveProperty('refundedAt');
      expect(res.refundReason).toBe('customer request');
    });

    it('throws BadRequestException if payment not completed', async () => {
      const payment = { id: 'p-x', status: PaymentStatus.PENDING };
      mockRepo.findOne.mockResolvedValueOnce(payment);

      await expect(service.refundPayment('p-x')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updatePaymentFromWebhook', () => {
    it('updates payment status and tracks analytics', async () => {
      const payment = { id: 'p-web', stripePaymentIntentId: 'pi_web', status: PaymentStatus.PENDING };
      mockRepo.findOne.mockResolvedValueOnce(payment);
      mockRepo.save.mockImplementationOnce(async (p) => ({ ...p }));

      const res = await service.updatePaymentFromWebhook('pi_web', PaymentStatus.COMPLETED);

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { stripePaymentIntentId: 'pi_web' } });
      expect(res.status).toBe(PaymentStatus.COMPLETED);
      expect(mockAnalytics.trackPayment).toHaveBeenCalledWith(expect.objectContaining({ id: 'p-web' }));
    });

    it('throws NotFoundException when stripe id not found', async () => {
      mockRepo.findOne.mockResolvedValueOnce(undefined);
      await expect(service.updatePaymentFromWebhook('nope', PaymentStatus.COMPLETED)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPaymentStats & getPaymentAnalytics', () => {
    it('calls query builder with userId for getPaymentStats', async () => {
      qb.getRawMany.mockResolvedValueOnce([{ status: 'COMPLETED', type: 'COURSE_PURCHASE', count: '1', total_amount: '100' }]);
      const stats = await service.getPaymentStats('user-abc');
      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('payment');
      expect(qb.where).toHaveBeenCalledWith('payment.userId = :userId', { userId: 'user-abc' });
      expect(stats).toEqual([{ status: 'COMPLETED', type: 'COURSE_PURCHASE', count: '1', total_amount: '100' }]);
    });

    it('calls query builder for getPaymentAnalytics with days param', async () => {
      qb.getRawMany.mockResolvedValueOnce([{ date: '2025-01-01', status: 'COMPLETED', type: 'SUBSCRIPTION', count: '2', total_amount: '200' }]);
      const analytics = await service.getPaymentAnalytics(7);
      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('payment');
      expect(qb.select).toHaveBeenCalled();
      expect(analytics).toEqual([{ date: '2025-01-01', status: 'COMPLETED', type: 'SUBSCRIPTION', count: '2', total_amount: '200' }]);
    });
  });

  describe('createCoursePurchase/createSubscriptionPayment helpers', () => {
    it('delegates to createPayment for course purchase', async () => {
      const spy = jest.spyOn(service as any, 'createPayment').mockResolvedValue({ id: 'c1' } as any);
      const res = await service.createCoursePurchase({
        userId: 'u1',
        courseId: 'course-1',
        amount: 100,
        currency: 'usd',
      });
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1',
        type: PaymentType.COURSE_PURCHASE,
        courseId: 'course-1',
      }));
      expect(res).toEqual({ id: 'c1' });
      spy.mockRestore();
    });

    it('delegates to createPayment for subscription', async () => {
      const spy = jest.spyOn(service as any, 'createPayment').mockResolvedValue({ id: 's1' } as any);
      const res = await service.createSubscriptionPayment({
        userId: 'u2',
        subscriptionId: 'sub-1',
        amount: 50,
        currency: 'usd',
      });
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u2',
        type: PaymentType.SUBSCRIPTION,
        subscriptionId: 'sub-1',
      }));
      expect(res).toEqual({ id: 's1' });
      spy.mockRestore();
    });
  });
});
