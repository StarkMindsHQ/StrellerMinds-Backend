import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute, Payment } from '../entities';
import { DisputeStatus, PaymentStatus } from '../enums';

@Injectable()
export class DisputeService {
  constructor(
    @InjectRepository(Dispute)
    private disputeRepository: Repository<Dispute>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  async initiateDispute(
    userId: string,
    paymentId: string,
    reason: string,
    description?: string,
  ): Promise<Dispute> {
    const payment = await this.paymentRepository.findOneBy({ id: paymentId });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.userId !== userId) {
      throw new BadRequestException('Unauthorized to dispute this payment');
    }

    const existingDispute = await this.disputeRepository.findOne({
      where: { paymentId },
    });

    if (existingDispute) {
      throw new BadRequestException('A dispute already exists for this payment');
    }

    const dispute = this.disputeRepository.create({
      paymentId,
      userId,
      amount: payment.amount,
      currency: payment.currency,
      reason,
      description,
      status: DisputeStatus.INITIATED,
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      externalDisputeId: `DISPUTE-${Date.now()}`,
    });

    return this.disputeRepository.save(dispute);
  }

  async getDispute(disputeId: string): Promise<Dispute> {
    const dispute = await this.disputeRepository.findOneBy({ id: disputeId });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    return dispute;
  }

  async getUserDisputes(userId: string): Promise<Dispute[]> {
    return this.disputeRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async submitEvidence(disputeId: string, evidence: string[]): Promise<Dispute> {
    const dispute = await this.getDispute(disputeId);

    if (
      ![DisputeStatus.INITIATED, DisputeStatus.UNDER_REVIEW].includes(
        dispute.status as DisputeStatus,
      )
    ) {
      throw new BadRequestException('Evidence cannot be submitted for this dispute');
    }

    dispute.evidence = evidence;
    dispute.status = DisputeStatus.UNDER_REVIEW;

    return this.disputeRepository.save(dispute);
  }

  async resolveDispute(disputeId: string, resolution: string, won: boolean): Promise<Dispute> {
    const dispute = await this.getDispute(disputeId);

    dispute.status = won ? DisputeStatus.WON : DisputeStatus.LOST;
    dispute.resolution = resolution;
    dispute.resolvedAt = new Date();

    return this.disputeRepository.save(dispute);
  }

  async appealDispute(disputeId: string): Promise<Dispute> {
    const dispute = await this.getDispute(disputeId);

    if (![DisputeStatus.LOST].includes(dispute.status as DisputeStatus)) {
      throw new BadRequestException('Only lost disputes can be appealed');
    }

    dispute.status = DisputeStatus.APPEALED;
    return this.disputeRepository.save(dispute);
  }

  async listDisputes(status?: DisputeStatus, userId?: string): Promise<Dispute[]> {
    const query = this.disputeRepository.createQueryBuilder('dispute');

    if (status) {
      query.where('dispute.status = :status', { status });
    }

    if (userId) {
      query.andWhere('dispute.userId = :userId', { userId });
    }

    return query.orderBy('dispute.createdAt', 'DESC').getMany();
  }
}
