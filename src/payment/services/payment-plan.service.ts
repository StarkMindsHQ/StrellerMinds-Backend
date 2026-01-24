import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentPlan, Subscription } from '../entities';
import {
  CreatePaymentPlanDto,
  UpdatePaymentPlanDto,
} from '../dto';

@Injectable()
export class PaymentPlanService {
  constructor(
    @InjectRepository(PaymentPlan)
    private paymentPlanRepository: Repository<PaymentPlan>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
  ) {}

  async createPlan(dto: CreatePaymentPlanDto): Promise<PaymentPlan> {
    const plan = this.paymentPlanRepository.create({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      currency: dto.currency || 'USD',
      trialDays: dto.trialDays,
      maxSubscribers: dto.maxSubscribers,
      features: dto.features,
      isActive: true,
      metadata: dto.metadata,
    });

    return this.paymentPlanRepository.save(plan);
  }

  async getPlan(planId: string): Promise<PaymentPlan> {
    return this.paymentPlanRepository.findOneBy({ id: planId });
  }

  async listPlans(onlyActive: boolean = true): Promise<PaymentPlan[]> {
    const query = this.paymentPlanRepository.createQueryBuilder('plan');

    if (onlyActive) {
      query.where('plan.isActive = true');
    }

    return query.orderBy('plan.price', 'ASC').getMany();
  }

  async updatePlan(planId: string, dto: UpdatePaymentPlanDto): Promise<PaymentPlan> {
    const plan = await this.getPlan(planId);

    if (!plan) {
      throw new Error('Plan not found');
    }

    Object.assign(plan, dto);
    return this.paymentPlanRepository.save(plan);
  }

  async deactivatePlan(planId: string): Promise<PaymentPlan> {
    const plan = await this.getPlan(planId);

    if (!plan) {
      throw new Error('Plan not found');
    }

    plan.isActive = false;
    return this.paymentPlanRepository.save(plan);
  }

  async getSubscriberCount(planId: string): Promise<number> {
    return this.subscriptionRepository.countBy({ paymentPlanId: planId });
  }
}
