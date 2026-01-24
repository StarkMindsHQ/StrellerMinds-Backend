/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { PaymentPlanService } from './payment-plan.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Subscription,
  PaymentPlan,
  Invoice,
  Payment,
} from '../entities';
import { SubscriptionStatus, BillingCycle } from '../enums';
import { CreateSubscriptionDto, CancelSubscriptionDto } from '../dto';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let mockSubscriptionRepository: any;
  let mockPaymentPlanRepository: any;
  let mockInvoiceRepository: any;
  let mockPaymentRepository: any;
  let mockStripeService: any;
  let mockPaypalService: any;

  beforeEach(async () => {
    mockSubscriptionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockPaymentPlanRepository = {
      findOneBy: jest.fn(),
    };

    mockInvoiceRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    mockPaymentRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    mockStripeService = {};
    mockPaypalService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: getRepositoryToken(PaymentPlan),
          useValue: mockPaymentPlanRepository,
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: mockInvoiceRepository,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: 'StripeService',
          useValue: mockStripeService,
        },
        {
          provide: 'PayPalService',
          useValue: mockPaypalService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  describe('createSubscription', () => {
    it('should create a new subscription', async () => {
      const userId = 'test-user-id';
      const dto: CreateSubscriptionDto = {
        paymentPlanId: 'plan-id',
        billingCycle: BillingCycle.MONTHLY,
      };

      const mockPlan = {
        id: 'plan-id',
        name: 'Premium',
        price: 99.99,
        billingCycle: BillingCycle.MONTHLY,
      };

      const mockSubscription = {
        id: 'sub-id',
        userId,
        paymentPlanId: 'plan-id',
        status: SubscriptionStatus.PENDING,
        billingCycle: BillingCycle.MONTHLY,
        startDate: expect.any(Date),
        currentAmount: 99.99,
        nextBillingDate: expect.any(Date),
      };

      mockPaymentPlanRepository.findOneBy.mockResolvedValue(mockPlan);
      mockSubscriptionRepository.create.mockReturnValue(mockSubscription);
      mockSubscriptionRepository.save.mockResolvedValue(mockSubscription);

      const result = await service.createSubscription(userId, dto);

      expect(result).toEqual(mockSubscription);
      expect(mockPaymentPlanRepository.findOneBy).toHaveBeenCalledWith({
        id: dto.paymentPlanId,
      });
      expect(mockSubscriptionRepository.create).toHaveBeenCalled();
    });

    it('should throw error when plan not found', async () => {
      const userId = 'test-user-id';
      const dto: CreateSubscriptionDto = {
        paymentPlanId: 'invalid-plan-id',
      };

      mockPaymentPlanRepository.findOneBy.mockResolvedValue(null);

      expect(service.createSubscription(userId, dto)).rejects.toThrow(
        'Payment plan not found',
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel an active subscription', async () => {
      const subscriptionId = 'sub-id';
      const dto: CancelSubscriptionDto = {
        reason: 'No longer needed',
      };

      const mockSubscription = {
        id: subscriptionId,
        status: SubscriptionStatus.ACTIVE,
        cancelledAt: null,
      };

      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      mockSubscriptionRepository.save.mockResolvedValue({
        ...mockSubscription,
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: expect.any(Date),
        endDate: expect.any(Date),
      });

      const result = await service.cancelSubscription(subscriptionId, dto);

      expect(result.status).toBe(SubscriptionStatus.CANCELLED);
      expect(mockSubscriptionRepository.save).toHaveBeenCalled();
    });
  });

  describe('getUserSubscriptions', () => {
    it('should return user subscriptions', async () => {
      const userId = 'test-user-id';
      const mockSubscriptions = [
        {
          id: 'sub-1',
          userId,
          status: SubscriptionStatus.ACTIVE,
          paymentPlan: { name: 'Premium' },
        },
        {
          id: 'sub-2',
          userId,
          status: SubscriptionStatus.PAUSED,
          paymentPlan: { name: 'Basic' },
        },
      ];

      mockSubscriptionRepository.find.mockResolvedValue(mockSubscriptions);

      const result = await service.getUserSubscriptions(userId);

      expect(result).toEqual(mockSubscriptions);
      expect(result.length).toBe(2);
    });
  });

  describe('pauseSubscription', () => {
    it('should pause an active subscription', async () => {
      const subscriptionId = 'sub-id';
      const mockSubscription = {
        id: subscriptionId,
        status: SubscriptionStatus.ACTIVE,
      };

      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      mockSubscriptionRepository.save.mockResolvedValue({
        ...mockSubscription,
        status: SubscriptionStatus.PAUSED,
      });

      const result = await service.pauseSubscription(subscriptionId);

      expect(result.status).toBe(SubscriptionStatus.PAUSED);
    });
  });

  describe('resumeSubscription', () => {
    it('should resume a paused subscription', async () => {
      const subscriptionId = 'sub-id';
      const mockSubscription = {
        id: subscriptionId,
        status: SubscriptionStatus.PAUSED,
        billingCycle: BillingCycle.MONTHLY,
      };

      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      mockSubscriptionRepository.save.mockResolvedValue({
        ...mockSubscription,
        status: SubscriptionStatus.ACTIVE,
        nextBillingDate: expect.any(Date),
      });

      const result = await service.resumeSubscription(subscriptionId);

      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
    });
  });
});
