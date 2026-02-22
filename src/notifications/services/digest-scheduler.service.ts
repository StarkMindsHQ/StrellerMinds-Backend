import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  DigestFrequency,
  NotificationPreference,
} from '../entities/notification-preference.entity';

@Injectable()
export class DigestSchedulerService {
  private readonly logger = new Logger(DigestSchedulerService.name);

  constructor(
    @InjectRepository(NotificationPreference)
    private preferenceRepo: Repository<NotificationPreference>,

    @InjectQueue('notifications')
    private notificationQueue: Queue,
  ) {}

  // Run every hour to send hourly digests
  @Cron(CronExpression.EVERY_HOUR)
  async sendHourlyDigests() {
    await this.scheduleDigests(DigestFrequency.HOURLY);
  }

  // Run every day at configured time (default 8 AM UTC)
  @Cron('0 8 * * *')
  async sendDailyDigests() {
    await this.scheduleDigests(DigestFrequency.DAILY);
  }

  // Run every Monday at 9 AM UTC
  @Cron('0 9 * * 1')
  async sendWeeklyDigests() {
    await this.scheduleDigests(DigestFrequency.WEEKLY);
  }

  private async scheduleDigests(frequency: DigestFrequency): Promise<void> {
    const users = await this.preferenceRepo.find({
      where: {
        digestFrequency: frequency,
        emailEnabled: true,
      },
      select: ['userId', 'digestTime', 'digestTimezone'],
    });

    this.logger.log(`Scheduling ${frequency} digest for ${users.length} users`);

    const jobs = users.map((u) => ({
      name: 'digest',
      data: { userId: u.userId },
      opts: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 2,
      },
    }));

    // Add in batches of 100 to avoid overwhelming the queue
    const batchSize = 100;
    for (let i = 0; i < jobs.length; i += batchSize) {
      await this.notificationQueue.addBulk(jobs.slice(i, i + batchSize));
    }
  }
}
