import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailQueue } from '../entities/email-queue.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class RateLimitService {
  constructor(
    private configService: ConfigService,
    @InjectRepository(EmailQueue)
    private emailQueueRepository: Repository<EmailQueue>,
  ) {}

  async isRateLimited(recipient: string, periodMinutes: number = 15): Promise<boolean> {
    const periodStart = new Date();
    periodStart.setMinutes(periodStart.getMinutes() - periodMinutes);

    const recentEmailsCount = await this.emailQueueRepository
      .createQueryBuilder('email')
      .where('email.recipientEmail = :recipient', { recipient })
      .andWhere('email.createdAt >= :periodStart', { periodStart })
      .getCount();

    // Default rate limit: 5 emails per 15 minutes
    const maxEmailsPerPeriod = this.configService.get<number>('EMAIL_RATE_LIMIT_PER_PERIOD', 5);
    
    return recentEmailsCount >= maxEmailsPerPeriod;
  }

  async getRemainingQuota(recipient: string, periodMinutes: number = 15): Promise<number> {
    const periodStart = new Date();
    periodStart.setMinutes(periodStart.getMinutes() - periodMinutes);

    const recentEmailsCount = await this.emailQueueRepository
      .createQueryBuilder('email')
      .where('email.recipientEmail = :recipient', { recipient })
      .andWhere('email.createdAt >= :periodStart', { periodStart })
      .getCount();

    const maxEmailsPerPeriod = this.configService.get<number>('EMAIL_RATE_LIMIT_PER_PERIOD', 5);
    
    return Math.max(0, maxEmailsPerPeriod - recentEmailsCount);
  }

  async getRateLimitInfo(recipient: string, periodMinutes: number = 15): Promise<{
    isLimited: boolean;
    remaining: number;
    resetTime: Date;
  }> {
    const periodStart = new Date();
    periodStart.setMinutes(periodStart.getMinutes() - periodMinutes);

    const resetTime = new Date();
    resetTime.setMinutes(resetTime.getMinutes() + periodMinutes);

    const recentEmailsCount = await this.emailQueueRepository
      .createQueryBuilder('email')
      .where('email.recipientEmail = :recipient', { recipient })
      .andWhere('email.createdAt >= :periodStart', { periodStart })
      .getCount();

    const maxEmailsPerPeriod = this.configService.get<number>('EMAIL_RATE_LIMIT_PER_PERIOD', 5);
    
    return {
      isLimited: recentEmailsCount >= maxEmailsPerPeriod,
      remaining: Math.max(0, maxEmailsPerPeriod - recentEmailsCount),
      resetTime,
    };
  }

  async applyRateLimit(recipient: string): Promise<boolean> {
    // Check if user is rate limited
    const isLimited = await this.isRateLimited(recipient);
    
    if (isLimited) {
      return false; // Rate limited
    }

    return true; // OK to send
  }
}