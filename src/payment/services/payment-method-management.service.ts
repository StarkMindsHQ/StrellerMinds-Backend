import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethodEntity } from '../entities';
import { PaymentMethod } from '../enums';

@Injectable()
export class PaymentMethodManagementService {
  constructor(
    @InjectRepository(PaymentMethodEntity)
    private paymentMethodRepository: Repository<PaymentMethodEntity>,
  ) {}

  async addPaymentMethod(
    userId: string,
    type: string,
    provider: string,
    externalId: string,
    last4?: string,
    brand?: string,
    expiresAt?: Date,
    metadata?: Record<string, any>,
  ): Promise<PaymentMethodEntity> {
    // Check if this payment method already exists for the user
    const existingMethod = await this.paymentMethodRepository.findOne({
      where: {
        userId,
        provider,
        externalId,
        isActive: true,
      },
    });

    if (existingMethod) {
      throw new BadRequestException('Payment method already exists');
    }

    // Set the first payment method as default if no default exists
    const hasDefault = await this.hasDefaultPaymentMethod(userId);
    const isDefault = !hasDefault;

    const paymentMethod = this.paymentMethodRepository.create({
      userId,
      type,
      provider,
      externalId,
      last4,
      brand,
      expiresAt,
      isDefault,
      isActive: true,
      metadata,
    });

    return this.paymentMethodRepository.save(paymentMethod);
  }

  async getPaymentMethods(userId: string): Promise<PaymentMethodEntity[]> {
    return this.paymentMethodRepository.find({
      where: { userId, isActive: true },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async getPaymentMethod(
    userId: string,
    paymentMethodId: string,
  ): Promise<PaymentMethodEntity> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: paymentMethodId, userId, isActive: true },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    return paymentMethod;
  }

  async setDefaultPaymentMethod(
    userId: string,
    paymentMethodId: string,
  ): Promise<PaymentMethodEntity> {
    const paymentMethod = await this.getPaymentMethod(userId, paymentMethodId);

    // Set all other payment methods as non-default
    await this.paymentMethodRepository
      .createQueryBuilder()
      .update(PaymentMethodEntity)
      .set({ isDefault: false })
      .where('userId = :userId', { userId })
      .execute();

    // Set the selected payment method as default
    paymentMethod.isDefault = true;
    return this.paymentMethodRepository.save(paymentMethod);
  }

  async removePaymentMethod(
    userId: string,
    paymentMethodId: string,
  ): Promise<void> {
    const paymentMethod = await this.getPaymentMethod(userId, paymentMethodId);

    // If this is the default payment method, we need to set another one as default
    if (paymentMethod.isDefault) {
      const otherMethods = await this.paymentMethodRepository.find({
        where: { userId, isActive: true, id: paymentMethodId },
      });

      if (otherMethods.length > 0) {
        otherMethods[0].isDefault = true;
        await this.paymentMethodRepository.save(otherMethods[0]);
      }
    }

    paymentMethod.isActive = false;
    await this.paymentMethodRepository.save(paymentMethod);
  }

  async updatePaymentMethod(
    userId: string,
    paymentMethodId: string,
    updates: {
      last4?: string;
      brand?: string;
      expiresAt?: Date;
      metadata?: Record<string, any>;
    },
  ): Promise<PaymentMethodEntity> {
    const paymentMethod = await this.getPaymentMethod(userId, paymentMethodId);

    Object.assign(paymentMethod, updates);
    return this.paymentMethodRepository.save(paymentMethod);
  }

  async getDefaultPaymentMethod(
    userId: string,
  ): Promise<PaymentMethodEntity | null> {
    return this.paymentMethodRepository.findOne({
      where: { userId, isDefault: true, isActive: true },
    });
  }

  private async hasDefaultPaymentMethod(userId: string): Promise<boolean> {
    const count = await this.paymentMethodRepository.count({
      where: { userId, isDefault: true, isActive: true },
    });
    return count > 0;
  }

  async validatePaymentMethod(
    userId: string,
    paymentMethodId: string,
  ): Promise<boolean> {
    try {
      const paymentMethod = await this.getPaymentMethod(userId, paymentMethodId);
      
      // Check if the payment method has expired
      if (paymentMethod.expiresAt && paymentMethod.expiresAt < new Date()) {
        return false;
      }

      // Check if the payment method is active
      if (!paymentMethod.isActive) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async getPaymentMethodsByProvider(
    userId: string,
    provider: string,
  ): Promise<PaymentMethodEntity[]> {
    return this.paymentMethodRepository.find({
      where: { userId, provider, isActive: true },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async getPaymentMethodByExternalId(
    userId: string,
    provider: string,
    externalId: string,
  ): Promise<PaymentMethodEntity | null> {
    return this.paymentMethodRepository.findOne({
      where: { userId, provider, externalId, isActive: true },
    });
  }

  async bulkRemovePaymentMethods(
    userId: string,
    paymentMethodIds: string[],
  ): Promise<void> {
    await this.paymentMethodRepository
      .createQueryBuilder()
      .update(PaymentMethodEntity)
      .set({ isActive: false })
      .where('id IN (:...ids)', { ids: paymentMethodIds })
      .andWhere('userId = :userId', { userId })
      .execute();
  }

  async getPaymentMethodStats(userId: string): Promise<any> {
    const total = await this.paymentMethodRepository.count({
      where: { userId, isActive: true },
    });

    const byProvider = await this.paymentMethodRepository
      .createQueryBuilder('pm')
      .select('pm.provider', 'provider')
      .addSelect('COUNT(*)', 'count')
      .where('pm.userId = :userId', { userId })
      .andWhere('pm.isActive = true')
      .groupBy('pm.provider')
      .getRawMany();

    const defaultMethod = await this.getDefaultPaymentMethod(userId);

    return {
      total,
      byProvider,
      hasDefault: !!defaultMethod,
      defaultMethodId: defaultMethod?.id,
    };
  }
}