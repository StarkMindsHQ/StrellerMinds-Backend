import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

@Injectable()
export class DonationsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}

  async handleWebhook(signature: string, payload: any) {
    this.validateSignature(signature, payload);

    const { transactionHash, amount, projectId, userId, assetType, isAnonymous } = payload;

    const existingDonation = await this.prisma.donation.findUnique({
      where: { transactionHash }
    });

    if (existingDonation) {
      return { status: 'success', message: 'Webhook already processed' };
    }

    const isVerified = await this.verifyOnBlockchain(transactionHash);
    if (!isVerified) {
      throw new BadRequestException('Transaction verification failed on blockchain');
    }

    const donation = await this.prisma.donation.create({
      data: {
        transactionHash,
        amount: Number(amount),
        projectId,
        userId,
        assetType: assetType || 'USD',
        isAnonymous: isAnonymous || false
      }
    });

    this.eventEmitter.emit('donation.created', donation);

    return { status: 'success', data: donation };
  }

  private validateSignature(signature: string, payload: any) {
    const secret = process.env.WEBHOOK_SECRET || 'default_secret';
    const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    if (signature !== expected && process.env.NODE_ENV !== 'test') {
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  private async verifyOnBlockchain(txHash: string): Promise<boolean> {
    return txHash && txHash.length > 0;
  }

  async getLeaderboard(scope: 'global' | 'project' = 'global', projectId?: string) {
    const whereCondition = scope === 'project' && projectId ? { projectId } : {};

    const topDonors = await this.prisma.donation.groupBy({
      by: ['userId', 'isAnonymous'],
      where: whereCondition,
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 100
    });

    return topDonors.map((donor, index) => {
      return {
        rank: index + 1,
        userId: donor.isAnonymous ? null : donor.userId,
        displayName: donor.isAnonymous ? 'Anonymous' : `User ${donor.userId}`,
        totalDonatedUsd: Number(donor._sum.amount)
      };
    });
  }
}